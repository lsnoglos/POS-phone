import { s as capsFor } from "./money-CSNXw54d.mjs";
import { i as getSql, r as getPglite, t as dbSource } from "./db-DBtAvfxx.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/access-LdqGtfjy.js
function makeSql(run) {
	const sql = (async (strings, ...values) => {
		let text = strings[0] ?? "";
		for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1] ?? ""}`;
		return run(text, values);
	});
	sql.query = ((text, params = []) => run(text, params));
	return sql;
}
var neonPool = null;
async function pool() {
	if (neonPool) return neonPool;
	const { Pool, types } = await import("../_libs/pg.mjs").then((n) => n.n);
	types.setTypeParser(20, (v) => Number(v));
	types.setTypeParser(1082, (v) => v);
	types.setTypeParser(1186, (v) => v);
	const connectionString = process.env.DATABASE_URL?.trim();
	if (!connectionString) throw new Error("DATABASE_URL no está configurada");
	neonPool = new Pool({ connectionString });
	return neonPool;
}
/** Run `fn` in a single database transaction (PGLite preview or Neon). */
async function withTx(fn) {
	if (dbSource === "pglite") return (await getPglite()).transaction(async (tx) => {
		return fn(makeSql(async (text, params) => {
			return (await tx.query(text, params)).rows;
		}));
	});
	const client = await (await pool()).connect();
	try {
		await client.query("begin");
		const value = await fn(makeSql(async (text, params) => {
			return (await client.query(text, params)).rows;
		}));
		await client.query("commit");
		return value;
	} catch (error) {
		await client.query("rollback");
		throw error;
	} finally {
		client.release();
	}
}
function num(v) {
	if (typeof v === "number") return Number.isFinite(v) ? v : 0;
	if (typeof v === "bigint") return Number(v);
	if (typeof v === "string" && v.trim() !== "") {
		const n = Number(v);
		return Number.isFinite(n) ? n : 0;
	}
	return 0;
}
function asTextArray(v) {
	if (v == null) return null;
	if (Array.isArray(v)) return v.map(String);
	if (typeof v === "string") {
		const inner = v.replace(/^\{/, "").replace(/\}$/, "");
		if (!inner) return [];
		return inner.split(",").map((part) => part.replace(/^"|"$/g, ""));
	}
	return null;
}
async function db() {
	return getSql();
}
async function member(sql, userId, businessId) {
	const row = (await sql`
    select role, caps, display_name, user_id from memberships
    where business_id = ${businessId} and user_id = ${userId}`)[0];
	if (!row) throw new Error("No autorizado para este negocio");
	return {
		role: row.role,
		caps: asTextArray(row.caps),
		displayName: row.display_name,
		userId: row.user_id
	};
}
function assertCap(who, cap) {
	if (!capsFor(who.role, who.caps).includes(cap)) throw new Error("No tiene permiso para esta operación");
}
async function audit(sql, businessId, userId, action, entity, entityId, detail) {
	await sql`
    insert into audit_log (id, business_id, user_id, action, entity, entity_id, detail)
    values (${crypto.randomUUID()}, ${businessId}, ${userId}, ${action}, ${entity}, ${entityId}, ${detail.slice(0, 500)})`;
}
async function bizClock(sql, businessId) {
	const row = (await sql`
    select timezone, tax_rate_bps, credit_days, allow_negative_stock, currency, invoice_prefix, name,
      to_char(now() at time zone timezone, 'YYYY-MM-DD') as day
    from businesses where id = ${businessId}`)[0];
	if (!row) throw new Error("Negocio no encontrado");
	return {
		timezone: row.timezone,
		taxRateBps: num(row.tax_rate_bps),
		creditDays: num(row.credit_days),
		allowNegative: Boolean(row.allow_negative_stock),
		currency: row.currency,
		invoicePrefix: row.invoice_prefix,
		day: String(row.day).slice(0, 10),
		name: row.name
	};
}
async function postJournal(sql, args) {
	const lines = args.lines.map((line) => ({
		key: line.key,
		accountId: line.accountId,
		debit: line.debitCents ?? 0,
		credit: line.creditCents ?? 0
	})).filter((line) => line.debit > 0 || line.credit > 0);
	if (!lines.length) return null;
	let debit = 0;
	let credit = 0;
	for (const line of lines) {
		if (!Number.isInteger(line.debit) || !Number.isInteger(line.credit) || line.debit < 0 || line.credit < 0) throw new Error("Línea contable inválida");
		if (line.debit > 0 && line.credit > 0) throw new Error("Una línea no puede tener débito y crédito");
		debit += line.debit;
		credit += line.credit;
	}
	if (debit !== credit) throw new Error("El asiento no cuadra. No se registró.");
	const clock = await bizClock(sql, args.businessId);
	const [year, month] = clock.day.split("-").map((part) => Number(part));
	if ((await sql`
    select 1 as x from period_locks
    where business_id = ${args.businessId} and year = ${year} and month = ${month}`).length) throw new Error("Ese período contable está cerrado");
	const entryId = crypto.randomUUID();
	await sql`
    insert into journal_entries (id, business_id, entry_date, memo, source, source_id, created_by)
    values (${entryId}, ${args.businessId}, ${clock.day}, ${args.memo}, ${args.source}, ${args.sourceId}, ${args.userId})`;
	for (const line of lines) {
		let accountId = line.accountId ?? "";
		if (!accountId && line.key) {
			const found = await sql`
        select id from ledger_accounts where business_id = ${args.businessId} and system_key = ${line.key}`;
			if (!found[0]) throw new Error(`Falta la cuenta ${line.key}`);
			accountId = found[0].id;
		}
		if (!accountId) throw new Error("Cuenta contable no indicada");
		await sql`
      insert into journal_lines (id, entry_id, account_id, debit_cents, credit_cents)
      values (${crypto.randomUUID()}, ${entryId}, ${accountId}, ${line.debit}, ${line.credit})`;
	}
	return entryId;
}
async function openDrawer(sql, businessId, branchId, userId) {
	return (await sql`
    select id from cash_sessions
    where business_id = ${businessId} and branch_id = ${branchId} and user_id = ${userId} and status = 'open'
    limit 1`)[0]?.id ?? null;
}
async function needDrawer(sql, businessId, branchId, userId) {
	const id = await openDrawer(sql, businessId, branchId, userId);
	if (!id) throw new Error("Abra la caja antes de mover efectivo");
	return id;
}
async function drawerMove(sql, sessionId, businessId, kind, amount, note, refId) {
	if (!sessionId || amount <= 0) return;
	await sql`
    insert into cash_movements (id, session_id, business_id, kind, amount_cents, note, ref_id)
    values (${crypto.randomUUID()}, ${sessionId}, ${businessId}, ${kind}, ${amount}, ${note}, ${refId})`;
}
var IN_KINDS = /* @__PURE__ */ new Set([
	"sale",
	"abono",
	"in",
	"loan_in"
]);
async function drawerExpected(sql, sessionId, opening) {
	const rows = await sql`
    select kind, amount_cents from cash_movements where session_id = ${sessionId}`;
	let value = opening;
	for (const row of rows) {
		const amount = num(row.amount_cents);
		value += IN_KINDS.has(row.kind) ? amount : -amount;
	}
	return value;
}
async function stockOf(sql, productId, branchId) {
	const rows = await sql`
    select qty from stocks where product_id = ${productId} and branch_id = ${branchId} for update`;
	return rows[0] ? num(rows[0].qty) : null;
}
async function setStock(sql, productId, branchId, qty) {
	await sql`
    insert into stocks (product_id, branch_id, qty) values (${productId}, ${branchId}, ${qty})
    on conflict (product_id, branch_id) do update set qty = ${qty}`;
}
async function movement(sql, businessId, productId, branchId, qty, reason, refType, refId, note, userId) {
	if (qty === 0) return;
	await sql`
    insert into inventory_movements (id, business_id, product_id, branch_id, qty, reason, ref_type, ref_id, note, created_by)
    values (${crypto.randomUUID()}, ${businessId}, ${productId}, ${branchId}, ${qty}, ${reason}, ${refType}, ${refId}, ${note}, ${userId})`;
}
var SYSTEM_ACCOUNTS = [
	{
		code: "1101",
		name: "Caja",
		type: "asset",
		key: "caja"
	},
	{
		code: "1102",
		name: "Bancos",
		type: "asset",
		key: "bancos"
	},
	{
		code: "1103",
		name: "Fondos en tránsito",
		type: "asset",
		key: "transito"
	},
	{
		code: "1201",
		name: "Cuentas por cobrar",
		type: "asset",
		key: "cxc"
	},
	{
		code: "1301",
		name: "Inventario",
		type: "asset",
		key: "inventario"
	},
	{
		code: "1401",
		name: "Préstamos otorgados",
		type: "asset",
		key: "prestamos_otorgados"
	},
	{
		code: "2101",
		name: "Cuentas por pagar",
		type: "liability",
		key: "cxp"
	},
	{
		code: "2102",
		name: "Impuestos por pagar",
		type: "liability",
		key: "impuestos"
	},
	{
		code: "2201",
		name: "Préstamos por pagar",
		type: "liability",
		key: "prestamos"
	},
	{
		code: "3101",
		name: "Capital",
		type: "equity",
		key: "capital"
	},
	{
		code: "3102",
		name: "Retiros del propietario",
		type: "equity",
		key: "retiros"
	},
	{
		code: "4101",
		name: "Ventas",
		type: "income",
		key: "ventas"
	},
	{
		code: "4102",
		name: "Descuentos sobre ventas",
		type: "income",
		key: "descuentos"
	},
	{
		code: "4201",
		name: "Otros ingresos",
		type: "income",
		key: "otros_ingresos"
	},
	{
		code: "4202",
		name: "Ingresos por intereses",
		type: "income",
		key: "intereses_ingreso"
	},
	{
		code: "5101",
		name: "Costo de ventas",
		type: "cost",
		key: "cogs"
	},
	{
		code: "6101",
		name: "Gastos operativos",
		type: "expense",
		key: "gastos"
	},
	{
		code: "6102",
		name: "Salarios",
		type: "expense",
		key: "salarios"
	},
	{
		code: "6103",
		name: "Servicios públicos",
		type: "expense",
		key: "servicios"
	},
	{
		code: "6104",
		name: "Merma y pérdidas",
		type: "expense",
		key: "merma"
	},
	{
		code: "6105",
		name: "Intereses",
		type: "expense",
		key: "intereses"
	}
];
async function seedAccounts(sql, businessId) {
	for (const account of SYSTEM_ACCOUNTS) await sql`
      insert into ledger_accounts (id, business_id, code, name, type, system_key)
      values (${crypto.randomUUID()}, ${businessId}, ${account.code}, ${account.name}, ${account.type}, ${account.key})
      on conflict (business_id, code) do nothing`;
}
function cleanPhoto(value, label) {
	if (!value) return null;
	if (value.length > 28e4) throw new Error(`${label} es demasiado pesada. Use una foto más pequeña.`);
	if (!value.startsWith("data:image/")) throw new Error(`${label} debe ser una imagen`);
	return value;
}
var ROLES = [
	"admin",
	"cashier",
	"inventory",
	"accountant",
	"supervisor"
];
//#endregion
export { setStock as _, bizClock as a, drawerExpected as c, movement as d, needDrawer as f, seedAccounts as g, postJournal as h, audit as i, drawerMove as l, openDrawer as m, asTextArray as n, cleanPhoto as o, num as p, assertCap as r, db as s, ROLES as t, member as u, stockOf as v, withTx as y };

import { _ as setStock, a as bizClock, d as movement, g as seedAccounts, h as postJournal, i as audit, n as asTextArray, o as cleanPhoto, p as num, r as assertCap, s as db, t as ROLES, u as member, v as stockOf, y as withTx } from "./access-LdqGtfjy.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/store-CJJJ_rxv.js
var TYPES = /* @__PURE__ */ new Set([
	"pulperia",
	"farmacia",
	"ferreteria",
	"ropa",
	"minimercado",
	"libreria",
	"repuestos",
	"distribuidora",
	"otro"
]);
function volumes(value) {
	const raw = typeof value === "string" ? JSON.parse(value) : value;
	if (!Array.isArray(raw)) return [];
	const out = [];
	for (const item of raw) {
		if (!item || typeof item !== "object") continue;
		const row = item;
		const minQty = num(row.minQty);
		const priceCents = num(row.priceCents);
		if (minQty >= 2 && priceCents >= 0) out.push({
			minQty,
			priceCents
		});
	}
	return out.slice(0, 8);
}
async function branchesOf(sql, businessId) {
	return (await sql`
    select id, name, is_default from branches where business_id = ${businessId} order by is_default desc, name`).map((row) => ({
		id: row.id,
		name: row.name,
		isDefault: Boolean(row.is_default)
	}));
}
function mapBusiness(row, branches) {
	return {
		id: row.id,
		name: row.name,
		address: row.address,
		phone: row.phone,
		taxId: row.tax_id,
		logo: row.logo,
		currency: row.currency,
		country: row.country,
		timezone: row.timezone,
		businessType: row.business_type,
		invoicePrefix: row.invoice_prefix,
		taxRateBps: num(row.tax_rate_bps),
		creditDays: num(row.credit_days),
		allowNegativeStock: Boolean(row.allow_negative_stock),
		isDemo: Boolean(row.is_demo),
		role: row.role,
		caps: asTextArray(row.caps),
		branches
	};
}
async function listBusinesses(userId) {
	const sql = await db();
	const rows = await sql`
    select b.*, m.role, m.caps
    from memberships m
    join businesses b on b.id = m.business_id
    where m.user_id = ${userId}
    order by b.created_at`;
	const out = [];
	for (const row of rows) out.push(mapBusiness(row, await branchesOf(sql, row.id)));
	return out;
}
async function createBusiness(userId, input) {
	const name = input.name.trim();
	if (name.length < 2) throw new Error("Escriba el nombre del negocio");
	if (!TYPES.has(input.businessType)) throw new Error("Tipo de negocio no válido");
	const currency = input.currency === "USD" ? "USD" : "NIO";
	return withTx(async (sql) => {
		const id = crypto.randomUUID();
		const branchId = crypto.randomUUID();
		await sql`
      insert into businesses (
        id, owner_user_id, name, address, phone, tax_id, logo, currency, timezone, business_type, is_demo
      ) values (
        ${id}, ${userId}, ${name}, ${input.address.trim()}, ${input.phone.trim()}, ${input.taxId.trim()},
        ${cleanPhoto(input.logo, "El logotipo")}, ${currency}, ${input.timezone || "America/Managua"},
        ${input.businessType}, ${Boolean(input.isDemo)}
      )`;
		await sql`
      insert into memberships (id, business_id, user_id, role, display_name)
      values (${crypto.randomUUID()}, ${id}, ${userId}, 'owner', ${input.displayName.trim() || "Propietario"})`;
		await sql`
      insert into branches (id, business_id, name, is_default) values (${branchId}, ${id}, 'Principal', true)`;
		await seedAccounts(sql, id);
		await audit(sql, id, userId, "crear", "negocio", id, name);
		return id;
	});
}
async function updateBusiness(userId, input) {
	if (!TYPES.has(input.businessType)) throw new Error("Tipo de negocio no válido");
	if (input.taxRateBps < 0 || input.taxRateBps > 3e3) throw new Error("La tasa de impuesto debe estar entre 0% y 30%");
	const prefix = input.invoicePrefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "FAC";
	return withTx(async (sql) => {
		const who = await member(sql, userId, input.businessId);
		assertCap(who, "settings");
		await sql`
      update businesses set
        name = ${input.name.trim()},
        address = ${input.address.trim()},
        phone = ${input.phone.trim()},
        tax_id = ${input.taxId.trim()},
        logo = ${cleanPhoto(input.logo, "El logotipo")},
        currency = ${input.currency === "USD" ? "USD" : "NIO"},
        timezone = ${input.timezone || "America/Managua"},
        business_type = ${input.businessType},
        invoice_prefix = ${prefix},
        tax_rate_bps = ${input.taxRateBps},
        credit_days = ${Math.min(180, Math.max(0, input.creditDays))},
        allow_negative_stock = ${input.allowNegativeStock}
      where id = ${input.businessId}`;
		await audit(sql, input.businessId, userId, "actualizar", "negocio", input.businessId, "Configuración");
		return true;
	});
}
async function deleteBusiness(userId, businessId, confirmName) {
	return withTx(async (sql) => {
		const row = (await sql`
      select name, owner_user_id from businesses where id = ${businessId}`)[0];
		if (!row) throw new Error("Negocio no encontrado");
		if (row.owner_user_id !== userId) throw new Error("Solo el propietario puede eliminar el negocio");
		if (row.name.trim() !== confirmName.trim()) throw new Error("Escriba el nombre exacto para confirmar");
		await sql`delete from businesses where id = ${businessId}`;
		return true;
	});
}
async function listMembers(userId, businessId) {
	const sql = await db();
	await member(sql, userId, businessId);
	return (await sql`
    select id, user_id, role, display_name, caps from memberships where business_id = ${businessId} order by created_at`).map((row) => ({
		id: row.id,
		userId: row.user_id,
		role: row.role,
		displayName: row.display_name,
		caps: asTextArray(row.caps)
	}));
}
async function createInvite(userId, businessId, role) {
	if (!ROLES.includes(role)) throw new Error("Rol no válido");
	return withTx(async (sql) => {
		const who = await member(sql, userId, businessId);
		assertCap(who, "team");
		const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
		let code = "";
		for (let i = 0; i < 6; i += 1) code += alphabet[Math.floor(Math.random() * 32)];
		await sql`
      insert into invites (code, business_id, role, created_by, expires_at)
      values (${code}, ${businessId}, ${role}, ${userId}, now() + interval '7 days')`;
		await audit(sql, businessId, userId, "invitar", "equipo", code, role);
		return code;
	});
}
async function acceptInvite(userId, code, displayName) {
	const clean = code.trim().toUpperCase();
	return withTx(async (sql) => {
		const invite = (await sql`
      select business_id, role, used_by, expires_at from invites where code = ${clean} for update`)[0];
		if (!invite) throw new Error("Código inválido");
		if (invite.used_by) throw new Error("Ese código ya fue usado");
		if (new Date(invite.expires_at).getTime() < Date.now()) throw new Error("El código venció");
		if ((await sql`select id from memberships where business_id = ${invite.business_id} and user_id = ${userId}`).length) throw new Error("Usted ya pertenece a ese negocio");
		await sql`
      insert into memberships (id, business_id, user_id, role, display_name)
      values (${crypto.randomUUID()}, ${invite.business_id}, ${userId}, ${invite.role}, ${displayName.trim() || "Empleado"})`;
		await sql`update invites set used_by = ${userId}, used_at = now() where code = ${clean}`;
		await audit(sql, invite.business_id, userId, "unirse", "equipo", userId, invite.role);
		return invite.business_id;
	});
}
async function updateMemberCaps(userId, businessId, memberId, caps) {
	return withTx(async (sql) => {
		const who = await member(sql, userId, businessId);
		assertCap(who, "team");
		const rows = await sql`
      select role from memberships where id = ${memberId} and business_id = ${businessId}`;
		if (!rows[0]) throw new Error("Empleado no encontrado");
		if (rows[0].role === "owner") throw new Error("Los permisos del propietario no se editan");
		await sql.query(`update memberships set caps = $1::text[] where id = $2 and business_id = $3`, [
			caps,
			memberId,
			businessId
		]);
		await audit(sql, businessId, userId, "permisos", "equipo", memberId, caps.join(","));
		return true;
	});
}
async function createBranch(userId, businessId, name) {
	const label = name.trim();
	if (label.length < 2) throw new Error("Escriba el nombre de la sucursal");
	return withTx(async (sql) => {
		const who = await member(sql, userId, businessId);
		assertCap(who, "settings");
		const id = crypto.randomUUID();
		await sql`insert into branches (id, business_id, name, is_default) values (${id}, ${businessId}, ${label}, false)`;
		const products = await sql`select id from products where business_id = ${businessId}`;
		for (const product of products) await sql`
        insert into stocks (product_id, branch_id, qty) values (${product.id}, ${id}, 0)
        on conflict do nothing`;
		await audit(sql, businessId, userId, "crear", "sucursal", id, label);
		return id;
	});
}
async function transferStock(userId, input) {
	if (input.fromBranchId === input.toBranchId) throw new Error("Elija sucursales distintas");
	if (!Number.isInteger(input.qty) || input.qty <= 0) throw new Error("Cantidad inválida");
	return withTx(async (sql) => {
		const who = await member(sql, userId, input.businessId);
		assertCap(who, "stock");
		const from = await stockOf(sql, input.productId, input.fromBranchId);
		if (from == null) throw new Error("El producto no está en la sucursal de origen");
		if (from < input.qty) throw new Error(`Existencia insuficiente (${from})`);
		await stockOf(sql, input.productId, input.toBranchId);
		await setStock(sql, input.productId, input.fromBranchId, from - input.qty);
		const destRows = await sql`
      select qty from stocks where product_id = ${input.productId} and branch_id = ${input.toBranchId}`;
		const dest = destRows[0] ? num(destRows[0].qty) : 0;
		await setStock(sql, input.productId, input.toBranchId, dest + input.qty);
		const ref = crypto.randomUUID();
		await movement(sql, input.businessId, input.productId, input.fromBranchId, -input.qty, "Traslado", "transfer", ref, input.note, userId);
		await movement(sql, input.businessId, input.productId, input.toBranchId, input.qty, "Traslado", "transfer", ref, input.note, userId);
		await audit(sql, input.businessId, userId, "trasladar", "inventario", input.productId, `${input.qty}`);
		return true;
	});
}
function mapProduct(row, stock) {
	return {
		id: String(row.id),
		name: String(row.name),
		description: String(row.description ?? ""),
		photo: row.photo ?? null,
		categoryId: row.category_id ?? null,
		categoryName: String(row.category_name ?? ""),
		subcategory: String(row.subcategory ?? ""),
		brand: String(row.brand ?? ""),
		sku: String(row.sku ?? ""),
		barcode: String(row.barcode ?? ""),
		costCents: num(row.cost_cents),
		priceCents: num(row.price_cents),
		wholesaleCents: num(row.wholesale_cents),
		promoCents: row.promo_cents == null ? null : num(row.promo_cents),
		promoUntil: row.promo_until ? String(row.promo_until).slice(0, 10) : null,
		volumePrices: volumes(row.volume_prices),
		taxExempt: Boolean(row.tax_exempt),
		regulated: Boolean(row.regulated),
		minQty: num(row.min_qty),
		unit: String(row.unit ?? "unidad"),
		supplierId: row.supplier_id ?? null,
		expiresOn: row.expires_on ? String(row.expires_on).slice(0, 10) : null,
		lotCode: String(row.lot_code ?? ""),
		location: String(row.location ?? ""),
		active: Boolean(row.active),
		favorite: Boolean(row.favorite),
		parentId: row.parent_id ?? null,
		variantLabel: String(row.variant_label ?? ""),
		isDemo: Boolean(row.is_demo),
		stock
	};
}
async function listProducts(userId, businessId, branchId, query) {
	const sql = await db();
	await member(sql, userId, businessId);
	const q = query.trim().replace(/[%_]/g, "");
	return (await sql`
    select p.*, coalesce(c.name, '') as category_name, coalesce(s.qty, 0) as stock_qty
    from products p
    left join categories c on c.id = p.category_id
    left join stocks s on s.product_id = p.id and s.branch_id = ${branchId}
    where p.business_id = ${businessId}
      and (${q} = '' or p.name ilike ${"%" + q + "%"} or p.barcode = ${q} or p.sku ilike ${"%" + q + "%"} or p.id::text = ${q})
    order by p.favorite desc, p.active desc, p.name
    limit 400`).map((row) => mapProduct(row, num(row.stock_qty)));
}
async function categoryId(sql, businessId, name) {
	const label = name.trim();
	if (!label) return null;
	const found = await sql`
    select id from categories where business_id = ${businessId} and lower(name) = lower(${label})`;
	if (found[0]) return found[0].id;
	const id = crypto.randomUUID();
	await sql`insert into categories (id, business_id, name) values (${id}, ${businessId}, ${label})`;
	return id;
}
async function saveProduct(userId, input) {
	const name = input.name.trim();
	if (name.length < 2) throw new Error("Escriba el nombre del producto");
	if (input.priceCents < 0 || input.costCents < 0) throw new Error("Precio inválido");
	const volume = JSON.stringify(input.volumePrices.filter((row) => row.minQty >= 2 && row.priceCents >= 0).slice(0, 8));
	return withTx(async (sql) => {
		const who = await member(sql, userId, input.businessId);
		assertCap(who, "products");
		const cat = await categoryId(sql, input.businessId, input.category);
		const photo = cleanPhoto(input.photo, "La foto");
		if (input.id) {
			if (!(await sql`select id from products where id = ${input.id} and business_id = ${input.businessId}`)[0]) throw new Error("Producto no encontrado");
			await sql`
        update products set
          name = ${name}, description = ${input.description.trim()}, photo = ${photo}, category_id = ${cat},
          subcategory = ${input.subcategory.trim()}, brand = ${input.brand.trim()}, sku = ${input.sku.trim()},
          barcode = ${input.barcode.trim()}, cost_cents = ${input.costCents}, price_cents = ${input.priceCents},
          wholesale_cents = ${input.wholesaleCents}, promo_cents = ${input.promoCents},
          promo_until = ${input.promoUntil || null}, volume_prices = ${volume}::jsonb,
          tax_exempt = ${input.taxExempt}, regulated = ${input.regulated}, min_qty = ${input.minQty},
          unit = ${input.unit || "unidad"}, supplier_id = ${input.supplierId}, expires_on = ${input.expiresOn || null},
          lot_code = ${input.lotCode.trim()}, location = ${input.location.trim()}, active = ${input.active},
          favorite = ${input.favorite}, parent_id = ${input.parentId}, variant_label = ${input.variantLabel.trim()},
          updated_at = now()
        where id = ${input.id}`;
			await audit(sql, input.businessId, userId, "editar", "producto", input.id, name);
			return input.id;
		}
		const id = crypto.randomUUID();
		await sql`
      insert into products (
        id, business_id, name, description, photo, category_id, subcategory, brand, sku, barcode,
        cost_cents, price_cents, wholesale_cents, promo_cents, promo_until, volume_prices, tax_exempt,
        regulated, min_qty, unit, supplier_id, expires_on, lot_code, location, active, favorite, parent_id, variant_label
      ) values (
        ${id}, ${input.businessId}, ${name}, ${input.description.trim()}, ${photo}, ${cat}, ${input.subcategory.trim()},
        ${input.brand.trim()}, ${input.sku.trim()}, ${input.barcode.trim()}, ${input.costCents}, ${input.priceCents},
        ${input.wholesaleCents}, ${input.promoCents}, ${input.promoUntil || null}, ${volume}::jsonb, ${input.taxExempt},
        ${input.regulated}, ${input.minQty}, ${input.unit || "unidad"}, ${input.supplierId}, ${input.expiresOn || null},
        ${input.lotCode.trim()}, ${input.location.trim()}, ${input.active}, ${input.favorite}, ${input.parentId},
        ${input.variantLabel.trim()}
      )`;
		const branchRows = await sql`select id from branches where business_id = ${input.businessId}`;
		for (const branch of branchRows) {
			const qty = branch.id === input.branchId ? Math.max(0, input.initialQty) : 0;
			await sql`insert into stocks (product_id, branch_id, qty) values (${id}, ${branch.id}, ${qty})`;
		}
		if (input.initialQty > 0) {
			await movement(sql, input.businessId, id, input.branchId, input.initialQty, "Inventario inicial", "product", id, "", userId);
			const value = input.initialQty * input.costCents;
			await postJournal(sql, {
				businessId: input.businessId,
				userId,
				memo: `Inventario inicial · ${name}`,
				source: "opening",
				sourceId: id,
				lines: [{
					key: "inventario",
					debitCents: value
				}, {
					key: "capital",
					creditCents: value
				}]
			});
		}
		await audit(sql, input.businessId, userId, "crear", "producto", id, name);
		return id;
	});
}
async function adjustStock(userId, input) {
	if (!Number.isInteger(input.qtyDelta) || input.qtyDelta === 0) throw new Error("Indique la cantidad del ajuste");
	if (input.reason.trim().length < 3) throw new Error("Escriba el motivo del ajuste");
	return withTx(async (sql) => {
		const who = await member(sql, userId, input.businessId);
		assertCap(who, "stock");
		const clock = await bizClock(sql, input.businessId);
		const current = await stockOf(sql, input.productId, input.branchId);
		if (current == null) throw new Error("Producto no encontrado en esta sucursal");
		const next = current + input.qtyDelta;
		if (next < 0 && !clock.allowNegative) throw new Error("Esa salida dejaría la existencia en negativo");
		const products = await sql`
      select name, cost_cents from products where id = ${input.productId} and business_id = ${input.businessId}`;
		if (!products[0]) throw new Error("Producto no encontrado");
		await setStock(sql, input.productId, input.branchId, next);
		await movement(sql, input.businessId, input.productId, input.branchId, input.qtyDelta, input.reason.trim(), "adjust", input.productId, input.note.trim(), userId);
		const amount = Math.abs(input.qtyDelta) * num(products[0].cost_cents);
		const opening = input.reason.trim().toLowerCase().includes("inicial");
		await postJournal(sql, {
			businessId: input.businessId,
			userId,
			memo: `${input.reason.trim()} · ${products[0].name}`,
			source: "adjust",
			sourceId: input.productId,
			lines: input.qtyDelta > 0 ? [{
				key: "inventario",
				debitCents: amount
			}, {
				key: opening ? "capital" : "otros_ingresos",
				creditCents: amount
			}] : [{
				key: "merma",
				debitCents: amount
			}, {
				key: "inventario",
				creditCents: amount
			}]
		});
		await audit(sql, input.businessId, userId, "ajustar", "inventario", input.productId, `${input.qtyDelta} ${input.reason}`);
		return next;
	});
}
async function listMovements(userId, businessId) {
	const sql = await db();
	await member(sql, userId, businessId);
	return (await sql`
    select m.id, m.product_id, p.name, m.qty, m.reason, m.note, m.created_at, coalesce(b.name, '') as branch_name
    from inventory_movements m
    join products p on p.id = m.product_id
    left join branches b on b.id = m.branch_id
    where m.business_id = ${businessId}
    order by m.created_at desc
    limit 200`).map((row) => ({
		id: row.id,
		productId: row.product_id,
		name: row.name,
		qty: num(row.qty),
		reason: row.reason,
		note: row.note,
		createdAt: row.created_at,
		branchName: row.branch_name
	}));
}
async function bulkPrice(userId, input) {
	if (!Number.isInteger(input.percentBps) || input.percentBps < -8e3 || input.percentBps > 3e4) throw new Error("El porcentaje de ajuste no es válido");
	const column = input.field === "wholesale" ? "wholesale_cents" : input.field === "cost" ? "cost_cents" : "price_cents";
	return withTx(async (sql) => {
		const who = await member(sql, userId, input.businessId);
		assertCap(who, "products");
		const rows = await sql.query(`select id, ${column} as amount from products where business_id = $1 and ($2::text is null or category_id = $2)`, [input.businessId, input.categoryId]);
		for (const row of rows) {
			const next = Math.max(0, Math.round(num(row.amount) * (1e4 + input.percentBps) / 1e4));
			await sql.query(`update products set ${column} = $1, updated_at = now() where id = $2`, [next, row.id]);
		}
		await audit(sql, input.businessId, userId, "precios", "producto", input.businessId, `${input.field} ${input.percentBps}`);
		return rows.length;
	});
}
async function importProducts(userId, input) {
	if (!input.rows.length) throw new Error("El archivo no tiene filas");
	if (input.rows.length > 400) throw new Error("Importe hasta 400 productos por vez");
	let count = 0;
	for (const row of input.rows) {
		if (!row.name?.trim()) continue;
		await saveProduct(userId, {
			businessId: input.businessId,
			branchId: input.branchId,
			name: row.name,
			description: "",
			photo: null,
			category: row.category || "",
			subcategory: "",
			brand: "",
			sku: row.sku || "",
			barcode: row.barcode || "",
			costCents: Math.max(0, row.costCents || 0),
			priceCents: Math.max(0, row.priceCents || 0),
			wholesaleCents: 0,
			promoCents: null,
			promoUntil: null,
			volumePrices: [],
			taxExempt: false,
			regulated: false,
			minQty: Math.max(0, row.minQty || 0),
			unit: row.unit || "unidad",
			supplierId: null,
			expiresOn: null,
			lotCode: "",
			location: "",
			active: true,
			favorite: false,
			parentId: null,
			variantLabel: "",
			initialQty: Math.max(0, row.qty || 0)
		});
		count += 1;
	}
	return count;
}
async function postCount(userId, input) {
	let changed = 0;
	for (const line of input.lines) {
		if (!Number.isInteger(line.counted) || line.counted < 0) throw new Error("El conteo tiene una cantidad inválida");
		const sql = await db();
		await member(sql, userId, input.businessId);
		const current = num((await sql`
          select qty from stocks where product_id = ${line.productId} and branch_id = ${input.branchId}`)[0]?.qty);
		const delta = line.counted - current;
		if (delta === 0) continue;
		await adjustStock(userId, {
			businessId: input.businessId,
			branchId: input.branchId,
			productId: line.productId,
			qtyDelta: delta,
			reason: "Conteo físico",
			note: `Sistema ${current}, contado ${line.counted}`
		});
		changed += 1;
	}
	return changed;
}
async function listCategories(userId, businessId) {
	const sql = await db();
	await member(sql, userId, businessId);
	return await sql`
    select id, name from categories where business_id = ${businessId} order by name`;
}
async function resolveCode(userId, businessId, branchId, raw) {
	const products = await listProducts(userId, businessId, branchId, "");
	const text = raw.trim();
	const idMatch = /^nexo:p:(.+)$/.exec(text);
	const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
	if (idMatch) {
		const found = products.find((product) => product.id === idMatch[1]);
		if (!found) throw new Error("Ese QR no corresponde a un producto de este negocio");
		return found;
	}
	const matches = products.filter((product) => product.active && (product.barcode === text || product.sku.toLowerCase() === text.toLowerCase() || product.id === text));
	if (!matches.length) throw new Error("No hay un producto con ese código");
	const sellable = matches.filter((product) => !product.expiresOn || product.expiresOn >= today).filter((product) => product.stock > 0);
	const pool = sellable.length ? sellable : matches.filter((product) => !product.expiresOn || product.expiresOn >= today);
	return (pool.length ? pool : matches).sort((a, b) => {
		if (a.expiresOn && b.expiresOn) return a.expiresOn < b.expiresOn ? -1 : 1;
		if (a.expiresOn) return -1;
		return 0;
	})[0];
}
//#endregion
export { acceptInvite, adjustStock, bulkPrice, createBranch, createBusiness, createInvite, deleteBusiness, importProducts, listBusinesses, listCategories, listMembers, listMovements, listProducts, postCount, resolveCode, saveProduct, transferStock, updateBusiness, updateMemberCaps };

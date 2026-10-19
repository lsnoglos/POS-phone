import { db, member, num, assertCap, audit } from "./access";
import { withTx } from "./tx";
import { postJournal } from "./access";
import { createBusiness, saveProduct } from "./store";
import { checkout, openCash, postAbono, saveCustomer, saveExpense, saveSupplier } from "./commerce";

type AccountRow = {
  id: string;
  code: string;
  name: string;
  type: string;
  systemKey: string | null;
  periodDebit: number;
  periodCredit: number;
  endDebit: number;
  endCredit: number;
};

async function accountRollup(userId: string, businessId: string, from: string, to: string): Promise<AccountRow[]> {
  const sql = await db();
  await member(sql, userId, businessId);
  const rows = await sql<Record<string, unknown>>`
    select a.id, a.code, a.name, a.type, a.system_key,
      coalesce(sum(case when e.entry_date >= ${from}::date and e.entry_date <= ${to}::date then l.debit_cents else 0 end), 0) as period_debit,
      coalesce(sum(case when e.entry_date >= ${from}::date and e.entry_date <= ${to}::date then l.credit_cents else 0 end), 0) as period_credit,
      coalesce(sum(case when e.entry_date <= ${to}::date then l.debit_cents else 0 end), 0) as end_debit,
      coalesce(sum(case when e.entry_date <= ${to}::date then l.credit_cents else 0 end), 0) as end_credit
    from ledger_accounts a
    left join journal_lines l on l.account_id = a.id
    left join journal_entries e on e.id = l.entry_id
    where a.business_id = ${businessId}
    group by a.id
    order by a.code`;
  return rows.map((row) => ({
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    type: String(row.type),
    systemKey: row.system_key ? String(row.system_key) : null,
    periodDebit: num(row.period_debit),
    periodCredit: num(row.period_credit),
    endDebit: num(row.end_debit),
    endCredit: num(row.end_credit),
  }));
}

function signed(row: AccountRow, which: "period" | "end") {
  const debit = which === "period" ? row.periodDebit : row.endDebit;
  const credit = which === "period" ? row.periodCredit : row.endCredit;
  if (row.type === "asset" || row.type === "cost" || row.type === "expense") return debit - credit;
  return credit - debit;
}

export async function financials(userId: string, businessId: string, from: string, to: string) {
  const accounts = await accountRollup(userId, businessId, from, to);
  const income = accounts.filter((row) => row.type === "income").reduce((s, row) => s + signed(row, "period"), 0);
  const cost = accounts.filter((row) => row.type === "cost").reduce((s, row) => s + signed(row, "period"), 0);
  const expense = accounts.filter((row) => row.type === "expense").reduce((s, row) => s + signed(row, "period"), 0);
  const assets = accounts.filter((row) => row.type === "asset").reduce((s, row) => s + signed(row, "end"), 0);
  const liabilities = accounts.filter((row) => row.type === "liability").reduce((s, row) => s + signed(row, "end"), 0);
  const equity = accounts.filter((row) => row.type === "equity").reduce((s, row) => s + signed(row, "end"), 0);
  const accumulated =
    accounts.filter((row) => row.type === "income").reduce((s, row) => s + signed(row, "end"), 0) -
    accounts.filter((row) => row.type === "cost" || row.type === "expense").reduce((s, row) => s + signed(row, "end"), 0);
  return {
    accounts: accounts.map((row) => ({
      ...row,
      ending: signed(row, "end"),
    })),
    income,
    cost,
    expense,
    gross: income - cost,
    net: income - cost - expense,
    assets,
    liabilities,
    equity,
    accumulated,
  };
}

export async function listJournal(userId: string, businessId: string) {
  const sql = await db();
  await member(sql, userId, businessId);
  const entries = await sql<Record<string, unknown>>`
    select id, entry_date, memo, source, source_id from journal_entries
    where business_id = ${businessId} order by entry_date desc, created_at desc limit 80`;
  const ids = entries.map((row) => String(row.id));
  if (!ids.length) return [];
  const lines = await sql.query<Record<string, unknown>>(
    `select l.entry_id, l.debit_cents, l.credit_cents, a.code, a.name
     from journal_lines l join ledger_accounts a on a.id = l.account_id
     where l.entry_id = any($1::text[])`,
    [ids],
  );
  return entries.map((entry) => ({
    id: String(entry.id),
    date: String(entry.entry_date).slice(0, 10),
    memo: String(entry.memo),
    source: String(entry.source),
    lines: lines
      .filter((line) => line.entry_id === entry.id)
      .map((line) => ({
        code: String(line.code),
        name: String(line.name),
        debitCents: num(line.debit_cents),
        creditCents: num(line.credit_cents),
      })),
  }));
}

export async function ledger(userId: string, businessId: string, accountId: string, from: string, to: string) {
  const sql = await db();
  await member(sql, userId, businessId);
  const accounts = await sql<{ name: string; type: string; code: string }>`
    select name, type, code from ledger_accounts where id = ${accountId} and business_id = ${businessId}`;
  if (!accounts[0]) throw new Error("Cuenta no encontrada");
  const rows = await sql<Record<string, unknown>>`
    select e.entry_date, e.memo, e.source, l.debit_cents, l.credit_cents
    from journal_lines l
    join journal_entries e on e.id = l.entry_id
    where l.account_id = ${accountId} and e.entry_date >= ${from}::date and e.entry_date <= ${to}::date
    order by e.entry_date, e.created_at`;
  const normalDebit = ["asset", "cost", "expense"].includes(accounts[0].type);
  let balance = 0;
  const lines = rows.map((row) => {
    const debit = num(row.debit_cents);
    const credit = num(row.credit_cents);
    balance += normalDebit ? debit - credit : credit - debit;
    return {
      date: String(row.entry_date).slice(0, 10),
      memo: String(row.memo),
      source: String(row.source),
      debitCents: debit,
      creditCents: credit,
      balanceCents: balance,
    };
  });
  return { account: accounts[0], lines };
}

export async function postManual(
  userId: string,
  input: { businessId: string; memo: string; lines: { accountId: string; debitCents: number; creditCents: number }[] },
) {
  if (input.memo.trim().length < 3) throw new Error("Escriba el concepto del asiento");
  return withTx(async (sql) => {
    const who = await member(sql, userId, input.businessId);
    assertCap(who, "accounting");
    const id = crypto.randomUUID();
    await postJournal(sql, {
      businessId: input.businessId,
      userId,
      memo: input.memo.trim(),
      source: "manual",
      sourceId: id,
      lines: input.lines.map((line) => ({
        accountId: line.accountId,
        debitCents: line.debitCents,
        creditCents: line.creditCents,
      })),
    });
    await audit(sql, input.businessId, userId, "asiento", "diario", id, input.memo.trim());
    return id;
  });
}

export async function listAccounts(userId: string, businessId: string) {
  const sql = await db();
  await member(sql, userId, businessId);
  const rows = await sql<Record<string, unknown>>`
    select id, code, name, type, system_key from ledger_accounts
    where business_id = ${businessId} and active order by code`;
  return rows.map((row) => ({
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    type: String(row.type),
    systemKey: row.system_key ? String(row.system_key) : null,
  }));
}

export async function saveAccount(
  userId: string,
  input: { businessId: string; code: string; name: string; type: string },
) {
  const code = input.code.trim();
  if (!/^\d{3,6}$/.test(code)) throw new Error("El código debe tener de 3 a 6 dígitos");
  const types = new Set(["asset", "liability", "equity", "income", "cost", "expense"]);
  if (!types.has(input.type)) throw new Error("Tipo de cuenta no válido");
  return withTx(async (sql) => {
    const who = await member(sql, userId, input.businessId);
    assertCap(who, "accounting");
    const id = crypto.randomUUID();
    await sql`
      insert into ledger_accounts (id, business_id, code, name, type)
      values (${id}, ${input.businessId}, ${code}, ${input.name.trim()}, ${input.type})`;
    return id;
  });
}

export async function lockPeriod(userId: string, businessId: string, year: number, month: number, unlock: boolean) {
  return withTx(async (sql) => {
    const who = await member(sql, userId, businessId);
    if (who.role !== "owner" && who.role !== "accountant") {
      throw new Error("Solo el propietario o el contador pueden cerrar un período");
    }
    if (unlock) {
      if (who.role !== "owner") throw new Error("Solo el propietario puede reabrir un período");
      await sql`delete from period_locks where business_id = ${businessId} and year = ${year} and month = ${month}`;
      await audit(sql, businessId, userId, "reabrir", "periodo", `${year}-${month}`, "");
      return true;
    }
    await sql`
      insert into period_locks (business_id, year, month, locked_by)
      values (${businessId}, ${year}, ${month}, ${userId})
      on conflict do nothing`;
    await audit(sql, businessId, userId, "cerrar", "periodo", `${year}-${month}`, "");
    return true;
  });
}

export async function listAudit(userId: string, businessId: string) {
  const sql = await db();
  const who = await member(sql, userId, businessId);
  assertCap(who, "reports");
  const rows = await sql<Record<string, unknown>>`
    select a.action, a.entity, a.detail, a.created_at, coalesce(m.display_name, 'Usuario') as actor
    from audit_log a
    left join memberships m on m.business_id = a.business_id and m.user_id = a.user_id
    where a.business_id = ${businessId}
    order by a.created_at desc limit 150`;
  return rows.map((row) => ({
    action: String(row.action),
    entity: String(row.entity),
    detail: String(row.detail ?? ""),
    createdAt: String(row.created_at),
    actor: String(row.actor),
  }));
}

export async function saveQuote(
  userId: string,
  input: { businessId: string; customerId: string | null; note: string; totalCents: number; cart: unknown },
) {
  return withTx(async (sql) => {
    const who = await member(sql, userId, input.businessId);
    assertCap(who, "sell");
    const rows = await sql<{ n: number; prefix: string }>`
      update businesses set next_quote = next_quote + 1 where id = ${input.businessId}
      returning (next_quote - 1) as n, quote_prefix as prefix`;
    const number = `${rows[0]?.prefix ?? "COT"}-${String(num(rows[0]?.n)).padStart(6, "0")}`;
    const id = crypto.randomUUID();
    await sql`
      insert into quotes (id, business_id, customer_id, number, note, total_cents, cart, created_by)
      values (${id}, ${input.businessId}, ${input.customerId}, ${number}, ${input.note.trim()}, ${input.totalCents}, ${JSON.stringify(input.cart)}::jsonb, ${userId})`;
    return { id, number };
  });
}

export async function listQuotes(userId: string, businessId: string) {
  const sql = await db();
  await member(sql, userId, businessId);
  const rows = await sql<Record<string, unknown>>`
    select id, number, note, total_cents, status, cart, created_at from quotes
    where business_id = ${businessId} order by created_at desc limit 50`;
  return rows.map((row) => ({
    id: String(row.id),
    number: String(row.number),
    note: String(row.note ?? ""),
    totalCents: num(row.total_cents),
    status: String(row.status),
    cart: typeof row.cart === "string" ? JSON.parse(row.cart) : row.cart,
    createdAt: String(row.created_at),
  }));
}

export async function voidQuote(userId: string, businessId: string, quoteId: string) {
  const sql = await db();
  const who = await member(sql, userId, businessId);
  assertCap(who, "sell");
  await sql`update quotes set status = 'void' where id = ${quoteId} and business_id = ${businessId}`;
  return true;
}

function moneySigned(kind: string, amount: number) {
  return kind === "return" ? -amount : amount;
}

export async function dashboard(userId: string, businessId: string, branchId: string) {
  const sql = await db();
  await member(sql, userId, businessId);
  const clock = await sql<{ timezone: string; day: string }>`
    select timezone, to_char(now() at time zone timezone, 'YYYY-MM-DD') as day from businesses where id = ${businessId}`;
  const tz = clock[0]?.timezone ?? "America/Managua";
  const today = String(clock[0]?.day ?? "").slice(0, 10);
  const sales = await sql<Record<string, unknown>>`
    select kind, total_cents, subtotal_cents, discount_cents, cost_cents, created_at
    from sales where business_id = ${businessId} and branch_id = ${branchId}`;
  const dayKey = (value: string) => {
    const date = new Date(value);
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  };
  const todayDate = new Date(`${today}T12:00:00Z`);
  const yesterday = new Date(todayDate);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yKey = yesterday.toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const weekStart = new Date(todayDate);
  const weekday = weekStart.getUTCDay();
  const mondayOffset = weekday === 0 ? 6 : weekday - 1;
  weekStart.setUTCDate(weekStart.getUTCDate() - mondayOffset);
  const weekKey = weekStart.toISOString().slice(0, 10);
  let salesToday = 0, salesYesterday = 0, salesWeek = 0, salesMonth = 0, grossMonth = 0;
  const byDay = new Map<string, number>();
  for (const row of sales) {
    const key = dayKey(String(row.created_at));
    const total = moneySigned(String(row.kind), num(row.total_cents));
    const gross = moneySigned(String(row.kind), num(row.subtotal_cents) - num(row.discount_cents) - num(row.cost_cents));
    if (key === today) salesToday += total;
    if (key === yKey) salesYesterday += total;
    if (key >= weekKey && key <= today) salesWeek += total;
    if (key.startsWith(month)) {
      salesMonth += total;
      grossMonth += gross;
    }
    if (key >= yKey && key <= today) byDay.set(key, (byDay.get(key) ?? 0) + total);
  }
  const series: { day: string; totalCents: number }[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const key = addDays(today, -i);
    series.push({ day: key.slice(5), totalCents: byDay.get(key) ?? 0 });
  }
  const expenses = await sql<{ amount: number }>`
    select coalesce(sum(amount_cents), 0) as amount from expenses
    where business_id = ${businessId} and to_char(spent_on, 'YYYY-MM') = ${month}`;
  const ar = await sql<{ amount: number }>`
    select coalesce(sum(balance_cents), 0) as amount from customers where business_id = ${businessId}`;
  const ap = await sql<{ amount: number }>`
    select coalesce(sum(balance_cents), 0) as amount from suppliers where business_id = ${businessId}`;
  const caja = await sql<{ amount: number }>`
    select coalesce(sum(l.debit_cents - l.credit_cents), 0) as amount
    from journal_lines l
    join journal_entries e on e.id = l.entry_id
    join ledger_accounts a on a.id = l.account_id
    where e.business_id = ${businessId} and a.system_key = 'caja'`;
  const stockRows = await sql<Record<string, unknown>>`
    select p.id, p.name, p.min_qty, p.expires_on, coalesce(s.qty, 0) as qty
    from products p
    left join stocks s on s.product_id = p.id and s.branch_id = ${branchId}
    where p.business_id = ${businessId} and p.active`;
  let outOfStock = 0, lowStock = 0, expiring = 0, expired = 0;
  const alerts: { text: string }[] = [];
  for (const row of stockRows) {
    const qty = num(row.qty);
    const min = num(row.min_qty);
    const exp = row.expires_on ? String(row.expires_on).slice(0, 10) : null;
    if (qty <= 0) outOfStock += 1;
    else if (min > 0 && qty <= min) lowStock += 1;
    if (exp && exp < today) expired += 1;
    else if (exp && exp <= addDays(today, 30)) expiring += 1;
  }
  const sold = await sql<Record<string, unknown>>`
    select p.name, coalesce(s.qty, 0) as qty,
      coalesce(sum(case when sa.kind = 'return' then -si.qty else si.qty end), 0) as sold
    from products p
    left join stocks s on s.product_id = p.id and s.branch_id = ${branchId}
    left join sale_items si on si.product_id = p.id
    left join sales sa on sa.id = si.sale_id and sa.business_id = ${businessId}
      and sa.created_at > now() - interval '7 days' and sa.branch_id = ${branchId}
    where p.business_id = ${businessId} and p.active
    group by p.id, p.name, s.qty
    having coalesce(s.qty, 0) <= 8 or coalesce(sum(case when sa.kind = 'return' then -si.qty else si.qty end), 0) > coalesce(s.qty, 0)
    order by coalesce(s.qty, 0) asc
    limit 6`;
  for (const row of sold) {
    const qty = num(row.qty);
    const units = num(row.sold);
    if (units > 0 && qty < units) {
      alerts.push({
        text: `${row.name} se está agotando. En los últimos siete días se vendieron ${units} y quedan ${qty}.`,
      });
    } else if (qty <= 0) alerts.push({ text: `${row.name} está agotado.` });
  }
  const top = await sql<Record<string, unknown>>`
    select si.name, coalesce(sum(case when sa.kind = 'return' then -si.qty else si.qty end), 0) as qty,
      coalesce(sum(case when sa.kind = 'return' then -si.line_total_cents else si.line_total_cents end), 0) as total
    from sale_items si
    join sales sa on sa.id = si.sale_id
    where sa.business_id = ${businessId} and sa.branch_id = ${branchId}
      and to_char(sa.created_at at time zone ${tz}, 'YYYY-MM') = ${month}
    group by si.name
    order by qty desc
    limit 5`;
  const pending = await sql<{ count: number; amount: number }>`
    select count(*)::int as count, coalesce(sum(amount_cents), 0) as amount
    from sale_payments where business_id = ${businessId} and status = 'pending'`;
  const fin = await financials(userId, businessId, `${month}-01`, today);
  return {
    salesToday,
    salesYesterday,
    salesWeek,
    salesMonth,
    grossMonth,
    netMonth: fin.net,
    expensesMonth: num(expenses[0]?.amount),
    cajaCents: num(caja[0]?.amount),
    arCents: num(ar[0]?.amount),
    apCents: num(ap[0]?.amount),
    outOfStock,
    lowStock,
    expiring,
    expired,
    pendingCount: num(pending[0]?.count),
    pendingCents: num(pending[0]?.amount),
    series,
    top: top.map((row) => ({ name: String(row.name), qty: num(row.qty), totalCents: num(row.total) })),
    alerts,
  };
}

function addDays(day: string, days: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function report(userId: string, businessId: string, branchId: string, from: string, to: string) {
  const sql = await db();
  await member(sql, userId, businessId);
  const rows = await sql<Record<string, unknown>>`
    select sa.kind, sa.total_cents, sa.subtotal_cents, sa.discount_cents, sa.cost_cents, sa.cashier_id,
      coalesce(m.display_name, 'Cajero') as cashier, sa.branch_id, sa.created_at, sa.customer_id
    from sales sa
    left join memberships m on m.business_id = sa.business_id and m.user_id = sa.cashier_id
    where sa.business_id = ${businessId}
      and (${branchId} = '' or sa.branch_id = ${branchId})
      and (sa.created_at at time zone (select timezone from businesses where id = ${businessId}))::date >= ${from}::date
      and (sa.created_at at time zone (select timezone from businesses where id = ${businessId}))::date <= ${to}::date`;
  let netSales = 0;
  let gross = 0;
  const byCashier = new Map<string, number>();
  for (const row of rows) {
    const total = moneySigned(String(row.kind), num(row.total_cents));
    netSales += total;
    gross += moneySigned(String(row.kind), num(row.subtotal_cents) - num(row.discount_cents) - num(row.cost_cents));
    const name = String(row.cashier);
    byCashier.set(name, (byCashier.get(name) ?? 0) + total);
  }
  const products = await sql<Record<string, unknown>>`
    select si.name,
      coalesce(sum(case when sa.kind = 'return' then -si.qty else si.qty end), 0) as qty,
      coalesce(sum(case when sa.kind = 'return' then -(si.line_total_cents - si.tax_cents - si.extended_cost_cents) else (si.line_total_cents - si.tax_cents - si.extended_cost_cents) end), 0) as profit
    from sale_items si
    join sales sa on sa.id = si.sale_id
    where sa.business_id = ${businessId}
      and (${branchId} = '' or sa.branch_id = ${branchId})
      and (sa.created_at at time zone (select timezone from businesses where id = ${businessId}))::date between ${from}::date and ${to}::date
    group by si.name
    order by profit desc
    limit 12`;
  const quiet = await sql<Record<string, unknown>>`
    select p.name, coalesce(s.qty, 0) as qty from products p
    left join stocks s on s.product_id = p.id and (${branchId} = '' or s.branch_id = ${branchId})
    where p.business_id = ${businessId} and p.active and coalesce(s.qty, 0) > 0
      and not exists (
        select 1 from sale_items si join sales sa on sa.id = si.sale_id
        where si.product_id = p.id and sa.created_at::date between ${from}::date and ${to}::date
      )
    order by p.name limit 8`;
  const span = Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1);
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, 1 - span);
  const previous = await sql<{ amount: number }>`
    select coalesce(sum(case when kind = 'return' then -total_cents else total_cents end), 0) as amount
    from sales where business_id = ${businessId}
      and (created_at at time zone (select timezone from businesses where id = ${businessId}))::date between ${prevFrom}::date and ${prevTo}::date`;
  const fin = await financials(userId, businessId, from, to);
  const hints = products
    .map((row) => ({ name: String(row.name), qty: num(row.qty), profitCents: num(row.profit) }))
    .filter((row) => row.qty > 0)
    .slice(0, 3);
  return {
    netSales,
    gross,
    net: fin.net,
    expenses: fin.expense,
    byCashier: [...byCashier.entries()].map(([name, totalCents]) => ({ name, totalCents })),
    products: products.map((row) => ({ name: String(row.name), qty: num(row.qty), profitCents: num(row.profit) })),
    quiet: quiet.map((row) => ({ name: String(row.name), qty: num(row.qty) })),
    previousCents: num(previous[0]?.amount),
    hints,
  };
}

export async function createDemo(userId: string, displayName: string) {
  const sql = await db();
  const existing = await sql<{ id: string }>`
    select b.id from businesses b
    join memberships m on m.business_id = b.id
    where m.user_id = ${userId} and b.is_demo = true limit 1`;
  if (existing[0]) return existing[0].id;
  const businessId = await createBusiness(userId, {
    name: "DEMO · Pulpería El Farol",
    address: "Mercado central, León",
    phone: "0000-0000",
    taxId: "",
    businessType: "pulperia",
    currency: "NIO",
    timezone: "America/Managua",
    displayName,
    logo: null,
    isDemo: true,
  });
  const branches = await sql<{ id: string }>`select id from branches where business_id = ${businessId} and is_default limit 1`;
  const branchId = branches[0]?.id;
  if (!branchId) throw new Error("No se creó la sucursal de demostración");
  const samples = [
    ["DEMO · Arroz 2 lb", 2800, 3400, 20, "750100000001", "Abarrotes", 8],
    ["DEMO · Frijoles rojos", 3200, 4000, 15, "750100000002", "Abarrotes", 6],
    ["DEMO · Aceite 1 L", 5800, 7200, 8, "750100000003", "Abarrotes", 4],
    ["DEMO · Azúcar 2 lb", 2400, 3000, 6, "750100000004", "Abarrotes", 8],
    ["DEMO · Gaseosa 500 ml", 1200, 1800, 24, "750100000005", "Bebidas", 12],
    ["DEMO · Café 50 g", 800, 1200, 18, "750100000006", "Abarrotes", 6],
    ["DEMO · Leche 1 L", 2800, 3500, 4, "750100000007", "Lácteos", 4],
    ["DEMO · Jabón de lavar", 1500, 2200, 0, "750100000008", "Limpieza", 4],
  ] as const;
  const ids: Record<string, string> = {};
  for (const sample of samples) {
    const id = await saveProduct(userId, {
      businessId,
      branchId,
      name: sample[0],
      description: "Dato de demostración. No es una existencia real.",
      photo: null,
      category: sample[5],
      subcategory: "",
      brand: "DEMO",
      sku: "",
      barcode: sample[4],
      costCents: sample[1],
      priceCents: sample[2],
      wholesaleCents: sample[1] + 200,
      promoCents: null,
      promoUntil: null,
      volumePrices: [],
      taxExempt: false,
      regulated: false,
      minQty: sample[6],
      unit: "unidad",
      supplierId: null,
      expiresOn: sample[0].includes("Leche") ? addDays(new Date().toISOString().slice(0, 10), 12) : null,
      lotCode: sample[0].includes("Leche") ? "DEMO-L1" : "",
      location: "Estante A",
      active: true,
      favorite: sample[0].includes("Gaseosa"),
      parentId: null,
      variantLabel: "",
      initialQty: sample[3],
    });
    ids[sample[0]] = id;
  }
  const customerId = await saveCustomer(userId, {
    businessId,
    name: "DEMO · María López",
    phone: "8888-0000",
    address: "Barrio El Sagrario",
    taxId: "",
    photo: null,
    creditLimitCents: 500000,
    priceTier: "retail",
    blocked: false,
    notes: "Cliente de demostración",
  });
  await saveSupplier(userId, {
    businessId,
    name: "DEMO · Distribuidora Central",
    contact: "Carlos",
    phone: "2222-0000",
    address: "Managua",
    taxId: "",
    terms: "15 días",
    notes: "Proveedor de demostración",
  });
  await openCash(userId, businessId, branchId, 0);
  await checkout(userId, {
    businessId,
    branchId,
    clientId: crypto.randomUUID(),
    customerId: null,
    orderDiscountCents: 0,
    cashTenderedCents: 5000,
    note: "Venta de demostración",
    lines: [
      { productId: ids["DEMO · Gaseosa 500 ml"], qty: 2, unitPriceCents: 1800, discountCents: 0 },
    ],
    payments: [{ method: "cash", amountCents: 3600, confirmed: true }],
  });
  const creditTotal = 3400 + 7200;
  await checkout(userId, {
    businessId,
    branchId,
    clientId: crypto.randomUUID(),
    customerId,
    orderDiscountCents: 0,
    cashTenderedCents: 0,
    note: "Fiado de demostración",
    lines: [
      { productId: ids["DEMO · Arroz 2 lb"], qty: 1, unitPriceCents: 3400, discountCents: 0 },
      { productId: ids["DEMO · Aceite 1 L"], qty: 1, unitPriceCents: 7200, discountCents: 0 },
    ],
    payments: [{ method: "credit", amountCents: creditTotal }],
  });
  await postAbono(userId, {
    businessId,
    branchId,
    customerId,
    amountCents: 2000,
    method: "cash",
    reference: "",
    note: "Abono de demostración",
    clientId: crypto.randomUUID(),
  });
  await saveExpense(userId, {
    businessId,
    branchId,
    accountKey: "servicios",
    amountCents: 35000,
    method: "transfer",
    payee: "DEMO · Energía",
    note: "Gasto de demostración",
    receipt: null,
    spentOn: new Date().toISOString().slice(0, 10),
  });
  return businessId;
}

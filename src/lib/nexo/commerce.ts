import { calcCart, cashChange, chunkCents } from "./money";
import type { CheckoutInput, SaleDoc } from "./types";
import { withTx } from "./tx";
import {
  assertCap,
  audit,
  bizClock,
  cleanPhoto,
  db,
  drawerExpected,
  drawerMove,
  member,
  movement,
  needDrawer,
  num,
  openDrawer,
  postJournal,
  setStock,
  stockOf,
} from "./access";

function mergeLines(lines: CheckoutInput["lines"]) {
  const map = new Map<string, CheckoutInput["lines"][number]>();
  for (const line of lines) {
    const prev = map.get(line.productId);
    if (!prev) map.set(line.productId, { ...line, note: line.note ?? "" });
    else {
      if (prev.unitPriceCents !== line.unitPriceCents) {
        throw new Error("El mismo producto está con dos precios. Separe la venta.");
      }
      prev.qty += line.qty;
      prev.discountCents += line.discountCents;
      prev.note = [prev.note, line.note].filter(Boolean).join(" · ");
    }
  }
  return [...map.values()];
}

export async function checkout(userId: string, input: CheckoutInput) {
  return withTx((sql) => checkoutTx(sql, userId, input));
}

async function checkoutTx(sql: Parameters<Parameters<typeof withTx>[0]>[0], userId: string, input: CheckoutInput) {
  const who = await member(sql, userId, input.businessId);
  assertCap(who, "sell");
  const dup = await sql<{ id: string; number: string; total_cents: number }>`
    select id, number, total_cents from sales
    where business_id = ${input.businessId} and client_id = ${input.clientId}`;
  if (dup[0]) {
    return { saleId: dup[0].id, number: dup[0].number, totalCents: num(dup[0].total_cents), idempotent: true };
  }
  const lines = mergeLines(input.lines);
  const ids = lines.map((line) => line.productId).sort();
  const clock = await bizClock(sql, input.businessId);
  type Prod = {
    id: string;
    name: string;
    active: boolean;
    cost_cents: number;
    tax_exempt: boolean;
    regulated: boolean;
    expires_on: string | null;
  };
  const products = new Map<string, Prod & { stock: number }>();
  for (const id of ids) {
    const stock = await stockOf(sql, id, input.branchId);
    const rows = await sql<Prod>`
      select id, name, active, cost_cents, tax_exempt, regulated, expires_on
      from products where id = ${id} and business_id = ${input.businessId}`;
    if (!rows[0] || stock == null) throw new Error("Un producto del carrito ya no existe");
    products.set(id, { ...rows[0], stock });
  }
  for (const line of lines) {
    const product = products.get(line.productId)!;
    if (!product.active) throw new Error(`${product.name} está inactivo`);
    const expires = product.expires_on ? String(product.expires_on).slice(0, 10) : null;
    if (expires && expires < clock.day) throw new Error(`${product.name} está vencido y no se puede vender`);
    if (product.regulated && !(line.note ?? "").trim()) {
      throw new Error(`${product.name} es regulado. Anote la referencia de la receta o autorización.`);
    }
    if (product.stock < line.qty && !clock.allowNegative) {
      throw new Error(`Existencia insuficiente de ${product.name}. Hay ${product.stock}.`);
    }
  }
  const totals = calcCart({
    taxRateBps: clock.taxRateBps,
    orderDiscountCents: input.orderDiscountCents,
    lines: lines.map((line) => ({
      qty: line.qty,
      unitPriceCents: line.unitPriceCents,
      discountCents: line.discountCents,
      taxExempt: Boolean(products.get(line.productId)?.tax_exempt),
      costCents: num(products.get(line.productId)?.cost_cents),
    })),
  });
  let cash = 0;
  let bank = 0;
  let transit = 0;
  let credit = 0;
  for (const pay of input.payments) {
    if (!Number.isInteger(pay.amountCents) || pay.amountCents <= 0) throw new Error("Monto de pago inválido");
    if (pay.method === "cash") cash += pay.amountCents;
    else if (pay.method === "credit") credit += pay.amountCents;
    else if (pay.method === "transfer" || pay.method === "card") {
      if (pay.confirmed) bank += pay.amountCents;
      else transit += pay.amountCents;
    } else throw new Error("Método de pago desconocido");
  }
  const paid = cash + bank + transit + credit;
  if (paid !== totals.totalCents) {
    throw new Error("Los pagos no cuadran con el total. Revise el carrito.");
  }
  const change = cashChange(cash, input.cashTenderedCents);
  let session: string | null = null;
  if (cash > 0) session = await needDrawer(sql, input.businessId, input.branchId, userId);
  if (credit > 0 && !input.customerId) throw new Error("Elija un cliente para vender a fiado");
  if (input.customerId) {
    const customers = await sql<{ credit_limit_cents: number; balance_cents: number; blocked: boolean; name: string }>`
      select credit_limit_cents, balance_cents, blocked, name from customers
      where id = ${input.customerId} and business_id = ${input.businessId} for update`;
    const customer = customers[0];
    if (!customer) throw new Error("Cliente no encontrado");
    if (credit > 0) {
      if (customer.blocked) throw new Error(`${customer.name} está bloqueado para fiado`);
      if (await customerIsOverdue(sql, input.businessId, input.customerId, clock.day)) {
        throw new Error(`${customer.name} tiene saldo vencido. Registre un abono antes de un nuevo fiado.`);
      }
      const nextBal = num(customer.balance_cents) + credit;
      if (nextBal > num(customer.credit_limit_cents)) {
        throw new Error("La venta supera el límite de crédito del cliente");
      }
    }
  }
  const numberRows = await sql<{ n: number }>`
    update businesses set next_invoice = next_invoice + 1
    where id = ${input.businessId} returning (next_invoice - 1) as n`;
  const number = `${clock.invoicePrefix}-${String(num(numberRows[0]?.n)).padStart(6, "0")}`;
  const saleId = crypto.randomUUID();
  const due = credit > 0 ? clock.day : null;
  await sql`
    insert into sales (
      id, business_id, branch_id, number, kind, client_id, customer_id, cashier_id,
      subtotal_cents, discount_cents, tax_cents, total_cents, cost_cents, credit_cents,
      cash_tendered_cents, change_cents, due_on, note
    ) values (
      ${saleId}, ${input.businessId}, ${input.branchId}, ${number}, 'sale', ${input.clientId},
      ${input.customerId}, ${userId}, ${totals.subtotalCents}, ${totals.discountCents}, ${totals.taxCents},
      ${totals.totalCents}, ${totals.costCents}, ${credit}, ${input.cashTenderedCents}, ${change},
      ${due ? sqlDatePlus(due, clock.creditDays) : null}, ${input.note.trim()}
    )`;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const priced = totals.lines[i];
    const product = products.get(line.productId)!;
    await sql`
      insert into sale_items (
        id, sale_id, product_id, name, qty, unit_price_cents, discount_cents, tax_cents,
        line_total_cents, unit_cost_cents, extended_cost_cents, note
      ) values (
        ${crypto.randomUUID()}, ${saleId}, ${line.productId}, ${product.name}, ${line.qty}, ${line.unitPriceCents},
        ${priced.discountCents}, ${priced.taxCents}, ${priced.lineTotalCents}, ${num(product.cost_cents)},
        ${num(product.cost_cents) * line.qty}, ${line.note ?? ""}
      )`;
    await setStock(sql, line.productId, input.branchId, product.stock - line.qty);
    await movement(sql, input.businessId, line.productId, input.branchId, -line.qty, "Venta", "sale", saleId, number, userId);
  }
  for (const pay of input.payments) {
    const status = pay.method === "cash" || pay.method === "credit" || pay.confirmed ? "confirmed" : "pending";
    await sql`
      insert into sale_payments (id, sale_id, business_id, method, amount_cents, reference, status)
      values (${crypto.randomUUID()}, ${saleId}, ${input.businessId}, ${pay.method}, ${pay.amountCents}, ${pay.reference ?? ""}, ${status})`;
  }
  if (credit > 0 && input.customerId) {
    await sql`update customers set balance_cents = balance_cents + ${credit} where id = ${input.customerId}`;
  }
  await drawerMove(sql, session, input.businessId, "sale", cash, number, saleId);
  await postJournal(sql, {
    businessId: input.businessId,
    userId,
    memo: `Venta ${number}`,
    source: "sale",
    sourceId: saleId,
    lines: [
      { key: "caja", debitCents: cash },
      { key: "bancos", debitCents: bank },
      { key: "transito", debitCents: transit },
      { key: "cxc", debitCents: credit },
      { key: "descuentos", debitCents: totals.discountCents },
      { key: "cogs", debitCents: totals.costCents },
      { key: "ventas", creditCents: totals.subtotalCents },
      { key: "impuestos", creditCents: totals.taxCents },
      { key: "inventario", creditCents: totals.costCents },
    ],
  });
  await audit(sql, input.businessId, userId, "vender", "venta", saleId, number);
  return { saleId, number, totalCents: totals.totalCents, changeCents: change, idempotent: false };
}

function sqlDatePlus(day: string, days: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function customerIsOverdue(sql: Parameters<Parameters<typeof withTx>[0]>[0], businessId: string, customerId: string, today: string) {
  const sales = await sql<{ credit_cents: number; due_on: string | null }>`
    select credit_cents, due_on from sales
    where business_id = ${businessId} and customer_id = ${customerId} and kind = 'sale' and credit_cents > 0
    order by created_at`;
  const pays = await sql<{ amount_cents: number; reverses_id: string | null }>`
    select amount_cents, reverses_id from credit_payments
    where business_id = ${businessId} and customer_id = ${customerId} order by created_at`;
  let pool = 0;
  for (const pay of pays) pool += pay.reverses_id ? -num(pay.amount_cents) : num(pay.amount_cents);
  for (const sale of sales) {
    const credit = num(sale.credit_cents);
    const covered = Math.min(Math.max(pool, 0), credit);
    pool -= covered;
    const remain = credit - covered;
    const due = sale.due_on ? String(sale.due_on).slice(0, 10) : null;
    if (remain > 0 && due && due < today) return true;
  }
  return false;
}

export async function getSale(userId: string, businessId: string, saleId: string): Promise<SaleDoc> {
  const sql = await db();
  await member(sql, userId, businessId);
  const sales = await sql<Record<string, unknown>>`
    select s.*, coalesce(c.name, 'Consumidor final') as customer_name, coalesce(m.display_name, 'Cajero') as cashier_name,
      b.name as biz_name, b.address, b.phone, b.tax_id, b.logo, b.currency
    from sales s
    join businesses b on b.id = s.business_id
    left join customers c on c.id = s.customer_id
    left join memberships m on m.business_id = s.business_id and m.user_id = s.cashier_id
    where s.id = ${saleId} and s.business_id = ${businessId}`;
  const sale = sales[0];
  if (!sale) throw new Error("Venta no encontrada");
  const items = await sql<Record<string, unknown>>`
    select * from sale_items where sale_id = ${saleId} order by name`;
  const payments = await sql<Record<string, unknown>>`
    select * from sale_payments where sale_id = ${saleId}`;
  return {
    id: String(sale.id),
    number: String(sale.number),
    kind: String(sale.kind),
    createdAt: String(sale.created_at),
    subtotalCents: num(sale.subtotal_cents),
    discountCents: num(sale.discount_cents),
    taxCents: num(sale.tax_cents),
    totalCents: num(sale.total_cents),
    costCents: num(sale.cost_cents),
    creditCents: num(sale.credit_cents),
    cashTenderedCents: num(sale.cash_tendered_cents),
    changeCents: num(sale.change_cents),
    note: String(sale.note ?? ""),
    customerName: String(sale.customer_name),
    cashierName: String(sale.cashier_name),
    items: items.map((item) => ({
      id: String(item.id),
      productId: String(item.product_id),
      name: String(item.name),
      qty: num(item.qty),
      returnedQty: num(item.returned_qty),
      unitPriceCents: num(item.unit_price_cents),
      discountCents: num(item.discount_cents),
      taxCents: num(item.tax_cents),
      lineTotalCents: num(item.line_total_cents),
      note: String(item.note ?? ""),
    })),
    payments: payments.map((pay) => ({
      id: String(pay.id),
      method: String(pay.method),
      amountCents: num(pay.amount_cents),
      reference: String(pay.reference ?? ""),
      status: String(pay.status),
    })),
    business: {
      name: String(sale.biz_name),
      address: String(sale.address ?? ""),
      phone: String(sale.phone ?? ""),
      taxId: String(sale.tax_id ?? ""),
      logo: (sale.logo as string | null) ?? null,
      currency: String(sale.currency),
    },
  };
}

export async function listPendingPayments(userId: string, businessId: string) {
  const sql = await db();
  await member(sql, userId, businessId);
  const rows = await sql<Record<string, unknown>>`
    select p.id, p.method, p.amount_cents, p.reference, s.number
    from sale_payments p
    join sales s on s.id = p.sale_id
    where p.business_id = ${businessId} and p.status = 'pending'
    order by s.created_at desc
    limit 40`;
  return rows.map((row) => ({
    id: String(row.id),
    method: String(row.method),
    amountCents: num(row.amount_cents),
    reference: String(row.reference ?? ""),
    number: String(row.number),
  }));
}

export async function listSales(userId: string, businessId: string) {
  const sql = await db();
  await member(sql, userId, businessId);
  const rows = await sql<Record<string, unknown>>`
    select s.id, s.number, s.kind, s.total_cents, s.created_at, coalesce(c.name, 'Consumidor final') as customer_name
    from sales s
    left join customers c on c.id = s.customer_id
    where s.business_id = ${businessId}
    order by s.created_at desc
    limit 80`;
  return rows.map((row) => ({
    id: String(row.id),
    number: String(row.number),
    kind: String(row.kind),
    totalCents: num(row.total_cents),
    createdAt: String(row.created_at),
    customerName: String(row.customer_name),
  }));
}

export async function returnSale(
  userId: string,
  input: {
    businessId: string;
    saleId: string;
    clientId: string;
    lines: { saleItemId: string; qty: number }[];
    refundMethod: "cash" | "transfer";
  },
) {
  return withTx(async (sql) => {
    const who = await member(sql, userId, input.businessId);
    assertCap(who, "refund");
    const dup = await sql<{ id: string; number: string }>`
      select id, number from sales where business_id = ${input.businessId} and client_id = ${input.clientId}`;
    if (dup[0]) return { saleId: dup[0].id, number: dup[0].number, idempotent: true };
    const sales = await sql<{ id: string; kind: string; customer_id: string | null; branch_id: string; number: string }>`
      select id, kind, customer_id, branch_id, number from sales
      where id = ${input.saleId} and business_id = ${input.businessId} for update`;
    const sale = sales[0];
    if (!sale || sale.kind !== "sale") throw new Error("Solo se puede devolver una venta original");
    const items = await sql<Record<string, unknown>>`
      select * from sale_items where sale_id = ${sale.id} for update`;
    let subtotal = 0;
    let discount = 0;
    let tax = 0;
    let total = 0;
    let cost = 0;
    const chosen: { item: Record<string, unknown>; qty: number; discount: number; tax: number; total: number; cost: number }[] = [];
    for (const request of input.lines) {
      if (!Number.isInteger(request.qty) || request.qty <= 0) continue;
      const item = items.find((row) => row.id === request.saleItemId);
      if (!item) throw new Error("Línea de venta no encontrada");
      const qty = num(item.qty);
      const already = num(item.returned_qty);
      const partDiscount = chunkCents(num(item.discount_cents), qty, already, request.qty);
      const partTax = chunkCents(num(item.tax_cents), qty, already, request.qty);
      const partTotal = chunkCents(num(item.line_total_cents), qty, already, request.qty);
      const partCost = chunkCents(num(item.extended_cost_cents), qty, already, request.qty);
      const partNet = partTotal - partTax;
      const partSub = partNet + partDiscount;
      subtotal += partSub;
      discount += partDiscount;
      tax += partTax;
      total += partTotal;
      cost += partCost;
      chosen.push({ item, qty: request.qty, discount: partDiscount, tax: partTax, total: partTotal, cost: partCost });
    }
    if (!chosen.length || total <= 0) throw new Error("Indique qué productos regresan");
    let creditCut = 0;
    if (sale.customer_id) {
      const customers = await sql<{ balance_cents: number }>`
        select balance_cents from customers where id = ${sale.customer_id} for update`;
      creditCut = Math.min(total, num(customers[0]?.balance_cents));
    }
    const cashOut = input.refundMethod === "cash" ? total - creditCut : 0;
    const bankOut = input.refundMethod === "transfer" ? total - creditCut : 0;
    const session = cashOut > 0 ? await needDrawer(sql, input.businessId, sale.branch_id, userId) : null;
    const clock = await bizClock(sql, input.businessId);
    const numberRows = await sql<{ n: number }>`
      update businesses set next_invoice = next_invoice + 1 where id = ${input.businessId} returning (next_invoice - 1) as n`;
    const number = `NC-${String(num(numberRows[0]?.n)).padStart(6, "0")}`;
    const returnId = crypto.randomUUID();
    await sql`
      insert into sales (
        id, business_id, branch_id, number, kind, reverses_id, client_id, customer_id, cashier_id,
        subtotal_cents, discount_cents, tax_cents, total_cents, cost_cents, credit_cents, note
      ) values (
        ${returnId}, ${input.businessId}, ${sale.branch_id}, ${number}, 'return', ${sale.id}, ${input.clientId},
        ${sale.customer_id}, ${userId}, ${subtotal}, ${discount}, ${tax}, ${total}, ${cost}, ${creditCut},
        ${"Devolución de " + sale.number}
      )`;
    for (const line of chosen) {
      await sql`
        insert into sale_items (
          id, sale_id, product_id, name, qty, unit_price_cents, discount_cents, tax_cents, line_total_cents,
          unit_cost_cents, extended_cost_cents, note
        ) values (
          ${crypto.randomUUID()}, ${returnId}, ${line.item.product_id}, ${line.item.name}, ${line.qty},
          ${num(line.item.unit_price_cents)}, ${line.discount}, ${line.tax}, ${line.total},
          ${num(line.item.unit_cost_cents)}, ${line.cost}, ''
        )`;
      await sql`update sale_items set returned_qty = returned_qty + ${line.qty} where id = ${line.item.id}`;
      const stock = (await stockOf(sql, String(line.item.product_id), sale.branch_id)) ?? 0;
      await setStock(sql, String(line.item.product_id), sale.branch_id, stock + line.qty);
      await movement(sql, input.businessId, String(line.item.product_id), sale.branch_id, line.qty, "Devolución", "return", returnId, number, userId);
    }
    if (creditCut > 0 && sale.customer_id) {
      await sql`update customers set balance_cents = balance_cents - ${creditCut} where id = ${sale.customer_id}`;
      const receipt = await nextReceipt(sql, input.businessId);
      await sql`
        insert into credit_payments (
          id, business_id, customer_id, amount_cents, method, receipt_number, note, created_by
        ) values (
          ${crypto.randomUUID()}, ${input.businessId}, ${sale.customer_id}, ${creditCut}, 'return', ${receipt},
          ${"Aplicado a " + number}, ${userId}
        )`;
    }
    await drawerMove(sql, session, input.businessId, "refund", cashOut, number, returnId);
    await postJournal(sql, {
      businessId: input.businessId,
      userId,
      memo: `Devolución ${number}`,
      source: "return",
      sourceId: returnId,
      lines: [
        { key: "ventas", debitCents: subtotal },
        { key: "impuestos", debitCents: tax },
        { key: "inventario", debitCents: cost },
        { key: "caja", creditCents: cashOut },
        { key: "bancos", creditCents: bankOut },
        { key: "cxc", creditCents: creditCut },
        { key: "descuentos", creditCents: discount },
        { key: "cogs", creditCents: cost },
      ],
    });
    await audit(sql, input.businessId, userId, "devolver", "venta", returnId, number);
    return { saleId: returnId, number, totalCents: total, idempotent: false };
  });
}

async function nextReceipt(sql: Parameters<Parameters<typeof withTx>[0]>[0], businessId: string) {
  const rows = await sql<{ n: number; prefix: string }>`
    update businesses set next_receipt = next_receipt + 1
    where id = ${businessId} returning (next_receipt - 1) as n, receipt_prefix as prefix`;
  return `${rows[0]?.prefix ?? "REC"}-${String(num(rows[0]?.n)).padStart(6, "0")}`;
}

export async function confirmPayment(userId: string, businessId: string, paymentId: string) {
  return withTx(async (sql) => {
    const who = await member(sql, userId, businessId);
    assertCap(who, "cash");
    const rows = await sql<{ id: string; amount_cents: number; status: string; method: string }>`
      select id, amount_cents, status, method from sale_payments
      where id = ${paymentId} and business_id = ${businessId} for update`;
    const pay = rows[0];
    if (!pay || pay.status !== "pending") throw new Error("No hay un pago pendiente con ese identificador");
    await sql`update sale_payments set status = 'confirmed' where id = ${pay.id}`;
    const amount = num(pay.amount_cents);
    await postJournal(sql, {
      businessId,
      userId,
      memo: `Confirmación de ${pay.method}`,
      source: "confirm",
      sourceId: pay.id,
      lines: [
        { key: "bancos", debitCents: amount },
        { key: "transito", creditCents: amount },
      ],
    });
    await audit(sql, businessId, userId, "confirmar", "pago", pay.id, pay.method);
    return true;
  });
}

export async function parkSale(userId: string, businessId: string, branchId: string, label: string, cart: unknown) {
  const sql = await db();
  const who = await member(sql, userId, businessId);
  assertCap(who, "sell");
  const id = crypto.randomUUID();
  await sql`
    insert into parked_sales (id, business_id, branch_id, user_id, label, cart)
    values (${id}, ${businessId}, ${branchId}, ${userId}, ${label.trim() || "Venta suspendida"}, ${JSON.stringify(cart)}::jsonb)`;
  return id;
}

export async function listParked(userId: string, businessId: string) {
  const sql = await db();
  await member(sql, userId, businessId);
  const rows = await sql<{ id: string; label: string; cart: unknown; created_at: string }>`
    select id, label, cart, created_at from parked_sales where business_id = ${businessId} order by created_at desc`;
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    cart: typeof row.cart === "string" ? JSON.parse(row.cart) : row.cart,
    createdAt: row.created_at,
  }));
}

export async function discardParked(userId: string, businessId: string, id: string) {
  const sql = await db();
  await member(sql, userId, businessId);
  await sql`delete from parked_sales where id = ${id} and business_id = ${businessId}`;
  return true;
}

export async function listCustomers(userId: string, businessId: string) {
  const sql = await db();
  await member(sql, userId, businessId);
  const rows = await sql<Record<string, unknown>>`
    select * from customers where business_id = ${businessId} order by name`;
  return rows.map(mapCustomer);
}

function mapCustomer(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    name: String(row.name),
    phone: String(row.phone ?? ""),
    address: String(row.address ?? ""),
    taxId: String(row.tax_id ?? ""),
    photo: (row.photo as string | null) ?? null,
    creditLimitCents: num(row.credit_limit_cents),
    balanceCents: num(row.balance_cents),
    priceTier: String(row.price_tier ?? "retail"),
    blocked: Boolean(row.blocked),
    notes: String(row.notes ?? ""),
    isDemo: Boolean(row.is_demo),
  };
}

export async function saveCustomer(
  userId: string,
  input: {
    businessId: string;
    id?: string;
    name: string;
    phone: string;
    address: string;
    taxId: string;
    photo: string | null;
    creditLimitCents: number;
    priceTier: string;
    blocked: boolean;
    notes: string;
  },
) {
  const name = input.name.trim();
  if (name.length < 2) throw new Error("Escriba el nombre del cliente");
  return withTx(async (sql) => {
    const who = await member(sql, userId, input.businessId);
    assertCap(who, "customers");
    const photo = cleanPhoto(input.photo, "La foto");
    if (input.id) {
      await sql`
        update customers set name = ${name}, phone = ${input.phone.trim()}, address = ${input.address.trim()},
          tax_id = ${input.taxId.trim()}, photo = ${photo}, credit_limit_cents = ${input.creditLimitCents},
          price_tier = ${input.priceTier === "wholesale" ? "wholesale" : "retail"}, blocked = ${input.blocked},
          notes = ${input.notes.trim()}
        where id = ${input.id} and business_id = ${input.businessId}`;
      return input.id;
    }
    const id = crypto.randomUUID();
    await sql`
      insert into customers (id, business_id, name, phone, address, tax_id, photo, credit_limit_cents, price_tier, blocked, notes)
      values (
        ${id}, ${input.businessId}, ${name}, ${input.phone.trim()}, ${input.address.trim()}, ${input.taxId.trim()},
        ${photo}, ${input.creditLimitCents}, ${input.priceTier === "wholesale" ? "wholesale" : "retail"}, ${input.blocked},
        ${input.notes.trim()}
      )`;
    await audit(sql, input.businessId, userId, "crear", "cliente", id, name);
    return id;
  });
}

export async function customerStatement(userId: string, businessId: string, customerId: string) {
  const sql = await db();
  await member(sql, userId, businessId);
  const customers = await sql<Record<string, unknown>>`
    select * from customers where id = ${customerId} and business_id = ${businessId}`;
  if (!customers[0]) throw new Error("Cliente no encontrado");
  const sales = await sql<Record<string, unknown>>`
    select id, number, kind, total_cents, credit_cents, due_on, created_at from sales
    where business_id = ${businessId} and customer_id = ${customerId} order by created_at`;
  const payments = await sql<Record<string, unknown>>`
    select id, amount_cents, method, receipt_number, note, reverses_id, created_at
    from credit_payments where business_id = ${businessId} and customer_id = ${customerId} order by created_at`;
  return {
    customer: mapCustomer(customers[0]),
    sales: sales.map((row) => ({
      id: String(row.id),
      number: String(row.number),
      kind: String(row.kind),
      totalCents: num(row.total_cents),
      creditCents: num(row.credit_cents),
      dueOn: row.due_on ? String(row.due_on).slice(0, 10) : null,
      createdAt: String(row.created_at),
    })),
    payments: payments.map((row) => ({
      id: String(row.id),
      amountCents: num(row.amount_cents),
      method: String(row.method),
      receiptNumber: String(row.receipt_number),
      note: String(row.note ?? ""),
      reversesId: (row.reverses_id as string | null) ?? null,
      createdAt: String(row.created_at),
    })),
  };
}

export async function postAbono(
  userId: string,
  input: {
    businessId: string;
    branchId: string;
    customerId: string;
    amountCents: number;
    method: "cash" | "transfer";
    reference: string;
    note: string;
    clientId: string;
  },
) {
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) throw new Error("Monto de abono inválido");
  return withTx(async (sql) => {
    const who = await member(sql, userId, input.businessId);
    assertCap(who, "credit");
    const dup = await sql<{ id: string; receipt_number: string }>`
      select id, receipt_number from credit_payments
      where business_id = ${input.businessId} and client_id = ${input.clientId}`;
    if (dup[0]) return { id: dup[0].id, receipt: dup[0].receipt_number, idempotent: true };
    const customers = await sql<{ balance_cents: number; name: string }>`
      select balance_cents, name from customers where id = ${input.customerId} and business_id = ${input.businessId} for update`;
    const customer = customers[0];
    if (!customer) throw new Error("Cliente no encontrado");
    if (input.amountCents > num(customer.balance_cents)) throw new Error("El abono es mayor que el saldo");
    const session = input.method === "cash" ? await needDrawer(sql, input.businessId, input.branchId, userId) : null;
    const id = crypto.randomUUID();
    const receipt = await nextReceipt(sql, input.businessId);
    await sql`
      insert into credit_payments (
        id, business_id, customer_id, amount_cents, method, reference, receipt_number, note, client_id, created_by
      ) values (
        ${id}, ${input.businessId}, ${input.customerId}, ${input.amountCents}, ${input.method}, ${input.reference.trim()},
        ${receipt}, ${input.note.trim()}, ${input.clientId}, ${userId}
      )`;
    await sql`update customers set balance_cents = balance_cents - ${input.amountCents} where id = ${input.customerId}`;
    await drawerMove(sql, session, input.businessId, "abono", input.method === "cash" ? input.amountCents : 0, receipt, id);
    await postJournal(sql, {
      businessId: input.businessId,
      userId,
      memo: `Abono ${receipt} · ${customer.name}`,
      source: "abono",
      sourceId: id,
      lines: [
        { key: input.method === "cash" ? "caja" : "bancos", debitCents: input.amountCents },
        { key: "cxc", creditCents: input.amountCents },
      ],
    });
    await audit(sql, input.businessId, userId, "abonar", "cliente", input.customerId, receipt);
    return { id, receipt, idempotent: false };
  });
}

export async function reverseAbono(userId: string, businessId: string, paymentId: string, note: string) {
  if (note.trim().length < 3) throw new Error("Escriba el motivo de la reversión");
  return withTx(async (sql) => {
    const who = await member(sql, userId, businessId);
    if (who.role !== "owner" && who.role !== "admin") throw new Error("Solo propietario o administrador puede revertir un abono");
    const rows = await sql<{ id: string; customer_id: string; amount_cents: number; method: string; reverses_id: string | null }>`
      select id, customer_id, amount_cents, method, reverses_id from credit_payments
      where id = ${paymentId} and business_id = ${businessId} for update`;
    const pay = rows[0];
    if (!pay || pay.reverses_id || pay.method === "return") throw new Error("Ese abono no se puede revertir");
    const prior = await sql`select id from credit_payments where reverses_id = ${pay.id}`;
    if (prior.length) throw new Error("Ese abono ya fue revertido");
    const amount = num(pay.amount_cents);
    const id = crypto.randomUUID();
    const receipt = await nextReceipt(sql, businessId);
    await sql`
      insert into credit_payments (
        id, business_id, customer_id, amount_cents, method, receipt_number, note, reverses_id, created_by
      ) values (
        ${id}, ${businessId}, ${pay.customer_id}, ${amount}, ${pay.method}, ${receipt}, ${note.trim()}, ${pay.id}, ${userId}
      )`;
    await sql`update customers set balance_cents = balance_cents + ${amount} where id = ${pay.customer_id}`;
    await postJournal(sql, {
      businessId,
      userId,
      memo: `Reversión ${receipt}`,
      source: "abono_reverso",
      sourceId: id,
      lines: [
        { key: "cxc", debitCents: amount },
        { key: pay.method === "cash" ? "caja" : "bancos", creditCents: amount },
      ],
    });
    await audit(sql, businessId, userId, "revertir", "abono", pay.id, note.trim());
    return receipt;
  });
}

export async function listSuppliers(userId: string, businessId: string) {
  const sql = await db();
  await member(sql, userId, businessId);
  const rows = await sql<Record<string, unknown>>`
    select * from suppliers where business_id = ${businessId} order by name`;
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    contact: String(row.contact ?? ""),
    phone: String(row.phone ?? ""),
    address: String(row.address ?? ""),
    taxId: String(row.tax_id ?? ""),
    terms: String(row.terms ?? ""),
    balanceCents: num(row.balance_cents),
    notes: String(row.notes ?? ""),
  }));
}

export async function saveSupplier(
  userId: string,
  input: {
    businessId: string;
    id?: string;
    name: string;
    contact: string;
    phone: string;
    address: string;
    taxId: string;
    terms: string;
    notes: string;
  },
) {
  const name = input.name.trim();
  if (name.length < 2) throw new Error("Escriba el nombre del proveedor");
  return withTx(async (sql) => {
    const who = await member(sql, userId, input.businessId);
    assertCap(who, "purchases");
    if (input.id) {
      await sql`
        update suppliers set name = ${name}, contact = ${input.contact.trim()}, phone = ${input.phone.trim()},
          address = ${input.address.trim()}, tax_id = ${input.taxId.trim()}, terms = ${input.terms.trim()}, notes = ${input.notes.trim()}
        where id = ${input.id} and business_id = ${input.businessId}`;
      return input.id;
    }
    const id = crypto.randomUUID();
    await sql`
      insert into suppliers (id, business_id, name, contact, phone, address, tax_id, terms, notes)
      values (${id}, ${input.businessId}, ${name}, ${input.contact.trim()}, ${input.phone.trim()}, ${input.address.trim()},
        ${input.taxId.trim()}, ${input.terms.trim()}, ${input.notes.trim()})`;
    return id;
  });
}

export async function receivePurchase(
  userId: string,
  input: {
    businessId: string;
    branchId: string;
    supplierId: string | null;
    number: string;
    method: "cash" | "transfer" | "credit";
    freightCents: number;
    note: string;
    lines: { productId: string; qty: number; unitCostCents: number }[];
  },
) {
  if (!input.lines.length) throw new Error("Agregue productos a la compra");
  if (input.freightCents < 0) throw new Error("El flete no puede ser negativo");
  return withTx(async (sql) => {
    const who = await member(sql, userId, input.businessId);
    assertCap(who, "purchases");
    let merchandise = 0;
    const ready: { productId: string; name: string; qty: number; unitCostCents: number; oldQty: number; oldCost: number }[] = [];
    for (const line of input.lines) {
      if (!Number.isInteger(line.qty) || line.qty <= 0 || line.unitCostCents < 0) throw new Error("Línea de compra inválida");
      const stock = await stockOf(sql, line.productId, input.branchId);
      const products = await sql<{ name: string; cost_cents: number }>`
        select name, cost_cents from products where id = ${line.productId} and business_id = ${input.businessId}`;
      if (!products[0] || stock == null) throw new Error("Producto de la compra no encontrado");
      merchandise += line.qty * line.unitCostCents;
      ready.push({
        productId: line.productId,
        name: products[0].name,
        qty: line.qty,
        unitCostCents: line.unitCostCents,
        oldQty: stock,
        oldCost: num(products[0].cost_cents),
      });
    }
    const total = merchandise + input.freightCents;
    if (input.method === "credit" && !input.supplierId) throw new Error("La compra a crédito requiere proveedor");
    const session = input.method === "cash" ? await needDrawer(sql, input.businessId, input.branchId, userId) : null;
    const purchaseId = crypto.randomUUID();
    await sql`
      insert into purchases (id, business_id, branch_id, supplier_id, number, subtotal_cents, freight_cents, total_cents, method, note, created_by)
      values (
        ${purchaseId}, ${input.businessId}, ${input.branchId}, ${input.supplierId}, ${input.number.trim()},
        ${merchandise}, ${input.freightCents}, ${total}, ${input.method}, ${input.note.trim()}, ${userId}
      )`;
    const weights = ready.map((line) => line.qty * line.unitCostCents);
    const freightParts = weights.map((weight, index) => {
      if (merchandise === 0) return index === 0 ? input.freightCents : 0;
      return Math.floor((input.freightCents * weight) / merchandise);
    });
    const assigned = freightParts.reduce((s, n) => s + n, 0);
    if (freightParts.length) freightParts[0] += input.freightCents - assigned;
    for (let i = 0; i < ready.length; i += 1) {
      const line = ready[i];
      const inbound = line.qty * line.unitCostCents + freightParts[i];
      const newQty = line.oldQty + line.qty;
      const newCost = newQty > 0 ? Math.round((line.oldQty * line.oldCost + inbound) / newQty) : line.unitCostCents;
      await sql`update products set cost_cents = ${newCost}, updated_at = now() where id = ${line.productId}`;
      await setStock(sql, line.productId, input.branchId, newQty);
      await sql`
        insert into purchase_items (id, purchase_id, product_id, name, qty, unit_cost_cents)
        values (${crypto.randomUUID()}, ${purchaseId}, ${line.productId}, ${line.name}, ${line.qty}, ${line.unitCostCents})`;
      await movement(sql, input.businessId, line.productId, input.branchId, line.qty, "Compra", "purchase", purchaseId, input.number, userId);
    }
    if (input.method === "credit" && input.supplierId) {
      await sql`update suppliers set balance_cents = balance_cents + ${total} where id = ${input.supplierId}`;
    }
    await drawerMove(sql, session, input.businessId, "purchase", input.method === "cash" ? total : 0, input.number || "Compra", purchaseId);
    const creditKey = input.method === "credit" ? "cxp" : input.method === "cash" ? "caja" : "bancos";
    await postJournal(sql, {
      businessId: input.businessId,
      userId,
      memo: `Compra ${input.number || purchaseId.slice(0, 8)}`,
      source: "purchase",
      sourceId: purchaseId,
      lines: [
        { key: "inventario", debitCents: total },
        { key: creditKey, creditCents: total },
      ],
    });
    await audit(sql, input.businessId, userId, "comprar", "compra", purchaseId, input.number);
    return purchaseId;
  });
}

export async function listPurchases(userId: string, businessId: string) {
  const sql = await db();
  await member(sql, userId, businessId);
  const rows = await sql<Record<string, unknown>>`
    select p.id, p.number, p.total_cents, p.method, p.created_at, coalesce(s.name, 'Sin proveedor') as supplier_name
    from purchases p
    left join suppliers s on s.id = p.supplier_id
    where p.business_id = ${businessId}
    order by p.created_at desc limit 80`;
  return rows.map((row) => ({
    id: String(row.id),
    number: String(row.number ?? ""),
    totalCents: num(row.total_cents),
    method: String(row.method),
    createdAt: String(row.created_at),
    supplierName: String(row.supplier_name),
  }));
}

export async function paySupplier(
  userId: string,
  input: { businessId: string; branchId: string; supplierId: string; amountCents: number; method: "cash" | "transfer"; note: string },
) {
  if (input.amountCents <= 0) throw new Error("Monto inválido");
  return withTx(async (sql) => {
    const who = await member(sql, userId, input.businessId);
    assertCap(who, "purchases");
    const rows = await sql<{ balance_cents: number; name: string }>`
      select balance_cents, name from suppliers where id = ${input.supplierId} and business_id = ${input.businessId} for update`;
    const supplier = rows[0];
    if (!supplier) throw new Error("Proveedor no encontrado");
    if (input.amountCents > num(supplier.balance_cents)) throw new Error("El pago supera la cuenta por pagar");
    const session = input.method === "cash" ? await needDrawer(sql, input.businessId, input.branchId, userId) : null;
    await sql`update suppliers set balance_cents = balance_cents - ${input.amountCents} where id = ${input.supplierId}`;
    const id = crypto.randomUUID();
    await drawerMove(sql, session, input.businessId, "out", input.method === "cash" ? input.amountCents : 0, "Pago proveedor", id);
    await postJournal(sql, {
      businessId: input.businessId,
      userId,
      memo: `Pago a ${supplier.name}`,
      source: "supplier_payment",
      sourceId: id,
      lines: [
        { key: "cxp", debitCents: input.amountCents },
        { key: input.method === "cash" ? "caja" : "bancos", creditCents: input.amountCents },
      ],
    });
    await audit(sql, input.businessId, userId, "pagar", "proveedor", input.supplierId, input.note.trim());
    return id;
  });
}

export async function saveExpense(
  userId: string,
  input: {
    businessId: string;
    branchId: string;
    accountKey: string;
    amountCents: number;
    method: "cash" | "transfer";
    payee: string;
    note: string;
    receipt: string | null;
    spentOn: string;
  },
) {
  const allowed = new Set(["gastos", "salarios", "servicios", "intereses", "merma"]);
  if (!allowed.has(input.accountKey)) throw new Error("Tipo de gasto no válido");
  if (input.amountCents <= 0) throw new Error("Monto de gasto inválido");
  return withTx(async (sql) => {
    const who = await member(sql, userId, input.businessId);
    assertCap(who, "expenses");
    const session = input.method === "cash" ? await needDrawer(sql, input.businessId, input.branchId, userId) : null;
    const id = crypto.randomUUID();
    await sql`
      insert into expenses (id, business_id, branch_id, account_key, amount_cents, method, payee, note, receipt, spent_on, created_by)
      values (
        ${id}, ${input.businessId}, ${input.branchId}, ${input.accountKey}, ${input.amountCents}, ${input.method},
        ${input.payee.trim()}, ${input.note.trim()}, ${cleanPhoto(input.receipt, "El comprobante")}, ${input.spentOn}, ${userId}
      )`;
    await drawerMove(sql, session, input.businessId, "expense", input.method === "cash" ? input.amountCents : 0, input.payee || "Gasto", id);
    await postJournal(sql, {
      businessId: input.businessId,
      userId,
      memo: input.payee.trim() || "Gasto",
      source: "expense",
      sourceId: id,
      lines: [
        { key: input.accountKey, debitCents: input.amountCents },
        { key: input.method === "cash" ? "caja" : "bancos", creditCents: input.amountCents },
      ],
    });
    await audit(sql, input.businessId, userId, "gastar", "gasto", id, input.payee.trim());
    return id;
  });
}

export async function listExpenses(userId: string, businessId: string) {
  const sql = await db();
  await member(sql, userId, businessId);
  const rows = await sql<Record<string, unknown>>`
    select id, account_key, amount_cents, method, payee, note, spent_on, created_at
    from expenses where business_id = ${businessId} order by spent_on desc, created_at desc limit 100`;
  return rows.map((row) => ({
    id: String(row.id),
    accountKey: String(row.account_key),
    amountCents: num(row.amount_cents),
    method: String(row.method),
    payee: String(row.payee ?? ""),
    note: String(row.note ?? ""),
    spentOn: String(row.spent_on).slice(0, 10),
    createdAt: String(row.created_at),
  }));
}

export async function cashState(userId: string, businessId: string, branchId: string) {
  const sql = await db();
  await member(sql, userId, businessId);
  const rows = await sql<{ id: string; opening_cents: number; opened_at: string }>`
    select id, opening_cents, opened_at from cash_sessions
    where business_id = ${businessId} and branch_id = ${branchId} and user_id = ${userId} and status = 'open' limit 1`;
  const open = rows[0];
  if (!open) return { open: false as const };
  const expected = await drawerExpected(sql, open.id, num(open.opening_cents));
  const moves = await sql<{ kind: string; amount_cents: number; note: string; created_at: string }>`
    select kind, amount_cents, note, created_at from cash_movements where session_id = ${open.id} order by created_at`;
  return {
    open: true as const,
    sessionId: open.id,
    openingCents: num(open.opening_cents),
    expectedCents: expected,
    openedAt: open.opened_at,
    movements: moves.map((row) => ({
      kind: row.kind,
      amountCents: num(row.amount_cents),
      note: row.note,
      createdAt: row.created_at,
    })),
  };
}

export async function openCash(userId: string, businessId: string, branchId: string, openingCents: number) {
  if (openingCents < 0) throw new Error("El fondo inicial no puede ser negativo");
  return withTx(async (sql) => {
    const who = await member(sql, userId, businessId);
    assertCap(who, "cash");
    const existing = await openDrawer(sql, businessId, branchId, userId);
    if (existing) throw new Error("Ya tiene una caja abierta en esta sucursal");
    const id = crypto.randomUUID();
    await sql`
      insert into cash_sessions (id, business_id, branch_id, user_id, opening_cents, status)
      values (${id}, ${businessId}, ${branchId}, ${userId}, ${openingCents}, 'open')`;
    await audit(sql, businessId, userId, "abrir", "caja", id, String(openingCents));
    return id;
  });
}

export async function cashMove(
  userId: string,
  input: { businessId: string; branchId: string; direction: "in" | "out"; amountCents: number; note: string },
) {
  if (input.amountCents <= 0) throw new Error("Monto inválido");
  if (input.note.trim().length < 3) throw new Error("Escriba el motivo");
  return withTx(async (sql) => {
    const who = await member(sql, userId, input.businessId);
    assertCap(who, "cash");
    const session = await needDrawer(sql, input.businessId, input.branchId, userId);
    const id = crypto.randomUUID();
    await drawerMove(sql, session, input.businessId, input.direction, input.amountCents, input.note.trim(), id);
    await postJournal(sql, {
      businessId: input.businessId,
      userId,
      memo: input.note.trim(),
      source: "cash_move",
      sourceId: id,
      lines:
        input.direction === "in"
          ? [
              { key: "caja", debitCents: input.amountCents },
              { key: "capital", creditCents: input.amountCents },
            ]
          : [
              { key: "retiros", debitCents: input.amountCents },
              { key: "caja", creditCents: input.amountCents },
            ],
    });
    return id;
  });
}

export async function closeCash(userId: string, businessId: string, branchId: string, countedCents: number, note: string) {
  if (countedCents < 0) throw new Error("El arqueo no puede ser negativo");
  return withTx(async (sql) => {
    const who = await member(sql, userId, businessId);
    assertCap(who, "cash");
    const rows = await sql<{ id: string; opening_cents: number }>`
      select id, opening_cents from cash_sessions
      where business_id = ${businessId} and branch_id = ${branchId} and user_id = ${userId} and status = 'open'
      for update`;
    const session = rows[0];
    if (!session) throw new Error("No hay una caja abierta");
    const expected = await drawerExpected(sql, session.id, num(session.opening_cents));
    const difference = countedCents - expected;
    if (difference !== 0) {
      await postJournal(sql, {
        businessId,
        userId,
        memo: difference < 0 ? "Faltante de caja" : "Sobrante de caja",
        source: "cash_close",
        sourceId: session.id,
        lines:
          difference < 0
            ? [
                { key: "merma", debitCents: -difference },
                { key: "caja", creditCents: -difference },
              ]
            : [
                { key: "caja", debitCents: difference },
                { key: "otros_ingresos", creditCents: difference },
              ],
      });
    }
    await sql`
      update cash_sessions set status = 'closed', closing_cents = ${countedCents}, expected_cents = ${expected},
        difference_cents = ${difference}, note = ${note.trim()}, closed_at = now()
      where id = ${session.id}`;
    await audit(sql, businessId, userId, "cerrar", "caja", session.id, `dif ${difference}`);
    return { expectedCents: expected, differenceCents: difference };
  });
}

export async function listLoans(userId: string, businessId: string) {
  const sql = await db();
  await member(sql, userId, businessId);
  const rows = await sql<Record<string, unknown>>`select * from loans where business_id = ${businessId} order by created_at desc`;
  return rows.map((row) => ({
    id: String(row.id),
    direction: String(row.direction),
    counterparty: String(row.counterparty),
    principalCents: num(row.principal_cents),
    balanceCents: num(row.balance_cents),
    rateBps: num(row.rate_bps),
    startDate: String(row.start_date).slice(0, 10),
    termMonths: num(row.term_months),
    frequency: String(row.frequency),
    installmentCents: num(row.installment_cents),
    collateral: String(row.collateral ?? ""),
    note: String(row.note ?? ""),
  }));
}

export async function createLoan(
  userId: string,
  input: {
    businessId: string;
    branchId: string;
    direction: "received" | "granted";
    counterparty: string;
    principalCents: number;
    rateBps: number;
    startDate: string;
    termMonths: number;
    frequency: string;
    collateral: string;
    note: string;
    method: "cash" | "transfer";
  },
) {
  if (input.principalCents <= 0 || input.termMonths <= 0) throw new Error("Capital y plazo son obligatorios");
  if (input.counterparty.trim().length < 2) throw new Error("Escriba quién presta o debe");
  const interest = Math.round((input.principalCents * input.rateBps * input.termMonths) / 10000 / 12);
  const installment = Math.round((input.principalCents + interest) / input.termMonths);
  return withTx(async (sql) => {
    const who = await member(sql, userId, input.businessId);
    assertCap(who, "accounting");
    const session = input.method === "cash" ? await needDrawer(sql, input.businessId, input.branchId, userId) : null;
    const id = crypto.randomUUID();
    await sql`
      insert into loans (
        id, business_id, direction, counterparty, principal_cents, balance_cents, rate_bps, start_date,
        term_months, frequency, installment_cents, collateral, note, method, created_by
      ) values (
        ${id}, ${input.businessId}, ${input.direction}, ${input.counterparty.trim()}, ${input.principalCents},
        ${input.principalCents}, ${input.rateBps}, ${input.startDate}, ${input.termMonths}, ${input.frequency},
        ${installment}, ${input.collateral.trim()}, ${input.note.trim()}, ${input.method}, ${userId}
      )`;
    if (input.direction === "received") {
      await drawerMove(sql, session, input.businessId, "loan_in", input.method === "cash" ? input.principalCents : 0, "Préstamo recibido", id);
      await postJournal(sql, {
        businessId: input.businessId,
        userId,
        memo: `Préstamo recibido · ${input.counterparty.trim()}`,
        source: "loan",
        sourceId: id,
        lines: [
          { key: input.method === "cash" ? "caja" : "bancos", debitCents: input.principalCents },
          { key: "prestamos", creditCents: input.principalCents },
        ],
      });
    } else {
      await drawerMove(sql, session, input.businessId, "loan_out", input.method === "cash" ? input.principalCents : 0, "Préstamo otorgado", id);
      await postJournal(sql, {
        businessId: input.businessId,
        userId,
        memo: `Préstamo otorgado · ${input.counterparty.trim()}`,
        source: "loan",
        sourceId: id,
        lines: [
          { key: "prestamos_otorgados", debitCents: input.principalCents },
          { key: input.method === "cash" ? "caja" : "bancos", creditCents: input.principalCents },
        ],
      });
    }
    return { id, installmentCents: installment };
  });
}

export async function payLoan(
  userId: string,
  input: {
    businessId: string;
    branchId: string;
    loanId: string;
    principalCents: number;
    interestCents: number;
    method: "cash" | "transfer";
    note: string;
  },
) {
  if (input.principalCents < 0 || input.interestCents < 0) throw new Error("Montos inválidos");
  if (input.principalCents + input.interestCents <= 0) throw new Error("Indique capital o interés");
  return withTx(async (sql) => {
    const who = await member(sql, userId, input.businessId);
    assertCap(who, "accounting");
    const rows = await sql<{ balance_cents: number; direction: string; counterparty: string }>`
      select balance_cents, direction, counterparty from loans where id = ${input.loanId} and business_id = ${input.businessId} for update`;
    const loan = rows[0];
    if (!loan) throw new Error("Préstamo no encontrado");
    if (input.principalCents > num(loan.balance_cents)) throw new Error("El capital supera el saldo del préstamo");
    const session = input.method === "cash" ? await needDrawer(sql, input.businessId, input.branchId, userId) : null;
    const id = crypto.randomUUID();
    await sql`
      insert into loan_payments (id, loan_id, business_id, principal_cents, interest_cents, method, note, created_by)
      values (${id}, ${input.loanId}, ${input.businessId}, ${input.principalCents}, ${input.interestCents}, ${input.method}, ${input.note.trim()}, ${userId})`;
    await sql`update loans set balance_cents = balance_cents - ${input.principalCents} where id = ${input.loanId}`;
    const cash = input.principalCents + input.interestCents;
    if (loan.direction === "received") {
      await drawerMove(sql, session, input.businessId, "loan_out", input.method === "cash" ? cash : 0, "Pago de préstamo", id);
      await postJournal(sql, {
        businessId: input.businessId,
        userId,
        memo: `Pago préstamo · ${loan.counterparty}`,
        source: "loan_payment",
        sourceId: id,
        lines: [
          { key: "prestamos", debitCents: input.principalCents },
          { key: "intereses", debitCents: input.interestCents },
          { key: input.method === "cash" ? "caja" : "bancos", creditCents: cash },
        ],
      });
    } else {
      await drawerMove(sql, session, input.businessId, "loan_in", input.method === "cash" ? cash : 0, "Cobro de préstamo", id);
      await postJournal(sql, {
        businessId: input.businessId,
        userId,
        memo: `Cobro préstamo · ${loan.counterparty}`,
        source: "loan_payment",
        sourceId: id,
        lines: [
          { key: input.method === "cash" ? "caja" : "bancos", debitCents: cash },
          { key: "prestamos_otorgados", creditCents: input.principalCents },
          { key: "intereses_ingreso", creditCents: input.interestCents },
        ],
      });
    }
    return id;
  });
}

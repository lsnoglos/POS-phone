import { createServer } from "vite";

const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});

function fail(message) {
  console.error("FAIL", message);
  process.exitCode = 1;
}

try {
  const insight = await vite.ssrLoadModule("/src/lib/nexo/insight.ts");
  const commerce = await vite.ssrLoadModule("/src/lib/nexo/commerce.ts");
  const store = await vite.ssrLoadModule("/src/lib/nexo/store.ts");
  const dbmod = await vite.ssrLoadModule("/src/lib/db.ts");
  const userId = "selftest-user";
  const businessId = await insight.createDemo(userId, "Prueba");
  const sql = await dbmod.getSql();
  const branches = await sql`select id from branches where business_id = ${businessId}`;
  const branchId = branches[0].id;
  const unbalanced = await sql`
    select e.memo, sum(l.debit_cents) as d, sum(l.credit_cents) as c
    from journal_entries e
    join journal_lines l on l.entry_id = e.id
    where e.business_id = ${businessId}
    group by e.id, e.memo
    having sum(l.debit_cents) <> sum(l.credit_cents)`;
  if (unbalanced.length) fail(`asientos descuadrados ${JSON.stringify(unbalanced)}`);
  const stock = await sql`
    select p.name, s.qty from stocks s join products p on p.id = s.product_id
    where p.business_id = ${businessId}`;
  const qty = Object.fromEntries(stock.map((row) => [row.name, Number(row.qty)]));
  if (qty["DEMO · Gaseosa 500 ml"] !== 22) fail(`gaseosa ${qty["DEMO · Gaseosa 500 ml"]}`);
  if (qty["DEMO · Arroz 2 lb"] !== 19) fail(`arroz ${qty["DEMO · Arroz 2 lb"]}`);
  if (qty["DEMO · Jabón de lavar"] !== 0) fail(`jabon ${qty["DEMO · Jabón de lavar"]}`);
  const customers = await sql`select id, balance_cents from customers where business_id = ${businessId}`;
  if (Number(customers[0].balance_cents) !== 8600) fail(`saldo ${customers[0].balance_cents}`);
  const dash = await insight.dashboard(userId, businessId, branchId);
  if (dash.salesToday < 3600) fail(`ventas hoy ${dash.salesToday}`);
  const fin = await insight.financials(userId, businessId, "2000-01-01", "2100-01-01");
  const equation = fin.assets - fin.liabilities - fin.equity - fin.accumulated;
  if (equation !== 0) fail(`ecuacion ${equation} assets=${fin.assets} liab=${fin.liabilities} eq=${fin.equity} acc=${fin.accumulated}`);
  const journal = await insight.listJournal(userId, businessId);
  if (!journal.length) fail("diario vacio");
  const products = await store.listProducts(userId, businessId, branchId, "");
  const soda = products.find((row) => row.name.includes("Gaseosa"));
  const clientId = crypto.randomUUID();
  const first = await commerce.checkout(userId, {
    businessId,
    branchId,
    clientId,
    customerId: null,
    orderDiscountCents: 0,
    cashTenderedCents: 2000,
    note: "prueba",
    lines: [{ productId: soda.id, qty: 1, unitPriceCents: 1800, discountCents: 0 }],
    payments: [{ method: "cash", amountCents: 1800, confirmed: true }],
  });
  const second = await commerce.checkout(userId, {
    businessId,
    branchId,
    clientId,
    customerId: null,
    orderDiscountCents: 0,
    cashTenderedCents: 2000,
    note: "prueba",
    lines: [{ productId: soda.id, qty: 1, unitPriceCents: 1800, discountCents: 0 }],
    payments: [{ method: "cash", amountCents: 1800, confirmed: true }],
  });
  if (!second.idempotent || second.saleId !== first.saleId) fail("idempotencia");
  let blocked = false;
  try {
    await commerce.checkout(userId, {
      businessId,
      branchId,
      clientId: crypto.randomUUID(),
      customerId: null,
      orderDiscountCents: 0,
      cashTenderedCents: 0,
      note: "",
      lines: [{ productId: soda.id, qty: 999, unitPriceCents: 1800, discountCents: 0 }],
      payments: [{ method: "cash", amountCents: 999 * 1800, confirmed: true }],
    });
  } catch (error) {
    blocked = String(error.message).includes("insuficiente");
  }
  if (!blocked) fail("debio bloquear existencia negativa");
  const expiredId = await store.saveProduct(userId, {
    businessId,
    branchId,
    name: "DEMO · Vencido",
    description: "prueba",
    photo: null,
    category: "Abarrotes",
    subcategory: "",
    brand: "DEMO",
    sku: "",
    barcode: "",
    costCents: 100,
    priceCents: 200,
    wholesaleCents: 150,
    promoCents: null,
    promoUntil: null,
    volumePrices: [],
    taxExempt: false,
    regulated: false,
    minQty: 0,
    unit: "unidad",
    supplierId: null,
    expiresOn: "2000-01-01",
    lotCode: "X",
    location: "",
    active: true,
    favorite: false,
    parentId: null,
    variantLabel: "",
    initialQty: 3,
  });
  let expiredBlocked = false;
  try {
    await commerce.checkout(userId, {
      businessId,
      branchId,
      clientId: crypto.randomUUID(),
      customerId: null,
      orderDiscountCents: 0,
      cashTenderedCents: 200,
      note: "",
      lines: [{ productId: expiredId, qty: 1, unitPriceCents: 200, discountCents: 0 }],
      payments: [{ method: "cash", amountCents: 200, confirmed: true }],
    });
  } catch (error) {
    expiredBlocked = String(error.message).includes("vencido");
  }
  if (!expiredBlocked) fail("debio bloquear vencido");
  const pending = await commerce.checkout(userId, {
    businessId,
    branchId,
    clientId: crypto.randomUUID(),
    customerId: null,
    orderDiscountCents: 0,
    cashTenderedCents: 0,
    note: "transferencia",
    lines: [{ productId: soda.id, qty: 1, unitPriceCents: 1800, discountCents: 0 }],
    payments: [{ method: "transfer", amountCents: 1800, reference: "REF-1", confirmed: false }],
  });
  const pays = await commerce.listPendingPayments(userId, businessId);
  const pay = pays.find((row) => row.number === pending.number);
  if (!pay) fail("pago pendiente no listado");
  await commerce.confirmPayment(userId, businessId, pay.id);
  const still = await commerce.listPendingPayments(userId, businessId);
  if (still.some((row) => row.id === pay.id)) fail("pago sigue pendiente");
  const after = await sql`
    select e.memo, sum(l.debit_cents) as d, sum(l.credit_cents) as c
    from journal_entries e join journal_lines l on l.entry_id = e.id
    where e.business_id = ${businessId}
    group by e.id, e.memo
    having sum(l.debit_cents) <> sum(l.credit_cents)`;
  if (after.length) fail(`descuadre final ${JSON.stringify(after)}`);
  const fin2 = await insight.financials(userId, businessId, "2000-01-01", "2100-01-01");
  const eq2 = fin2.assets - fin2.liabilities - fin2.equity - fin2.accumulated;
  if (eq2 !== 0) fail(`ecuacion final ${eq2}`);
  console.log("OK", {
    businessId,
    soda: qty["DEMO · Gaseosa 500 ml"],
    balance: Number(customers[0].balance_cents),
    assets: fin2.assets,
    net: fin2.net,
    journal: journal.length,
  });
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await vite.close();
}

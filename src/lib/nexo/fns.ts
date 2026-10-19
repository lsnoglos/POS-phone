import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";

function parse<T>(schema: z.ZodType<T>) {
  return (input: unknown): T => {
    const result = schema.safeParse(input);
    if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Datos inválidos");
    return result.data;
  };
}

async function run<T>(work: () => Promise<T>) {
  try {
    return { ok: true as const, data: await work() };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    if (message === "Unauthorized") throw error;
    return { ok: false as const, error: message };
  }
}

const id = z.string().min(8, "Falta el negocio");
const cents = z.number().int().min(0);
const biz = z.object({ businessId: id });

export const listBusinessesFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { listBusinesses } = await import("./store");
    return listBusinesses(context.userId);
  });

const businessInput = z.object({
  name: z.string().min(2, "Escriba el nombre del negocio"),
  address: z.string(),
  phone: z.string(),
  taxId: z.string(),
  businessType: z.string(),
  currency: z.string(),
  timezone: z.string(),
  displayName: z.string(),
  logo: z.string().max(280_000).nullable(),
  useLogoColors: z.boolean(),
  accentColor: z.string().max(7),
});

export const createBusinessFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(businessInput))
  .handler(async ({ context, data }) => {
    const { createBusiness } = await import("./store");
    return run(() => createBusiness(context.userId, data));
  });

export const updateBusinessFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    parse(
      businessInput.omit({ displayName: true }).extend({
        businessId: id,
        invoicePrefix: z.string(),
        taxRateBps: z.number().int().min(0).max(3000),
        creditDays: z.number().int().min(0).max(180),
        allowNegativeStock: z.boolean(),
      }),
    ),
  )
  .handler(async ({ context, data }) => {
    const { updateBusiness } = await import("./store");
    return run(() => updateBusiness(context.userId, data));
  });

export const deleteBusinessFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(z.object({ businessId: id, confirmName: z.string() })))
  .handler(async ({ context, data }) => {
    const { deleteBusiness } = await import("./store");
    return run(() => deleteBusiness(context.userId, data.businessId, data.confirmName));
  });

export const createDemoFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(z.object({ displayName: z.string() })))
  .handler(async ({ context, data }) => {
    const { createDemo } = await import("./insight");
    return run(() => createDemo(context.userId, data.displayName));
  });

export const listMembersFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz))
  .handler(async ({ context, data }) => {
    const { listMembers } = await import("./store");
    return listMembers(context.userId, data.businessId);
  });

export const createInviteFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz.extend({ role: z.string() })))
  .handler(async ({ context, data }) => {
    const { createInvite } = await import("./store");
    return run(() => createInvite(context.userId, data.businessId, data.role));
  });

export const acceptInviteFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(z.object({ code: z.string().min(4), displayName: z.string() })))
  .handler(async ({ context, data }) => {
    const { acceptInvite } = await import("./store");
    return run(() => acceptInvite(context.userId, data.code, data.displayName));
  });

export const updateCapsFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz.extend({ memberId: id, caps: z.array(z.string()) })))
  .handler(async ({ context, data }) => {
    const { updateMemberCaps } = await import("./store");
    return run(() => updateMemberCaps(context.userId, data.businessId, data.memberId, data.caps));
  });

export const createBranchFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz.extend({ name: z.string() })))
  .handler(async ({ context, data }) => {
    const { createBranch } = await import("./store");
    return run(() => createBranch(context.userId, data.businessId, data.name));
  });

export const transferFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    parse(
      biz.extend({
        fromBranchId: id,
        toBranchId: id,
        productId: id,
        qty: z.number().int().positive(),
        note: z.string(),
      }),
    ),
  )
  .handler(async ({ context, data }) => {
    const { transferStock } = await import("./store");
    return run(() => transferStock(context.userId, data));
  });

export const listProductsFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz.extend({ branchId: id, query: z.string() })))
  .handler(async ({ context, data }) => {
    const { listProducts } = await import("./store");
    return listProducts(context.userId, data.businessId, data.branchId, data.query);
  });

export const listCategoriesFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz))
  .handler(async ({ context, data }) => {
    const { listCategories } = await import("./store");
    return listCategories(context.userId, data.businessId);
  });

const productInput = z.object({
  businessId: id,
  branchId: id,
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  photo: z.string().nullable(),
  category: z.string(),
  subcategory: z.string(),
  brand: z.string(),
  sku: z.string(),
  barcode: z.string(),
  costCents: cents,
  priceCents: cents,
  wholesaleCents: cents,
  promoCents: cents.nullable(),
  promoUntil: z.string().nullable(),
  volumePrices: z.array(z.object({ minQty: z.number().int(), priceCents: cents })),
  taxExempt: z.boolean(),
  regulated: z.boolean(),
  minQty: z.number().int().min(0),
  unit: z.string(),
  supplierId: z.string().nullable(),
  expiresOn: z.string().nullable(),
  lotCode: z.string(),
  location: z.string(),
  active: z.boolean(),
  favorite: z.boolean(),
  parentId: z.string().nullable(),
  variantLabel: z.string(),
  initialQty: z.number().int().min(0),
});

export const saveProductFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(productInput))
  .handler(async ({ context, data }) => {
    const { saveProduct } = await import("./store");
    return run(() => saveProduct(context.userId, data));
  });

export const adjustStockFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    parse(
      biz.extend({
        branchId: id,
        productId: id,
        qtyDelta: z.number().int(),
        reason: z.string(),
        note: z.string(),
      }),
    ),
  )
  .handler(async ({ context, data }) => {
    const { adjustStock } = await import("./store");
    return run(() => adjustStock(context.userId, data));
  });

export const listMovementsFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz))
  .handler(async ({ context, data }) => {
    const { listMovements } = await import("./store");
    return listMovements(context.userId, data.businessId);
  });

export const bulkPriceFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    parse(
      biz.extend({
        categoryId: z.string().nullable(),
        field: z.enum(["price", "wholesale", "cost"]),
        percentBps: z.number().int(),
      }),
    ),
  )
  .handler(async ({ context, data }) => {
    const { bulkPrice } = await import("./store");
    return run(() => bulkPrice(context.userId, data));
  });

export const importProductsFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    parse(
      biz.extend({
        branchId: id,
        rows: z.array(
          z.object({
            name: z.string(),
            priceCents: cents,
            costCents: cents,
            qty: z.number().int().min(0),
            barcode: z.string(),
            category: z.string(),
            unit: z.string(),
            minQty: z.number().int().min(0),
            sku: z.string(),
          }),
        ),
      }),
    ),
  )
  .handler(async ({ context, data }) => {
    const { importProducts } = await import("./store");
    return run(() => importProducts(context.userId, data));
  });

export const postCountFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    parse(
      biz.extend({
        branchId: id,
        lines: z.array(z.object({ productId: id, counted: z.number().int().min(0) })),
      }),
    ),
  )
  .handler(async ({ context, data }) => {
    const { postCount } = await import("./store");
    return run(() => postCount(context.userId, data));
  });

export const resolveCodeFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz.extend({ branchId: id, raw: z.string().min(1) })))
  .handler(async ({ context, data }) => {
    const { resolveCode } = await import("./store");
    return run(() => resolveCode(context.userId, data.businessId, data.branchId, data.raw));
  });

const checkoutSchema = z.object({
  businessId: id,
  branchId: id,
  clientId: z.string().min(8),
  customerId: z.string().nullable(),
  orderDiscountCents: cents,
  cashTenderedCents: cents,
  note: z.string(),
  lines: z
    .array(
      z.object({
        productId: id,
        qty: z.number().int().positive(),
        unitPriceCents: cents,
        discountCents: cents,
        note: z.string().optional(),
      }),
    )
    .min(1),
  payments: z
    .array(
      z.object({
        method: z.enum(["cash", "transfer", "card", "credit"]),
        amountCents: z.number().int().positive(),
        reference: z.string().optional(),
        confirmed: z.boolean().optional(),
      }),
    )
    .min(1),
});

export const checkoutFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(checkoutSchema))
  .handler(async ({ context, data }) => {
    const { checkout } = await import("./commerce");
    return run(() => checkout(context.userId, data));
  });

export const getSaleFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz.extend({ saleId: id })))
  .handler(async ({ context, data }) => {
    const { getSale } = await import("./commerce");
    return getSale(context.userId, data.businessId, data.saleId);
  });

export const listSalesFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz))
  .handler(async ({ context, data }) => {
    const { listSales } = await import("./commerce");
    return listSales(context.userId, data.businessId);
  });

export const returnSaleFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    parse(
      biz.extend({
        saleId: id,
        clientId: z.string().min(8),
        lines: z.array(z.object({ saleItemId: id, qty: z.number().int().positive() })),
        refundMethod: z.enum(["cash", "transfer"]),
      }),
    ),
  )
  .handler(async ({ context, data }) => {
    const { returnSale } = await import("./commerce");
    return run(() => returnSale(context.userId, data));
  });

export const confirmPaymentFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz.extend({ paymentId: id })))
  .handler(async ({ context, data }) => {
    const { confirmPayment } = await import("./commerce");
    return run(() => confirmPayment(context.userId, data.businessId, data.paymentId));
  });

export const listPendingFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz))
  .handler(async ({ context, data }) => {
    const { listPendingPayments } = await import("./commerce");
    return listPendingPayments(context.userId, data.businessId);
  });

export const parkSaleFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz.extend({ branchId: id, label: z.string(), cart: z.unknown() })))
  .handler(async ({ context, data }) => {
    const { parkSale } = await import("./commerce");
    return run(() => parkSale(context.userId, data.businessId, data.branchId, data.label, data.cart));
  });

export const listParkedFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz))
  .handler(async ({ context, data }) => {
    const { listParked } = await import("./commerce");
    return listParked(context.userId, data.businessId);
  });

export const discardParkedFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz.extend({ parkedId: id })))
  .handler(async ({ context, data }) => {
    const { discardParked } = await import("./commerce");
    return run(() => discardParked(context.userId, data.businessId, data.parkedId));
  });

const person = biz.extend({
  id: z.string().optional(),
  name: z.string(),
  phone: z.string(),
  address: z.string(),
  taxId: z.string(),
  notes: z.string(),
});

export const listCustomersFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz))
  .handler(async ({ context, data }) => {
    const { listCustomers } = await import("./commerce");
    return listCustomers(context.userId, data.businessId);
  });

export const saveCustomerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    parse(
      person.extend({
        photo: z.string().nullable(),
        creditLimitCents: cents,
        priceTier: z.string(),
        blocked: z.boolean(),
      }),
    ),
  )
  .handler(async ({ context, data }) => {
    const { saveCustomer } = await import("./commerce");
    return run(() => saveCustomer(context.userId, data));
  });

export const statementFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz.extend({ customerId: id })))
  .handler(async ({ context, data }) => {
    const { customerStatement } = await import("./commerce");
    return customerStatement(context.userId, data.businessId, data.customerId);
  });

export const abonoFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    parse(
      biz.extend({
        branchId: id,
        customerId: id,
        amountCents: z.number().int().positive(),
        method: z.enum(["cash", "transfer"]),
        reference: z.string(),
        note: z.string(),
        clientId: z.string().min(8),
      }),
    ),
  )
  .handler(async ({ context, data }) => {
    const { postAbono } = await import("./commerce");
    return run(() => postAbono(context.userId, data));
  });

export const reverseAbonoFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz.extend({ paymentId: id, note: z.string() })))
  .handler(async ({ context, data }) => {
    const { reverseAbono } = await import("./commerce");
    return run(() => reverseAbono(context.userId, data.businessId, data.paymentId, data.note));
  });

export const listSuppliersFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz))
  .handler(async ({ context, data }) => {
    const { listSuppliers } = await import("./commerce");
    return listSuppliers(context.userId, data.businessId);
  });

export const saveSupplierFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(person.extend({ contact: z.string(), terms: z.string() })))
  .handler(async ({ context, data }) => {
    const { saveSupplier } = await import("./commerce");
    return run(() => saveSupplier(context.userId, data));
  });

export const purchaseFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    parse(
      biz.extend({
        branchId: id,
        supplierId: z.string().nullable(),
        number: z.string(),
        method: z.enum(["cash", "transfer", "credit"]),
        freightCents: cents,
        note: z.string(),
        lines: z.array(z.object({ productId: id, qty: z.number().int().positive(), unitCostCents: cents })).min(1),
      }),
    ),
  )
  .handler(async ({ context, data }) => {
    const { receivePurchase } = await import("./commerce");
    return run(() => receivePurchase(context.userId, data));
  });

export const listPurchasesFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz))
  .handler(async ({ context, data }) => {
    const { listPurchases } = await import("./commerce");
    return listPurchases(context.userId, data.businessId);
  });

export const paySupplierFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    parse(
      biz.extend({
        branchId: id,
        supplierId: id,
        amountCents: z.number().int().positive(),
        method: z.enum(["cash", "transfer"]),
        note: z.string(),
      }),
    ),
  )
  .handler(async ({ context, data }) => {
    const { paySupplier } = await import("./commerce");
    return run(() => paySupplier(context.userId, data));
  });

export const expenseFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    parse(
      biz.extend({
        branchId: id,
        accountKey: z.string(),
        amountCents: z.number().int().positive(),
        method: z.enum(["cash", "transfer"]),
        payee: z.string(),
        note: z.string(),
        receipt: z.string().nullable(),
        spentOn: z.string(),
      }),
    ),
  )
  .handler(async ({ context, data }) => {
    const { saveExpense } = await import("./commerce");
    return run(() => saveExpense(context.userId, data));
  });

export const listExpensesFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz))
  .handler(async ({ context, data }) => {
    const { listExpenses } = await import("./commerce");
    return listExpenses(context.userId, data.businessId);
  });

export const cashStateFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz.extend({ branchId: id })))
  .handler(async ({ context, data }) => {
    const { cashState } = await import("./commerce");
    return cashState(context.userId, data.businessId, data.branchId);
  });

export const openCashFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz.extend({ branchId: id, openingCents: cents })))
  .handler(async ({ context, data }) => {
    const { openCash } = await import("./commerce");
    return run(() => openCash(context.userId, data.businessId, data.branchId, data.openingCents));
  });

export const cashMoveFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    parse(biz.extend({ branchId: id, direction: z.enum(["in", "out"]), amountCents: z.number().int().positive(), note: z.string() })),
  )
  .handler(async ({ context, data }) => {
    const { cashMove } = await import("./commerce");
    return run(() => cashMove(context.userId, data));
  });

export const closeCashFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz.extend({ branchId: id, countedCents: cents, note: z.string() })))
  .handler(async ({ context, data }) => {
    const { closeCash } = await import("./commerce");
    return run(() => closeCash(context.userId, data.businessId, data.branchId, data.countedCents, data.note));
  });

export const listLoansFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz))
  .handler(async ({ context, data }) => {
    const { listLoans } = await import("./commerce");
    return listLoans(context.userId, data.businessId);
  });

export const createLoanFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    parse(
      biz.extend({
        branchId: id,
        direction: z.enum(["received", "granted"]),
        counterparty: z.string(),
        principalCents: z.number().int().positive(),
        rateBps: z.number().int().min(0),
        startDate: z.string(),
        termMonths: z.number().int().positive(),
        frequency: z.string(),
        collateral: z.string(),
        note: z.string(),
        method: z.enum(["cash", "transfer"]),
      }),
    ),
  )
  .handler(async ({ context, data }) => {
    const { createLoan } = await import("./commerce");
    return run(() => createLoan(context.userId, data));
  });

export const payLoanFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    parse(
      biz.extend({
        branchId: id,
        loanId: id,
        principalCents: cents,
        interestCents: cents,
        method: z.enum(["cash", "transfer"]),
        note: z.string(),
      }),
    ),
  )
  .handler(async ({ context, data }) => {
    const { payLoan } = await import("./commerce");
    return run(() => payLoan(context.userId, data));
  });

export const dashboardFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz.extend({ branchId: id })))
  .handler(async ({ context, data }) => {
    const { dashboard } = await import("./insight");
    return dashboard(context.userId, data.businessId, data.branchId);
  });

export const financialsFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz.extend({ from: z.string(), to: z.string() })))
  .handler(async ({ context, data }) => {
    const { financials } = await import("./insight");
    return financials(context.userId, data.businessId, data.from, data.to);
  });

export const journalFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz))
  .handler(async ({ context, data }) => {
    const { listJournal } = await import("./insight");
    return listJournal(context.userId, data.businessId);
  });

export const ledgerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz.extend({ accountId: id, from: z.string(), to: z.string() })))
  .handler(async ({ context, data }) => {
    const { ledger } = await import("./insight");
    return ledger(context.userId, data.businessId, data.accountId, data.from, data.to);
  });

export const manualJournalFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    parse(
      biz.extend({
        memo: z.string(),
        lines: z.array(z.object({ accountId: id, debitCents: cents, creditCents: cents })).min(2),
      }),
    ),
  )
  .handler(async ({ context, data }) => {
    const { postManual } = await import("./insight");
    return run(() => postManual(context.userId, data));
  });

export const accountsFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz))
  .handler(async ({ context, data }) => {
    const { listAccounts } = await import("./insight");
    return listAccounts(context.userId, data.businessId);
  });

export const saveAccountFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz.extend({ code: z.string(), name: z.string(), type: z.string() })))
  .handler(async ({ context, data }) => {
    const { saveAccount } = await import("./insight");
    return run(() => saveAccount(context.userId, data));
  });

export const lockFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz.extend({ year: z.number().int(), month: z.number().int(), unlock: z.boolean() })))
  .handler(async ({ context, data }) => {
    const { lockPeriod } = await import("./insight");
    return run(() => lockPeriod(context.userId, data.businessId, data.year, data.month, data.unlock));
  });

export const auditFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz))
  .handler(async ({ context, data }) => {
    const { listAudit } = await import("./insight");
    return listAudit(context.userId, data.businessId);
  });

export const reportFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz.extend({ branchId: z.string(), from: z.string(), to: z.string() })))
  .handler(async ({ context, data }) => {
    const { report } = await import("./insight");
    return report(context.userId, data.businessId, data.branchId, data.from, data.to);
  });

export const saveQuoteFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz.extend({ customerId: z.string().nullable(), note: z.string(), totalCents: cents, cart: z.unknown() })))
  .handler(async ({ context, data }) => {
    const { saveQuote } = await import("./insight");
    return run(() => saveQuote(context.userId, data));
  });

export const listQuotesFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz))
  .handler(async ({ context, data }) => {
    const { listQuotes } = await import("./insight");
    return listQuotes(context.userId, data.businessId);
  });

export const voidQuoteFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(parse(biz.extend({ quoteId: id })))
  .handler(async ({ context, data }) => {
    const { voidQuote } = await import("./insight");
    return run(() => voidQuote(context.userId, data.businessId, data.quoteId));
  });

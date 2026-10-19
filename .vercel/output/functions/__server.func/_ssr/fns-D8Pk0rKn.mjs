import { i as TSS_SERVER_FUNCTION, r as createServerFn } from "./ssr.mjs";
import { Jt as number, Qt as string, Ut as array, Vt as _enum, Wt as boolean, Yt as object, en as unknown } from "../_libs/@better-auth/core+[...].mjs";
import { t as authMiddleware } from "./middleware-BHFVr5iF.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/fns-D8Pk0rKn.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
function parse(schema) {
	return (input) => {
		const result = schema.safeParse(input);
		if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Datos inválidos");
		return result.data;
	};
}
async function run(work) {
	try {
		return {
			ok: true,
			data: await work()
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : "Error inesperado";
		if (message === "Unauthorized") throw error;
		return {
			ok: false,
			error: message
		};
	}
}
var id = string().min(8, "Falta el negocio");
var cents = number().int().min(0);
var biz = object({ businessId: id });
var listBusinessesFn_createServerFn_handler = createServerRpc({
	id: "f2a72aac64bbb4d96352becc892718d72dc95abb192f492547c0d880916b2d7b",
	name: "listBusinessesFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => listBusinessesFn.__executeServer(opts));
var listBusinessesFn = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(listBusinessesFn_createServerFn_handler, async ({ context }) => {
	const { listBusinesses } = await import("./store-CJJJ_rxv.mjs");
	return listBusinesses(context.userId);
});
var businessInput = object({
	name: string().min(2, "Escriba el nombre del negocio"),
	address: string(),
	phone: string(),
	taxId: string(),
	businessType: string(),
	currency: string(),
	timezone: string(),
	displayName: string(),
	logo: string().nullable()
});
var createBusinessFn_createServerFn_handler = createServerRpc({
	id: "3e0e5bb5bbc681271c3ffb475bbbd4de767c23e631fe9b907f995f482016c908",
	name: "createBusinessFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => createBusinessFn.__executeServer(opts));
var createBusinessFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(businessInput)).handler(createBusinessFn_createServerFn_handler, async ({ context, data }) => {
	const { createBusiness } = await import("./store-CJJJ_rxv.mjs");
	return run(() => createBusiness(context.userId, data));
});
var updateBusinessFn_createServerFn_handler = createServerRpc({
	id: "35d4833618dd61589d490fdee6be841b337288f54a58d5d3b279d1ccca0bbf67",
	name: "updateBusinessFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => updateBusinessFn.__executeServer(opts));
var updateBusinessFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(businessInput.omit({ displayName: true }).extend({
	businessId: id,
	invoicePrefix: string(),
	taxRateBps: number().int().min(0).max(3e3),
	creditDays: number().int().min(0).max(180),
	allowNegativeStock: boolean()
}))).handler(updateBusinessFn_createServerFn_handler, async ({ context, data }) => {
	const { updateBusiness } = await import("./store-CJJJ_rxv.mjs");
	return run(() => updateBusiness(context.userId, data));
});
var deleteBusinessFn_createServerFn_handler = createServerRpc({
	id: "5ae1c3edcd3acd65d1322913e8ab74e3e0fde66b95f82bb56eec5a3ce5646802",
	name: "deleteBusinessFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => deleteBusinessFn.__executeServer(opts));
var deleteBusinessFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(object({
	businessId: id,
	confirmName: string()
}))).handler(deleteBusinessFn_createServerFn_handler, async ({ context, data }) => {
	const { deleteBusiness } = await import("./store-CJJJ_rxv.mjs");
	return run(() => deleteBusiness(context.userId, data.businessId, data.confirmName));
});
var createDemoFn_createServerFn_handler = createServerRpc({
	id: "64833172553659a393060864bf00968ee4da8f30bd7070143ba5b3841d5f83de",
	name: "createDemoFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => createDemoFn.__executeServer(opts));
var createDemoFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(object({ displayName: string() }))).handler(createDemoFn_createServerFn_handler, async ({ context, data }) => {
	const { createDemo } = await import("./insight-80pkFaSy.mjs");
	return run(() => createDemo(context.userId, data.displayName));
});
var listMembersFn_createServerFn_handler = createServerRpc({
	id: "d1183d1ffcbae4d12d9dd313d229c3faed6c8830f376a15f21ff88639b665553",
	name: "listMembersFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => listMembersFn.__executeServer(opts));
var listMembersFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz)).handler(listMembersFn_createServerFn_handler, async ({ context, data }) => {
	const { listMembers } = await import("./store-CJJJ_rxv.mjs");
	return listMembers(context.userId, data.businessId);
});
var createInviteFn_createServerFn_handler = createServerRpc({
	id: "0f782b6ec416a33ae8c5763ce648e847e6aeabaa9c40d0caf99bae740b88d4fb",
	name: "createInviteFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => createInviteFn.__executeServer(opts));
var createInviteFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({ role: string() }))).handler(createInviteFn_createServerFn_handler, async ({ context, data }) => {
	const { createInvite } = await import("./store-CJJJ_rxv.mjs");
	return run(() => createInvite(context.userId, data.businessId, data.role));
});
var acceptInviteFn_createServerFn_handler = createServerRpc({
	id: "3b669c99f03efbac4989eae0254adbd02f2a1f85f5f28ea9a2dbed8525fb0fd8",
	name: "acceptInviteFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => acceptInviteFn.__executeServer(opts));
var acceptInviteFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(object({
	code: string().min(4),
	displayName: string()
}))).handler(acceptInviteFn_createServerFn_handler, async ({ context, data }) => {
	const { acceptInvite } = await import("./store-CJJJ_rxv.mjs");
	return run(() => acceptInvite(context.userId, data.code, data.displayName));
});
var updateCapsFn_createServerFn_handler = createServerRpc({
	id: "da10a2721bdec507f4504713e21aa2312cd026818361772d4aae5c568ff129c6",
	name: "updateCapsFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => updateCapsFn.__executeServer(opts));
var updateCapsFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	memberId: id,
	caps: array(string())
}))).handler(updateCapsFn_createServerFn_handler, async ({ context, data }) => {
	const { updateMemberCaps } = await import("./store-CJJJ_rxv.mjs");
	return run(() => updateMemberCaps(context.userId, data.businessId, data.memberId, data.caps));
});
var createBranchFn_createServerFn_handler = createServerRpc({
	id: "151b9eb7ddf361444d03962828d45db11b656b62a125b604bd282a296877b82f",
	name: "createBranchFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => createBranchFn.__executeServer(opts));
var createBranchFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({ name: string() }))).handler(createBranchFn_createServerFn_handler, async ({ context, data }) => {
	const { createBranch } = await import("./store-CJJJ_rxv.mjs");
	return run(() => createBranch(context.userId, data.businessId, data.name));
});
var transferFn_createServerFn_handler = createServerRpc({
	id: "598663fe380db0f28919d69aaea533180108027def4ae5762c6782f32308ad2a",
	name: "transferFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => transferFn.__executeServer(opts));
var transferFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	fromBranchId: id,
	toBranchId: id,
	productId: id,
	qty: number().int().positive(),
	note: string()
}))).handler(transferFn_createServerFn_handler, async ({ context, data }) => {
	const { transferStock } = await import("./store-CJJJ_rxv.mjs");
	return run(() => transferStock(context.userId, data));
});
var listProductsFn_createServerFn_handler = createServerRpc({
	id: "2155c0e309bd350ca2cdce47eed3c766ccc8235886320e79465a8618acf4368e",
	name: "listProductsFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => listProductsFn.__executeServer(opts));
var listProductsFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	branchId: id,
	query: string()
}))).handler(listProductsFn_createServerFn_handler, async ({ context, data }) => {
	const { listProducts } = await import("./store-CJJJ_rxv.mjs");
	return listProducts(context.userId, data.businessId, data.branchId, data.query);
});
var listCategoriesFn_createServerFn_handler = createServerRpc({
	id: "58ca9bb60617aa81735403bd257856d38cadfdf2ccc5335b148c6dc45f437784",
	name: "listCategoriesFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => listCategoriesFn.__executeServer(opts));
var listCategoriesFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz)).handler(listCategoriesFn_createServerFn_handler, async ({ context, data }) => {
	const { listCategories } = await import("./store-CJJJ_rxv.mjs");
	return listCategories(context.userId, data.businessId);
});
var productInput = object({
	businessId: id,
	branchId: id,
	id: string().optional(),
	name: string(),
	description: string(),
	photo: string().nullable(),
	category: string(),
	subcategory: string(),
	brand: string(),
	sku: string(),
	barcode: string(),
	costCents: cents,
	priceCents: cents,
	wholesaleCents: cents,
	promoCents: cents.nullable(),
	promoUntil: string().nullable(),
	volumePrices: array(object({
		minQty: number().int(),
		priceCents: cents
	})),
	taxExempt: boolean(),
	regulated: boolean(),
	minQty: number().int().min(0),
	unit: string(),
	supplierId: string().nullable(),
	expiresOn: string().nullable(),
	lotCode: string(),
	location: string(),
	active: boolean(),
	favorite: boolean(),
	parentId: string().nullable(),
	variantLabel: string(),
	initialQty: number().int().min(0)
});
var saveProductFn_createServerFn_handler = createServerRpc({
	id: "2b6a1706859f25ca0a3e45c56cff47c0c095fa05a8634d646c850476d11d730a",
	name: "saveProductFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => saveProductFn.__executeServer(opts));
var saveProductFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(productInput)).handler(saveProductFn_createServerFn_handler, async ({ context, data }) => {
	const { saveProduct } = await import("./store-CJJJ_rxv.mjs");
	return run(() => saveProduct(context.userId, data));
});
var adjustStockFn_createServerFn_handler = createServerRpc({
	id: "ccb88f64525a39d7d14ce0053020caef42f1705eb6e824d97971065f22f6b64b",
	name: "adjustStockFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => adjustStockFn.__executeServer(opts));
var adjustStockFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	branchId: id,
	productId: id,
	qtyDelta: number().int(),
	reason: string(),
	note: string()
}))).handler(adjustStockFn_createServerFn_handler, async ({ context, data }) => {
	const { adjustStock } = await import("./store-CJJJ_rxv.mjs");
	return run(() => adjustStock(context.userId, data));
});
var listMovementsFn_createServerFn_handler = createServerRpc({
	id: "8ebf3f3c6613f26c1de30fb89cf32747df9a0f25556c7dc0a4e412f9cbc3a2af",
	name: "listMovementsFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => listMovementsFn.__executeServer(opts));
var listMovementsFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz)).handler(listMovementsFn_createServerFn_handler, async ({ context, data }) => {
	const { listMovements } = await import("./store-CJJJ_rxv.mjs");
	return listMovements(context.userId, data.businessId);
});
var bulkPriceFn_createServerFn_handler = createServerRpc({
	id: "be712ae8a025304e76ed1ea4fdcf0829da1a905c2e5082af05de3060b43841b6",
	name: "bulkPriceFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => bulkPriceFn.__executeServer(opts));
var bulkPriceFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	categoryId: string().nullable(),
	field: _enum([
		"price",
		"wholesale",
		"cost"
	]),
	percentBps: number().int()
}))).handler(bulkPriceFn_createServerFn_handler, async ({ context, data }) => {
	const { bulkPrice } = await import("./store-CJJJ_rxv.mjs");
	return run(() => bulkPrice(context.userId, data));
});
var importProductsFn_createServerFn_handler = createServerRpc({
	id: "ce34312cc97a6ff119e8406da7947d0524ed1e1db9f90b53a5aa006846cdfefe",
	name: "importProductsFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => importProductsFn.__executeServer(opts));
var importProductsFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	branchId: id,
	rows: array(object({
		name: string(),
		priceCents: cents,
		costCents: cents,
		qty: number().int().min(0),
		barcode: string(),
		category: string(),
		unit: string(),
		minQty: number().int().min(0),
		sku: string()
	}))
}))).handler(importProductsFn_createServerFn_handler, async ({ context, data }) => {
	const { importProducts } = await import("./store-CJJJ_rxv.mjs");
	return run(() => importProducts(context.userId, data));
});
var postCountFn_createServerFn_handler = createServerRpc({
	id: "b3cec982d9ab66be32ae502b5fc6666fcd2eae48643a1e34d051cfbd145072a8",
	name: "postCountFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => postCountFn.__executeServer(opts));
var postCountFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	branchId: id,
	lines: array(object({
		productId: id,
		counted: number().int().min(0)
	}))
}))).handler(postCountFn_createServerFn_handler, async ({ context, data }) => {
	const { postCount } = await import("./store-CJJJ_rxv.mjs");
	return run(() => postCount(context.userId, data));
});
var resolveCodeFn_createServerFn_handler = createServerRpc({
	id: "cf3b2253ca1f3088c711364eb7e1565e2c8e0f7f9a317134405b3687d0fe2a39",
	name: "resolveCodeFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => resolveCodeFn.__executeServer(opts));
var resolveCodeFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	branchId: id,
	raw: string().min(1)
}))).handler(resolveCodeFn_createServerFn_handler, async ({ context, data }) => {
	const { resolveCode } = await import("./store-CJJJ_rxv.mjs");
	return run(() => resolveCode(context.userId, data.businessId, data.branchId, data.raw));
});
var checkoutSchema = object({
	businessId: id,
	branchId: id,
	clientId: string().min(8),
	customerId: string().nullable(),
	orderDiscountCents: cents,
	cashTenderedCents: cents,
	note: string(),
	lines: array(object({
		productId: id,
		qty: number().int().positive(),
		unitPriceCents: cents,
		discountCents: cents,
		note: string().optional()
	})).min(1),
	payments: array(object({
		method: _enum([
			"cash",
			"transfer",
			"card",
			"credit"
		]),
		amountCents: number().int().positive(),
		reference: string().optional(),
		confirmed: boolean().optional()
	})).min(1)
});
var checkoutFn_createServerFn_handler = createServerRpc({
	id: "d477e87066ac761e33023f504d516fc2693d9b2552ac3c15b8aa2e6643cbe770",
	name: "checkoutFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => checkoutFn.__executeServer(opts));
var checkoutFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(checkoutSchema)).handler(checkoutFn_createServerFn_handler, async ({ context, data }) => {
	const { checkout } = await import("./commerce-Cs6dpTYJ.mjs");
	return run(() => checkout(context.userId, data));
});
var getSaleFn_createServerFn_handler = createServerRpc({
	id: "a74e9a35e4f043e5043396f7519bef9bfaa0dafa5d2dd9b056408c10357a3bcc",
	name: "getSaleFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => getSaleFn.__executeServer(opts));
var getSaleFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({ saleId: id }))).handler(getSaleFn_createServerFn_handler, async ({ context, data }) => {
	const { getSale } = await import("./commerce-Cs6dpTYJ.mjs");
	return getSale(context.userId, data.businessId, data.saleId);
});
var listSalesFn_createServerFn_handler = createServerRpc({
	id: "59382d581dafcb2926c71dfc9fa1744e51983f397590040482cdc5997b3f7ad9",
	name: "listSalesFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => listSalesFn.__executeServer(opts));
var listSalesFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz)).handler(listSalesFn_createServerFn_handler, async ({ context, data }) => {
	const { listSales } = await import("./commerce-Cs6dpTYJ.mjs");
	return listSales(context.userId, data.businessId);
});
var returnSaleFn_createServerFn_handler = createServerRpc({
	id: "a97afac739952ce597fb874ec8bdd17f7fa896f8cad047ac96c21a50eae32f0a",
	name: "returnSaleFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => returnSaleFn.__executeServer(opts));
var returnSaleFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	saleId: id,
	clientId: string().min(8),
	lines: array(object({
		saleItemId: id,
		qty: number().int().positive()
	})),
	refundMethod: _enum(["cash", "transfer"])
}))).handler(returnSaleFn_createServerFn_handler, async ({ context, data }) => {
	const { returnSale } = await import("./commerce-Cs6dpTYJ.mjs");
	return run(() => returnSale(context.userId, data));
});
var confirmPaymentFn_createServerFn_handler = createServerRpc({
	id: "d327e3c28a6c883ef2df530dcb61bfba34af56832c18709d709776d4ca246271",
	name: "confirmPaymentFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => confirmPaymentFn.__executeServer(opts));
var confirmPaymentFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({ paymentId: id }))).handler(confirmPaymentFn_createServerFn_handler, async ({ context, data }) => {
	const { confirmPayment } = await import("./commerce-Cs6dpTYJ.mjs");
	return run(() => confirmPayment(context.userId, data.businessId, data.paymentId));
});
var listPendingFn_createServerFn_handler = createServerRpc({
	id: "0bc4e72b0eb89f4bec3d8d2f03cb8a44c3f0ae65c2050ba93aadfeb3917f0142",
	name: "listPendingFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => listPendingFn.__executeServer(opts));
var listPendingFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz)).handler(listPendingFn_createServerFn_handler, async ({ context, data }) => {
	const { listPendingPayments } = await import("./commerce-Cs6dpTYJ.mjs");
	return listPendingPayments(context.userId, data.businessId);
});
var parkSaleFn_createServerFn_handler = createServerRpc({
	id: "16bf8de1d274fc6099dd3d0220699fa552ef7419c3eadb63da81de95ef804065",
	name: "parkSaleFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => parkSaleFn.__executeServer(opts));
var parkSaleFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	branchId: id,
	label: string(),
	cart: unknown()
}))).handler(parkSaleFn_createServerFn_handler, async ({ context, data }) => {
	const { parkSale } = await import("./commerce-Cs6dpTYJ.mjs");
	return run(() => parkSale(context.userId, data.businessId, data.branchId, data.label, data.cart));
});
var listParkedFn_createServerFn_handler = createServerRpc({
	id: "5e307a494f75fb5048aa7fe08e3651f487e05de376482a56112ffc80c39a3fff",
	name: "listParkedFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => listParkedFn.__executeServer(opts));
var listParkedFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz)).handler(listParkedFn_createServerFn_handler, async ({ context, data }) => {
	const { listParked } = await import("./commerce-Cs6dpTYJ.mjs");
	return listParked(context.userId, data.businessId);
});
var discardParkedFn_createServerFn_handler = createServerRpc({
	id: "dd9584ecb4699cd057b69b9e6fe0799ccba0ee068148f2a382e5d6d97a455faa",
	name: "discardParkedFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => discardParkedFn.__executeServer(opts));
var discardParkedFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({ parkedId: id }))).handler(discardParkedFn_createServerFn_handler, async ({ context, data }) => {
	const { discardParked } = await import("./commerce-Cs6dpTYJ.mjs");
	return run(() => discardParked(context.userId, data.businessId, data.parkedId));
});
var person = biz.extend({
	id: string().optional(),
	name: string(),
	phone: string(),
	address: string(),
	taxId: string(),
	notes: string()
});
var listCustomersFn_createServerFn_handler = createServerRpc({
	id: "26565d277fad74695d6c354106940cab7d131958fd95eadb53fe63f0ebc33c2f",
	name: "listCustomersFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => listCustomersFn.__executeServer(opts));
var listCustomersFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz)).handler(listCustomersFn_createServerFn_handler, async ({ context, data }) => {
	const { listCustomers } = await import("./commerce-Cs6dpTYJ.mjs");
	return listCustomers(context.userId, data.businessId);
});
var saveCustomerFn_createServerFn_handler = createServerRpc({
	id: "782bb38fa2f763c4ef10260f4fdb04ec43e418a8fff6732a43706f96a20b6acf",
	name: "saveCustomerFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => saveCustomerFn.__executeServer(opts));
var saveCustomerFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(person.extend({
	photo: string().nullable(),
	creditLimitCents: cents,
	priceTier: string(),
	blocked: boolean()
}))).handler(saveCustomerFn_createServerFn_handler, async ({ context, data }) => {
	const { saveCustomer } = await import("./commerce-Cs6dpTYJ.mjs");
	return run(() => saveCustomer(context.userId, data));
});
var statementFn_createServerFn_handler = createServerRpc({
	id: "40cf7586b2116bcd54eea5efbca6d2ca18f6f6e92ba32d0f04e2e7b9c107a0b1",
	name: "statementFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => statementFn.__executeServer(opts));
var statementFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({ customerId: id }))).handler(statementFn_createServerFn_handler, async ({ context, data }) => {
	const { customerStatement } = await import("./commerce-Cs6dpTYJ.mjs");
	return customerStatement(context.userId, data.businessId, data.customerId);
});
var abonoFn_createServerFn_handler = createServerRpc({
	id: "4b97a5b213ef59e84e90954f0db61dca7e065b1cb6008dc1665f1d692b66bd59",
	name: "abonoFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => abonoFn.__executeServer(opts));
var abonoFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	branchId: id,
	customerId: id,
	amountCents: number().int().positive(),
	method: _enum(["cash", "transfer"]),
	reference: string(),
	note: string(),
	clientId: string().min(8)
}))).handler(abonoFn_createServerFn_handler, async ({ context, data }) => {
	const { postAbono } = await import("./commerce-Cs6dpTYJ.mjs");
	return run(() => postAbono(context.userId, data));
});
var reverseAbonoFn_createServerFn_handler = createServerRpc({
	id: "25057468fa8165417ebc73cfbee6f6a5fef8bb06c9196d7f7bfd38ee230ff5aa",
	name: "reverseAbonoFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => reverseAbonoFn.__executeServer(opts));
var reverseAbonoFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	paymentId: id,
	note: string()
}))).handler(reverseAbonoFn_createServerFn_handler, async ({ context, data }) => {
	const { reverseAbono } = await import("./commerce-Cs6dpTYJ.mjs");
	return run(() => reverseAbono(context.userId, data.businessId, data.paymentId, data.note));
});
var listSuppliersFn_createServerFn_handler = createServerRpc({
	id: "7bfb3e164983a70b11177ff45edded146d0042a7f569c2481bf37eed2716426d",
	name: "listSuppliersFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => listSuppliersFn.__executeServer(opts));
var listSuppliersFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz)).handler(listSuppliersFn_createServerFn_handler, async ({ context, data }) => {
	const { listSuppliers } = await import("./commerce-Cs6dpTYJ.mjs");
	return listSuppliers(context.userId, data.businessId);
});
var saveSupplierFn_createServerFn_handler = createServerRpc({
	id: "864eca9c84fbc4e38a5cb10212cc98dc8ec0ea62efabadb2f365231bce8cdb58",
	name: "saveSupplierFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => saveSupplierFn.__executeServer(opts));
var saveSupplierFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(person.extend({
	contact: string(),
	terms: string()
}))).handler(saveSupplierFn_createServerFn_handler, async ({ context, data }) => {
	const { saveSupplier } = await import("./commerce-Cs6dpTYJ.mjs");
	return run(() => saveSupplier(context.userId, data));
});
var purchaseFn_createServerFn_handler = createServerRpc({
	id: "98a61eca5381ac20b5ac065af0890952b3e2f08ff49ff83f6cfb6c6490b3182e",
	name: "purchaseFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => purchaseFn.__executeServer(opts));
var purchaseFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	branchId: id,
	supplierId: string().nullable(),
	number: string(),
	method: _enum([
		"cash",
		"transfer",
		"credit"
	]),
	freightCents: cents,
	note: string(),
	lines: array(object({
		productId: id,
		qty: number().int().positive(),
		unitCostCents: cents
	})).min(1)
}))).handler(purchaseFn_createServerFn_handler, async ({ context, data }) => {
	const { receivePurchase } = await import("./commerce-Cs6dpTYJ.mjs");
	return run(() => receivePurchase(context.userId, data));
});
var listPurchasesFn_createServerFn_handler = createServerRpc({
	id: "ec51f7468336e204fca6d2adcc2f749333ccefae1d8c3034d61873e0a63bcb49",
	name: "listPurchasesFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => listPurchasesFn.__executeServer(opts));
var listPurchasesFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz)).handler(listPurchasesFn_createServerFn_handler, async ({ context, data }) => {
	const { listPurchases } = await import("./commerce-Cs6dpTYJ.mjs");
	return listPurchases(context.userId, data.businessId);
});
var paySupplierFn_createServerFn_handler = createServerRpc({
	id: "f85f24e56c0deea952e2c36223a164a89fa4ee291bc23a86d2775836f7396d9a",
	name: "paySupplierFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => paySupplierFn.__executeServer(opts));
var paySupplierFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	branchId: id,
	supplierId: id,
	amountCents: number().int().positive(),
	method: _enum(["cash", "transfer"]),
	note: string()
}))).handler(paySupplierFn_createServerFn_handler, async ({ context, data }) => {
	const { paySupplier } = await import("./commerce-Cs6dpTYJ.mjs");
	return run(() => paySupplier(context.userId, data));
});
var expenseFn_createServerFn_handler = createServerRpc({
	id: "c0d548338cc4a17f26c3ac5333b5ca54a66795acee127f50770ef69ada9e7bbb",
	name: "expenseFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => expenseFn.__executeServer(opts));
var expenseFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	branchId: id,
	accountKey: string(),
	amountCents: number().int().positive(),
	method: _enum(["cash", "transfer"]),
	payee: string(),
	note: string(),
	receipt: string().nullable(),
	spentOn: string()
}))).handler(expenseFn_createServerFn_handler, async ({ context, data }) => {
	const { saveExpense } = await import("./commerce-Cs6dpTYJ.mjs");
	return run(() => saveExpense(context.userId, data));
});
var listExpensesFn_createServerFn_handler = createServerRpc({
	id: "bed980d1378d85dee3dc2f28e238345843004c37e34a97ecf2166e70ffbd3f8b",
	name: "listExpensesFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => listExpensesFn.__executeServer(opts));
var listExpensesFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz)).handler(listExpensesFn_createServerFn_handler, async ({ context, data }) => {
	const { listExpenses } = await import("./commerce-Cs6dpTYJ.mjs");
	return listExpenses(context.userId, data.businessId);
});
var cashStateFn_createServerFn_handler = createServerRpc({
	id: "54ccd7b84fb7a4f92e8e61774d173c1e6ab9fca32ff331e1f56f6b2481ae44a2",
	name: "cashStateFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => cashStateFn.__executeServer(opts));
var cashStateFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({ branchId: id }))).handler(cashStateFn_createServerFn_handler, async ({ context, data }) => {
	const { cashState } = await import("./commerce-Cs6dpTYJ.mjs");
	return cashState(context.userId, data.businessId, data.branchId);
});
var openCashFn_createServerFn_handler = createServerRpc({
	id: "568102a7a34097371d3735b4c976b2643bbb53b9227eefa50f8ef59afdbbe059",
	name: "openCashFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => openCashFn.__executeServer(opts));
var openCashFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	branchId: id,
	openingCents: cents
}))).handler(openCashFn_createServerFn_handler, async ({ context, data }) => {
	const { openCash } = await import("./commerce-Cs6dpTYJ.mjs");
	return run(() => openCash(context.userId, data.businessId, data.branchId, data.openingCents));
});
var cashMoveFn_createServerFn_handler = createServerRpc({
	id: "edbe33523198e2a99783003c1d0ae1485b7ce0624a550dc999cd033d6b9a51d6",
	name: "cashMoveFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => cashMoveFn.__executeServer(opts));
var cashMoveFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	branchId: id,
	direction: _enum(["in", "out"]),
	amountCents: number().int().positive(),
	note: string()
}))).handler(cashMoveFn_createServerFn_handler, async ({ context, data }) => {
	const { cashMove } = await import("./commerce-Cs6dpTYJ.mjs");
	return run(() => cashMove(context.userId, data));
});
var closeCashFn_createServerFn_handler = createServerRpc({
	id: "131db600a2e641d86c9adf090875e9c3f928eb17f064ed34f730f6faea90d1c8",
	name: "closeCashFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => closeCashFn.__executeServer(opts));
var closeCashFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	branchId: id,
	countedCents: cents,
	note: string()
}))).handler(closeCashFn_createServerFn_handler, async ({ context, data }) => {
	const { closeCash } = await import("./commerce-Cs6dpTYJ.mjs");
	return run(() => closeCash(context.userId, data.businessId, data.branchId, data.countedCents, data.note));
});
var listLoansFn_createServerFn_handler = createServerRpc({
	id: "80c16a8e91ffd214a0c5e9bc23cdc22522bd621afa7fdfca95a43bf765a9d206",
	name: "listLoansFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => listLoansFn.__executeServer(opts));
var listLoansFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz)).handler(listLoansFn_createServerFn_handler, async ({ context, data }) => {
	const { listLoans } = await import("./commerce-Cs6dpTYJ.mjs");
	return listLoans(context.userId, data.businessId);
});
var createLoanFn_createServerFn_handler = createServerRpc({
	id: "e82ed761c4622686a90039645b715819db0b4dbf04e0599f106fbab4206860b1",
	name: "createLoanFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => createLoanFn.__executeServer(opts));
var createLoanFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	branchId: id,
	direction: _enum(["received", "granted"]),
	counterparty: string(),
	principalCents: number().int().positive(),
	rateBps: number().int().min(0),
	startDate: string(),
	termMonths: number().int().positive(),
	frequency: string(),
	collateral: string(),
	note: string(),
	method: _enum(["cash", "transfer"])
}))).handler(createLoanFn_createServerFn_handler, async ({ context, data }) => {
	const { createLoan } = await import("./commerce-Cs6dpTYJ.mjs");
	return run(() => createLoan(context.userId, data));
});
var payLoanFn_createServerFn_handler = createServerRpc({
	id: "f8863c3855151e59535f8e6ec0d3a2244b5e87c83fbddab5580e2740618bca91",
	name: "payLoanFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => payLoanFn.__executeServer(opts));
var payLoanFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	branchId: id,
	loanId: id,
	principalCents: cents,
	interestCents: cents,
	method: _enum(["cash", "transfer"]),
	note: string()
}))).handler(payLoanFn_createServerFn_handler, async ({ context, data }) => {
	const { payLoan } = await import("./commerce-Cs6dpTYJ.mjs");
	return run(() => payLoan(context.userId, data));
});
var dashboardFn_createServerFn_handler = createServerRpc({
	id: "8f8329d33afa9c55f57f8d64715c04742a001a65f6ac8bd8e82951fd6dc1b852",
	name: "dashboardFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => dashboardFn.__executeServer(opts));
var dashboardFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({ branchId: id }))).handler(dashboardFn_createServerFn_handler, async ({ context, data }) => {
	const { dashboard } = await import("./insight-80pkFaSy.mjs");
	return dashboard(context.userId, data.businessId, data.branchId);
});
var financialsFn_createServerFn_handler = createServerRpc({
	id: "c59bb425dd1b497982529a114686d3833e2fa135bd53b580284adb1bc1b86a82",
	name: "financialsFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => financialsFn.__executeServer(opts));
var financialsFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	from: string(),
	to: string()
}))).handler(financialsFn_createServerFn_handler, async ({ context, data }) => {
	const { financials } = await import("./insight-80pkFaSy.mjs");
	return financials(context.userId, data.businessId, data.from, data.to);
});
var journalFn_createServerFn_handler = createServerRpc({
	id: "6a298ad2f95fee84821a85f7a663ee9bc6f06c670043b5fb86655a8ddbb08e8a",
	name: "journalFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => journalFn.__executeServer(opts));
var journalFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz)).handler(journalFn_createServerFn_handler, async ({ context, data }) => {
	const { listJournal } = await import("./insight-80pkFaSy.mjs");
	return listJournal(context.userId, data.businessId);
});
var ledgerFn_createServerFn_handler = createServerRpc({
	id: "5edda0046258222df38b6405298dda59513eb21b0acdaf6d78a2f25c6e35fdbb",
	name: "ledgerFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => ledgerFn.__executeServer(opts));
var ledgerFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	accountId: id,
	from: string(),
	to: string()
}))).handler(ledgerFn_createServerFn_handler, async ({ context, data }) => {
	const { ledger } = await import("./insight-80pkFaSy.mjs");
	return ledger(context.userId, data.businessId, data.accountId, data.from, data.to);
});
var manualJournalFn_createServerFn_handler = createServerRpc({
	id: "98a0c5535ed55c74941ae7af0809a0e510c507f7290cac0c5556afab477d9c84",
	name: "manualJournalFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => manualJournalFn.__executeServer(opts));
var manualJournalFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	memo: string(),
	lines: array(object({
		accountId: id,
		debitCents: cents,
		creditCents: cents
	})).min(2)
}))).handler(manualJournalFn_createServerFn_handler, async ({ context, data }) => {
	const { postManual } = await import("./insight-80pkFaSy.mjs");
	return run(() => postManual(context.userId, data));
});
var accountsFn_createServerFn_handler = createServerRpc({
	id: "f8e48b56593c06f5a3006450568e45e4a26dbf47cb16bbdbc276b8ea91b3ce43",
	name: "accountsFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => accountsFn.__executeServer(opts));
var accountsFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz)).handler(accountsFn_createServerFn_handler, async ({ context, data }) => {
	const { listAccounts } = await import("./insight-80pkFaSy.mjs");
	return listAccounts(context.userId, data.businessId);
});
var saveAccountFn_createServerFn_handler = createServerRpc({
	id: "bd90739c1a17d4cdac19407c97d3d2ec0a41876225c8d88cda99785ca755d3ac",
	name: "saveAccountFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => saveAccountFn.__executeServer(opts));
var saveAccountFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	code: string(),
	name: string(),
	type: string()
}))).handler(saveAccountFn_createServerFn_handler, async ({ context, data }) => {
	const { saveAccount } = await import("./insight-80pkFaSy.mjs");
	return run(() => saveAccount(context.userId, data));
});
var lockFn_createServerFn_handler = createServerRpc({
	id: "db73c7debc41c2c9f6d826c5741e3525b5ba6b16056e917ee1f2999139ce2df5",
	name: "lockFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => lockFn.__executeServer(opts));
var lockFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	year: number().int(),
	month: number().int(),
	unlock: boolean()
}))).handler(lockFn_createServerFn_handler, async ({ context, data }) => {
	const { lockPeriod } = await import("./insight-80pkFaSy.mjs");
	return run(() => lockPeriod(context.userId, data.businessId, data.year, data.month, data.unlock));
});
var auditFn_createServerFn_handler = createServerRpc({
	id: "c9c2fc6c585429751cef26ef4762e367779d04e0e0bbfbc23e2352c6c6fdae3b",
	name: "auditFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => auditFn.__executeServer(opts));
var auditFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz)).handler(auditFn_createServerFn_handler, async ({ context, data }) => {
	const { listAudit } = await import("./insight-80pkFaSy.mjs");
	return listAudit(context.userId, data.businessId);
});
var reportFn_createServerFn_handler = createServerRpc({
	id: "00e4ac06046cc7cacceb9027ec416f09011d8faeae39d1e53610d77c3e0e41f2",
	name: "reportFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => reportFn.__executeServer(opts));
var reportFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	branchId: string(),
	from: string(),
	to: string()
}))).handler(reportFn_createServerFn_handler, async ({ context, data }) => {
	const { report } = await import("./insight-80pkFaSy.mjs");
	return report(context.userId, data.businessId, data.branchId, data.from, data.to);
});
var saveQuoteFn_createServerFn_handler = createServerRpc({
	id: "f41ae1cbb8a5e5469c739ec081eb12db9fd07429fc7a9f70909bc28f77bf5ae8",
	name: "saveQuoteFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => saveQuoteFn.__executeServer(opts));
var saveQuoteFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	customerId: string().nullable(),
	note: string(),
	totalCents: cents,
	cart: unknown()
}))).handler(saveQuoteFn_createServerFn_handler, async ({ context, data }) => {
	const { saveQuote } = await import("./insight-80pkFaSy.mjs");
	return run(() => saveQuote(context.userId, data));
});
var listQuotesFn_createServerFn_handler = createServerRpc({
	id: "02a5642c98f05acf4dfd1e6384d428faa3c324b56b88fec91878751a5ffd4f24",
	name: "listQuotesFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => listQuotesFn.__executeServer(opts));
var listQuotesFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz)).handler(listQuotesFn_createServerFn_handler, async ({ context, data }) => {
	const { listQuotes } = await import("./insight-80pkFaSy.mjs");
	return listQuotes(context.userId, data.businessId);
});
var voidQuoteFn_createServerFn_handler = createServerRpc({
	id: "7d9443b14e113090fd22bd21cb136fb35e8f0c5c7c41828712502797fe8c4f82",
	name: "voidQuoteFn",
	filename: "src/lib/nexo/fns.ts"
}, (opts) => voidQuoteFn.__executeServer(opts));
var voidQuoteFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({ quoteId: id }))).handler(voidQuoteFn_createServerFn_handler, async ({ context, data }) => {
	const { voidQuote } = await import("./insight-80pkFaSy.mjs");
	return run(() => voidQuote(context.userId, data.businessId, data.quoteId));
});
//#endregion
export { abonoFn_createServerFn_handler, acceptInviteFn_createServerFn_handler, accountsFn_createServerFn_handler, adjustStockFn_createServerFn_handler, auditFn_createServerFn_handler, bulkPriceFn_createServerFn_handler, cashMoveFn_createServerFn_handler, cashStateFn_createServerFn_handler, checkoutFn_createServerFn_handler, closeCashFn_createServerFn_handler, confirmPaymentFn_createServerFn_handler, createBranchFn_createServerFn_handler, createBusinessFn_createServerFn_handler, createDemoFn_createServerFn_handler, createInviteFn_createServerFn_handler, createLoanFn_createServerFn_handler, dashboardFn_createServerFn_handler, deleteBusinessFn_createServerFn_handler, discardParkedFn_createServerFn_handler, expenseFn_createServerFn_handler, financialsFn_createServerFn_handler, getSaleFn_createServerFn_handler, importProductsFn_createServerFn_handler, journalFn_createServerFn_handler, ledgerFn_createServerFn_handler, listBusinessesFn_createServerFn_handler, listCategoriesFn_createServerFn_handler, listCustomersFn_createServerFn_handler, listExpensesFn_createServerFn_handler, listLoansFn_createServerFn_handler, listMembersFn_createServerFn_handler, listMovementsFn_createServerFn_handler, listParkedFn_createServerFn_handler, listPendingFn_createServerFn_handler, listProductsFn_createServerFn_handler, listPurchasesFn_createServerFn_handler, listQuotesFn_createServerFn_handler, listSalesFn_createServerFn_handler, listSuppliersFn_createServerFn_handler, lockFn_createServerFn_handler, manualJournalFn_createServerFn_handler, openCashFn_createServerFn_handler, parkSaleFn_createServerFn_handler, payLoanFn_createServerFn_handler, paySupplierFn_createServerFn_handler, postCountFn_createServerFn_handler, purchaseFn_createServerFn_handler, reportFn_createServerFn_handler, resolveCodeFn_createServerFn_handler, returnSaleFn_createServerFn_handler, reverseAbonoFn_createServerFn_handler, saveAccountFn_createServerFn_handler, saveCustomerFn_createServerFn_handler, saveProductFn_createServerFn_handler, saveQuoteFn_createServerFn_handler, saveSupplierFn_createServerFn_handler, statementFn_createServerFn_handler, transferFn_createServerFn_handler, updateBusinessFn_createServerFn_handler, updateCapsFn_createServerFn_handler, voidQuoteFn_createServerFn_handler };

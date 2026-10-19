import { o as __toESM } from "../_runtime.mjs";
import { a as require_react, i as require_jsx_runtime, r as useQueryClient, t as useQuery } from "../_libs/react+tanstack__react-query.mjs";
import { a as getServerFnById, i as TSS_SERVER_FUNCTION, r as createServerFn } from "./ssr.mjs";
import { Jt as number, Qt as string, Ut as array, Vt as _enum, Wt as boolean, Yt as object, en as unknown } from "../_libs/@better-auth/core+[...].mjs";
import { i as signOut, t as authClient } from "./client-1vAx-gM_.mjs";
import { a as UNITS, d as money, f as qrPayload, i as ROLE_LABEL, n as BUSINESS_TYPES, o as calcCart, p as suggestPrice, r as CAP_LABEL, s as capsFor, t as ALL_CAPS, u as labelGrid } from "./money-CSNXw54d.mjs";
import { t as authMiddleware } from "./middleware-BHFVr5iF.mjs";
import { a as hasGateSessionMarker } from "./server-Cmv9tx2Y.mjs";
import { n as Welcome, t as Splash } from "./welcome-CeVH4b0S.mjs";
import { a as LayoutDashboard, i as Menu, n as ShoppingCart, o as Landmark, r as Package } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as ResponsiveContainer, i as Bar, n as YAxis, o as Tooltip, r as XAxis, t as BarChart } from "../_libs/recharts+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-1aKrZdE2.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/**
* Current user + loading state. Same behavior in live preview and when deployed:
*   - Auth enabled -> the real signed-in user; `user` is `null` while
*                            the session resolves (`isPending: true`) and when
*                            signed out (`isPending: false`). Session comes from
*                            Better Auth `useSession()` → `/api/auth/get-session`
*                            (cookie when deployed; bearer in live preview).
*   - Auth disabled (`VITE_AUTH_ENABLED=false`) -> `DEV_USER`, never pending.
*
* Protect a route by waiting out `isPending` before acting on `user` —
* redirecting on `user: null` alone bounces signed-in visitors to sign-in on
* every hard reload:
*
*   import { RedirectToSignIn } from "@/lib/auth/gates";
*   const { user, isPending } = useCurrentUserState();
*   if (isPending) return null;              // still resolving — don't redirect yet
*   if (!user) return <RedirectToSignIn />;  // definitely signed out
*
* `authEnabled` is a module-level constant fixed at load, so the guarded hook
* call keeps a stable hook order across every render of a given component.
*/
function useCurrentUserState() {
	return useSessionUserState();
}
function useSessionUserState() {
	const { data, isPending } = authClient.useSession();
	const id = data?.user.id;
	const displayName = data?.user.name ?? null;
	const primaryEmail = data?.user.email ?? null;
	const profileImageUrl = data?.user.image ?? null;
	const user = (0, import_react.useMemo)(() => id ? {
		id,
		displayName,
		primaryEmail,
		profileImageUrl,
		isDevFallback: false
	} : null, [
		id,
		displayName,
		primaryEmail,
		profileImageUrl
	]);
	return (0, import_react.useMemo)(() => ({
		user,
		isPending
	}), [user, isPending]);
}
/**
* Convenience view of `useCurrentUserState().user` for display (e.g.
* `user?.displayName ?? "Guest"`). NOTE: `null` means *loading OR signed out* —
* for redirects/guards use `useCurrentUserState()` and check `isPending`.
*/
function useCurrentUser() {
	return useCurrentUserState().user;
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
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
var id = string().min(8, "Falta el negocio");
var cents = number().int().min(0);
var biz = object({ businessId: id });
var listBusinessesFn = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("f2a72aac64bbb4d96352becc892718d72dc95abb192f492547c0d880916b2d7b"));
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
var createBusinessFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(businessInput)).handler(createSsrRpc("3e0e5bb5bbc681271c3ffb475bbbd4de767c23e631fe9b907f995f482016c908"));
var updateBusinessFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(businessInput.omit({ displayName: true }).extend({
	businessId: id,
	invoicePrefix: string(),
	taxRateBps: number().int().min(0).max(3e3),
	creditDays: number().int().min(0).max(180),
	allowNegativeStock: boolean()
}))).handler(createSsrRpc("35d4833618dd61589d490fdee6be841b337288f54a58d5d3b279d1ccca0bbf67"));
var deleteBusinessFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(object({
	businessId: id,
	confirmName: string()
}))).handler(createSsrRpc("5ae1c3edcd3acd65d1322913e8ab74e3e0fde66b95f82bb56eec5a3ce5646802"));
var createDemoFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(object({ displayName: string() }))).handler(createSsrRpc("64833172553659a393060864bf00968ee4da8f30bd7070143ba5b3841d5f83de"));
var listMembersFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz)).handler(createSsrRpc("d1183d1ffcbae4d12d9dd313d229c3faed6c8830f376a15f21ff88639b665553"));
var createInviteFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({ role: string() }))).handler(createSsrRpc("0f782b6ec416a33ae8c5763ce648e847e6aeabaa9c40d0caf99bae740b88d4fb"));
var acceptInviteFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(object({
	code: string().min(4),
	displayName: string()
}))).handler(createSsrRpc("3b669c99f03efbac4989eae0254adbd02f2a1f85f5f28ea9a2dbed8525fb0fd8"));
var updateCapsFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	memberId: id,
	caps: array(string())
}))).handler(createSsrRpc("da10a2721bdec507f4504713e21aa2312cd026818361772d4aae5c568ff129c6"));
var createBranchFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({ name: string() }))).handler(createSsrRpc("151b9eb7ddf361444d03962828d45db11b656b62a125b604bd282a296877b82f"));
var transferFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	fromBranchId: id,
	toBranchId: id,
	productId: id,
	qty: number().int().positive(),
	note: string()
}))).handler(createSsrRpc("598663fe380db0f28919d69aaea533180108027def4ae5762c6782f32308ad2a"));
var listProductsFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	branchId: id,
	query: string()
}))).handler(createSsrRpc("2155c0e309bd350ca2cdce47eed3c766ccc8235886320e79465a8618acf4368e"));
var listCategoriesFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz)).handler(createSsrRpc("58ca9bb60617aa81735403bd257856d38cadfdf2ccc5335b148c6dc45f437784"));
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
var saveProductFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(productInput)).handler(createSsrRpc("2b6a1706859f25ca0a3e45c56cff47c0c095fa05a8634d646c850476d11d730a"));
var adjustStockFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	branchId: id,
	productId: id,
	qtyDelta: number().int(),
	reason: string(),
	note: string()
}))).handler(createSsrRpc("ccb88f64525a39d7d14ce0053020caef42f1705eb6e824d97971065f22f6b64b"));
var listMovementsFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz)).handler(createSsrRpc("8ebf3f3c6613f26c1de30fb89cf32747df9a0f25556c7dc0a4e412f9cbc3a2af"));
var bulkPriceFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	categoryId: string().nullable(),
	field: _enum([
		"price",
		"wholesale",
		"cost"
	]),
	percentBps: number().int()
}))).handler(createSsrRpc("be712ae8a025304e76ed1ea4fdcf0829da1a905c2e5082af05de3060b43841b6"));
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
}))).handler(createSsrRpc("ce34312cc97a6ff119e8406da7947d0524ed1e1db9f90b53a5aa006846cdfefe"));
var postCountFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	branchId: id,
	lines: array(object({
		productId: id,
		counted: number().int().min(0)
	}))
}))).handler(createSsrRpc("b3cec982d9ab66be32ae502b5fc6666fcd2eae48643a1e34d051cfbd145072a8"));
var resolveCodeFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	branchId: id,
	raw: string().min(1)
}))).handler(createSsrRpc("cf3b2253ca1f3088c711364eb7e1565e2c8e0f7f9a317134405b3687d0fe2a39"));
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
var checkoutFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(checkoutSchema)).handler(createSsrRpc("d477e87066ac761e33023f504d516fc2693d9b2552ac3c15b8aa2e6643cbe770"));
var getSaleFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({ saleId: id }))).handler(createSsrRpc("a74e9a35e4f043e5043396f7519bef9bfaa0dafa5d2dd9b056408c10357a3bcc"));
var listSalesFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz)).handler(createSsrRpc("59382d581dafcb2926c71dfc9fa1744e51983f397590040482cdc5997b3f7ad9"));
var returnSaleFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	saleId: id,
	clientId: string().min(8),
	lines: array(object({
		saleItemId: id,
		qty: number().int().positive()
	})),
	refundMethod: _enum(["cash", "transfer"])
}))).handler(createSsrRpc("a97afac739952ce597fb874ec8bdd17f7fa896f8cad047ac96c21a50eae32f0a"));
var confirmPaymentFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({ paymentId: id }))).handler(createSsrRpc("d327e3c28a6c883ef2df530dcb61bfba34af56832c18709d709776d4ca246271"));
var listPendingFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz)).handler(createSsrRpc("0bc4e72b0eb89f4bec3d8d2f03cb8a44c3f0ae65c2050ba93aadfeb3917f0142"));
var parkSaleFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	branchId: id,
	label: string(),
	cart: unknown()
}))).handler(createSsrRpc("16bf8de1d274fc6099dd3d0220699fa552ef7419c3eadb63da81de95ef804065"));
var listParkedFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz)).handler(createSsrRpc("5e307a494f75fb5048aa7fe08e3651f487e05de376482a56112ffc80c39a3fff"));
var discardParkedFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({ parkedId: id }))).handler(createSsrRpc("dd9584ecb4699cd057b69b9e6fe0799ccba0ee068148f2a382e5d6d97a455faa"));
var person = biz.extend({
	id: string().optional(),
	name: string(),
	phone: string(),
	address: string(),
	taxId: string(),
	notes: string()
});
var listCustomersFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz)).handler(createSsrRpc("26565d277fad74695d6c354106940cab7d131958fd95eadb53fe63f0ebc33c2f"));
var saveCustomerFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(person.extend({
	photo: string().nullable(),
	creditLimitCents: cents,
	priceTier: string(),
	blocked: boolean()
}))).handler(createSsrRpc("782bb38fa2f763c4ef10260f4fdb04ec43e418a8fff6732a43706f96a20b6acf"));
var statementFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({ customerId: id }))).handler(createSsrRpc("40cf7586b2116bcd54eea5efbca6d2ca18f6f6e92ba32d0f04e2e7b9c107a0b1"));
var abonoFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	branchId: id,
	customerId: id,
	amountCents: number().int().positive(),
	method: _enum(["cash", "transfer"]),
	reference: string(),
	note: string(),
	clientId: string().min(8)
}))).handler(createSsrRpc("4b97a5b213ef59e84e90954f0db61dca7e065b1cb6008dc1665f1d692b66bd59"));
createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	paymentId: id,
	note: string()
}))).handler(createSsrRpc("25057468fa8165417ebc73cfbee6f6a5fef8bb06c9196d7f7bfd38ee230ff5aa"));
var listSuppliersFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz)).handler(createSsrRpc("7bfb3e164983a70b11177ff45edded146d0042a7f569c2481bf37eed2716426d"));
var saveSupplierFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(person.extend({
	contact: string(),
	terms: string()
}))).handler(createSsrRpc("864eca9c84fbc4e38a5cb10212cc98dc8ec0ea62efabadb2f365231bce8cdb58"));
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
}))).handler(createSsrRpc("98a61eca5381ac20b5ac065af0890952b3e2f08ff49ff83f6cfb6c6490b3182e"));
var listPurchasesFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz)).handler(createSsrRpc("ec51f7468336e204fca6d2adcc2f749333ccefae1d8c3034d61873e0a63bcb49"));
var paySupplierFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	branchId: id,
	supplierId: id,
	amountCents: number().int().positive(),
	method: _enum(["cash", "transfer"]),
	note: string()
}))).handler(createSsrRpc("f85f24e56c0deea952e2c36223a164a89fa4ee291bc23a86d2775836f7396d9a"));
var expenseFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	branchId: id,
	accountKey: string(),
	amountCents: number().int().positive(),
	method: _enum(["cash", "transfer"]),
	payee: string(),
	note: string(),
	receipt: string().nullable(),
	spentOn: string()
}))).handler(createSsrRpc("c0d548338cc4a17f26c3ac5333b5ca54a66795acee127f50770ef69ada9e7bbb"));
var listExpensesFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz)).handler(createSsrRpc("bed980d1378d85dee3dc2f28e238345843004c37e34a97ecf2166e70ffbd3f8b"));
var cashStateFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({ branchId: id }))).handler(createSsrRpc("54ccd7b84fb7a4f92e8e61774d173c1e6ab9fca32ff331e1f56f6b2481ae44a2"));
var openCashFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	branchId: id,
	openingCents: cents
}))).handler(createSsrRpc("568102a7a34097371d3735b4c976b2643bbb53b9227eefa50f8ef59afdbbe059"));
var cashMoveFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	branchId: id,
	direction: _enum(["in", "out"]),
	amountCents: number().int().positive(),
	note: string()
}))).handler(createSsrRpc("edbe33523198e2a99783003c1d0ae1485b7ce0624a550dc999cd033d6b9a51d6"));
var closeCashFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	branchId: id,
	countedCents: cents,
	note: string()
}))).handler(createSsrRpc("131db600a2e641d86c9adf090875e9c3f928eb17f064ed34f730f6faea90d1c8"));
var listLoansFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz)).handler(createSsrRpc("80c16a8e91ffd214a0c5e9bc23cdc22522bd621afa7fdfca95a43bf765a9d206"));
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
}))).handler(createSsrRpc("e82ed761c4622686a90039645b715819db0b4dbf04e0599f106fbab4206860b1"));
var payLoanFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	branchId: id,
	loanId: id,
	principalCents: cents,
	interestCents: cents,
	method: _enum(["cash", "transfer"]),
	note: string()
}))).handler(createSsrRpc("f8863c3855151e59535f8e6ec0d3a2244b5e87c83fbddab5580e2740618bca91"));
var dashboardFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({ branchId: id }))).handler(createSsrRpc("8f8329d33afa9c55f57f8d64715c04742a001a65f6ac8bd8e82951fd6dc1b852"));
var financialsFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	from: string(),
	to: string()
}))).handler(createSsrRpc("c59bb425dd1b497982529a114686d3833e2fa135bd53b580284adb1bc1b86a82"));
var journalFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz)).handler(createSsrRpc("6a298ad2f95fee84821a85f7a663ee9bc6f06c670043b5fb86655a8ddbb08e8a"));
createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	accountId: id,
	from: string(),
	to: string()
}))).handler(createSsrRpc("5edda0046258222df38b6405298dda59513eb21b0acdaf6d78a2f25c6e35fdbb"));
var manualJournalFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	memo: string(),
	lines: array(object({
		accountId: id,
		debitCents: cents,
		creditCents: cents
	})).min(2)
}))).handler(createSsrRpc("98a0c5535ed55c74941ae7af0809a0e510c507f7290cac0c5556afab477d9c84"));
var accountsFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz)).handler(createSsrRpc("f8e48b56593c06f5a3006450568e45e4a26dbf47cb16bbdbc276b8ea91b3ce43"));
createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	code: string(),
	name: string(),
	type: string()
}))).handler(createSsrRpc("bd90739c1a17d4cdac19407c97d3d2ec0a41876225c8d88cda99785ca755d3ac"));
var lockFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	year: number().int(),
	month: number().int(),
	unlock: boolean()
}))).handler(createSsrRpc("db73c7debc41c2c9f6d826c5741e3525b5ba6b16056e917ee1f2999139ce2df5"));
var auditFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz)).handler(createSsrRpc("c9c2fc6c585429751cef26ef4762e367779d04e0e0bbfbc23e2352c6c6fdae3b"));
var reportFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	branchId: string(),
	from: string(),
	to: string()
}))).handler(createSsrRpc("00e4ac06046cc7cacceb9027ec416f09011d8faeae39d1e53610d77c3e0e41f2"));
var saveQuoteFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({
	customerId: string().nullable(),
	note: string(),
	totalCents: cents,
	cart: unknown()
}))).handler(createSsrRpc("f41ae1cbb8a5e5469c739ec081eb12db9fd07429fc7a9f70909bc28f77bf5ae8"));
var listQuotesFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz)).handler(createSsrRpc("02a5642c98f05acf4dfd1e6384d428faa3c324b56b88fec91878751a5ffd4f24"));
var voidQuoteFn = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(parse(biz.extend({ quoteId: id }))).handler(createSsrRpc("7d9443b14e113090fd22bd21cb136fb35e8f0c5c7c41828712502797fe8c4f82"));
var NexoCtx = (0, import_react.createContext)(null);
function useNexo() {
	const value = (0, import_react.useContext)(NexoCtx);
	if (!value) throw new Error("NEXO no está listo");
	return value;
}
function Dashboard() {
	const { business, branchId, go } = useNexo();
	const query = useQuery({
		queryKey: [
			"dash",
			business.id,
			branchId
		],
		queryFn: () => dashboardFn({ data: {
			businessId: business.id,
			branchId
		} })
	});
	const data = query.data;
	const currency = business.currency;
	const cards = data ? [
		["Hoy", data.salesToday],
		["Ayer", data.salesYesterday],
		["Semana", data.salesWeek],
		["Mes", data.salesMonth],
		["Ganancia bruta", data.grossMonth],
		["Utilidad neta", data.netMonth],
		["Caja contable", data.cajaCents],
		["Por cobrar", data.arCents],
		["Por pagar", data.apCents],
		["Gastos del mes", data.expensesMonth]
	] : [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Resumen real del negocio"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl",
				children: business.name
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-2 gap-2",
				children: [
					[
						"Nueva venta",
						"venta",
						""
					],
					[
						"Nueva compra",
						"finanzas",
						"compras"
					],
					[
						"Inventario",
						"inventario",
						"lista"
					],
					[
						"Clientes",
						"mas",
						"clientes"
					],
					[
						"Fiados",
						"mas",
						"fiados"
					],
					[
						"Caja",
						"finanzas",
						"caja"
					],
					[
						"Reportes",
						"mas",
						"reportes"
					],
					[
						"Etiquetas",
						"mas",
						"etiquetas"
					]
				].map(([label, area, screen]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "card min-h-11 px-3 py-3 text-left text-sm font-semibold",
					onClick: () => go(area, screen),
					children: label
				}, label))
			}),
			query.isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-muted",
				children: "Cargando cifras…"
			}),
			query.isError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-clay",
				children: "No se pudo cargar el panel."
			}),
			data && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid grid-cols-2 gap-2",
					children: cards.map(([label, value]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "card px-3 py-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted",
							children: label
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-xl tabular-nums",
							children: money(Number(value), currency)
						})]
					}, String(label)))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "card p-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mb-2 text-sm text-muted",
						children: "Ventas de los últimos siete días"
					}), data.series.every((row) => row.totalCents === 0) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "Aún no hay ventas en esta semana."
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-48",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
							width: "100%",
							height: "100%",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BarChart, {
								data: data.series,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
										dataKey: "day",
										tick: {
											fill: "var(--muted)",
											fontSize: 12
										},
										axisLine: false,
										tickLine: false
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, { hide: true }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
										formatter: (value) => money(Number(value), currency),
										cursor: { fill: "var(--teal-soft)" }
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
										dataKey: "totalCents",
										fill: "var(--teal)",
										radius: 6
									})
								]
							})
						})
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "card space-y-2 p-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-semibold",
							children: "Alertas"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm text-muted",
							children: [
								"Agotados ",
								data.outOfStock,
								" · bajos ",
								data.lowStock,
								" · por vencer ",
								data.expiring,
								" · vencidos ",
								data.expired,
								data.pendingCount > 0 ? ` · pagos por confirmar ${data.pendingCount}` : ""
							]
						}),
						data.pendingCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "min-h-11 text-sm font-semibold text-teal",
							onClick: () => go("mas", "ventas"),
							children: "Confirmar pagos electrónicos"
						}),
						data.alerts.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: "No hay avisos con los datos actuales."
						}),
						data.alerts.map((alert) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "rounded-xl bg-clay-soft px-3 py-2 text-sm text-ink",
							children: alert.text
						}, alert.text))
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "card p-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mb-2 text-sm font-semibold",
							children: "Más vendidos del mes"
						}),
						data.top.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: "Todavía no hay productos vendidos este mes."
						}),
						data.top.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-3 border-t border-line py-2 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: row.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "tabular-nums text-muted",
								children: [
									row.qty,
									" · ",
									money(row.totalCents, currency)
								]
							})]
						}, row.name))
					]
				})
			] })
		]
	});
}
function Button({ tone = "teal", className = "", ...props }) {
	const tones = {
		teal: "bg-teal text-on-teal",
		clay: "bg-clay text-on-clay",
		ghost: "bg-surface text-ink"
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		...props,
		className: `inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition-opacity disabled:opacity-50 ${tones[tone]} ${className}`
	});
}
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "block text-sm",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "mb-1 block text-muted",
			children: label
		}), children]
	});
}
var control = "min-h-11 w-full rounded-xl border border-line bg-paper px-3 text-base text-ink";
function TextInput(props) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		...props,
		className: `${control} ${props.className ?? ""}`
	});
}
function Area(props) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
		...props,
		className: `${control} min-h-24 py-2 ${props.className ?? ""}`
	});
}
function Select(props) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
		...props,
		className: `${control} ${props.className ?? ""}`
	});
}
function Modal({ open, title, onClose, children }) {
	(0, import_react.useEffect)(() => {
		if (!open) return;
		const onKey = (event) => {
			if (event.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);
	if (!open) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed inset-0 z-50 flex items-end justify-center sm:items-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			className: "absolute inset-0 bg-ink/40",
			"aria-label": "Cerrar",
			onClick: onClose
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative z-10 max-h-[92dvh] w-full overflow-auto rounded-t-3xl bg-surface p-4 shadow-none sm:max-w-lg sm:rounded-3xl",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-3 flex items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-xl text-ink",
					children: title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "min-h-11 min-w-11 rounded-xl text-muted",
					onClick: onClose,
					children: "Cerrar"
				})]
			}), children]
		})]
	});
}
function Empty({ title, body }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "card px-4 py-8 text-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-display text-xl",
			children: title
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-sm text-pretty text-muted",
			children: body
		})]
	});
}
async function fileToPhoto(file) {
	const bitmap = await createImageBitmap(file);
	const scale = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height));
	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, Math.round(bitmap.width * scale));
	canvas.height = Math.max(1, Math.round(bitmap.height * scale));
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("No se pudo leer la imagen");
	ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	return canvas.toDataURL("image/jpeg", .72);
}
function todayIn(timeZone) {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit"
	}).format(/* @__PURE__ */ new Date());
}
function Finance() {
	const { business, branchId, screen, go } = useNexo();
	const today = todayIn(business.timezone);
	const from = `${today.slice(0, 8)}01`;
	if (screen === "caja") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cash, {});
	if (screen === "gastos") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Expenses, { today });
	if (screen === "compras") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Purchases, {});
	if (screen === "contabilidad") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Books, {
		from,
		to: today
	});
	if (screen === "prestamos") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Loans, { today });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl",
				children: "Finanzas"
			}),
			[
				["caja", "Caja del turno"],
				["gastos", "Gastos"],
				["compras", "Compras"],
				["contabilidad", "Contabilidad"],
				["prestamos", "Préstamos"]
			].map(([key, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "card min-h-14 w-full px-4 text-left font-semibold",
				onClick: () => go("finanzas", key),
				children: label
			}, key)),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "La caja física y la caja contable se muestran por separado. La apertura no crea un asiento: si el fondo es un aporte nuevo, regístrelo como entrada de capital."
			})
		]
	});
}
function Cash() {
	const { business, branchId } = useNexo();
	const qc = useQueryClient();
	const state = useQuery({
		queryKey: [
			"cash",
			business.id,
			branchId
		],
		queryFn: () => cashStateFn({ data: {
			businessId: business.id,
			branchId
		} })
	});
	const [opening, setOpening] = (0, import_react.useState)("0");
	const [amount, setAmount] = (0, import_react.useState)("");
	const [note, setNote] = (0, import_react.useState)("");
	const [counted, setCounted] = (0, import_react.useState)("");
	const data = state.data;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl",
				children: "Caja"
			}),
			data && !data.open && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "card space-y-2 p-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Fondo inicial contado",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
						inputMode: "decimal",
						value: opening,
						onChange: (event) => setOpening(event.target.value)
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					onClick: () => void openCashFn({ data: {
						businessId: business.id,
						branchId,
						openingCents: Math.round(Number(opening || 0) * 100)
					} }).then((result) => {
						if (!result.ok) toast.error(result.error);
						else {
							toast.success("Caja abierta");
							qc.invalidateQueries();
						}
					}),
					children: "Abrir caja"
				})]
			}),
			data?.open && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "card p-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-muted",
								children: "Esperado en el cajón"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display text-3xl tabular-nums",
								children: money(data.expectedCents, business.currency)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm text-muted",
								children: ["Apertura ", money(data.openingCents, business.currency)]
							})
						]
					}),
					data.movements.map((row, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm",
						children: [
							row.kind,
							" · ",
							money(row.amountCents, business.currency),
							" · ",
							row.note
						]
					}, `${row.createdAt}-${index}`)),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Monto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
							inputMode: "decimal",
							value: amount,
							onChange: (event) => setAmount(event.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Motivo",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
							value: note,
							onChange: (event) => setNote(event.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							tone: "ghost",
							onClick: () => void move("in"),
							children: "Entrada (capital)"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							tone: "ghost",
							onClick: () => void move("out"),
							children: "Retiro"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Arqueo contado",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
							inputMode: "decimal",
							value: counted,
							onChange: (event) => setCounted(event.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						tone: "clay",
						onClick: () => void closeCashFn({ data: {
							businessId: business.id,
							branchId,
							countedCents: Math.round(Number(counted || 0) * 100),
							note
						} }).then((result) => {
							if (!result.ok) toast.error(result.error);
							else {
								toast.success(`Diferencia ${money(result.data.differenceCents, business.currency)}`);
								qc.invalidateQueries();
							}
						}),
						children: "Cerrar caja"
					})
				]
			})
		]
	});
	function move(direction) {
		cashMoveFn({ data: {
			businessId: business.id,
			branchId,
			direction,
			amountCents: Math.round(Number(amount) * 100),
			note
		} }).then((result) => {
			if (!result.ok) toast.error(result.error);
			else {
				toast.success("Movimiento registrado");
				setAmount("");
				qc.invalidateQueries();
			}
		});
	}
}
function Expenses({ today }) {
	const { business, branchId } = useNexo();
	const qc = useQueryClient();
	const list = useQuery({
		queryKey: ["expenses", business.id],
		queryFn: () => listExpensesFn({ data: { businessId: business.id } })
	});
	const [payee, setPayee] = (0, import_react.useState)("");
	const [amount, setAmount] = (0, import_react.useState)("");
	const [key, setKey] = (0, import_react.useState)("servicios");
	const [method, setMethod] = (0, import_react.useState)("cash");
	const [receipt, setReceipt] = (0, import_react.useState)(null);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl",
				children: "Gastos"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "A quién",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
					value: payee,
					onChange: (event) => setPayee(event.target.value)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Monto",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
					inputMode: "decimal",
					value: amount,
					onChange: (event) => setAmount(event.target.value)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Tipo",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
					value: key,
					onChange: (event) => setKey(event.target.value),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "servicios",
							children: "Servicios"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "gastos",
							children: "Operativo"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "salarios",
							children: "Salarios"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "intereses",
							children: "Intereses"
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Pago",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
					value: method,
					onChange: (event) => setMethod(event.target.value),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "cash",
						children: "Efectivo"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "transfer",
						children: "Transferencia"
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				type: "file",
				accept: "image/*",
				capture: "environment",
				onChange: (event) => {
					const file = event.target.files?.[0];
					if (file) fileToPhoto(file).then(setReceipt);
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				onClick: () => void expenseFn({ data: {
					businessId: business.id,
					branchId,
					accountKey: key,
					amountCents: Math.round(Number(amount) * 100),
					method,
					payee,
					note: "",
					receipt,
					spentOn: today
				} }).then((result) => {
					if (!result.ok) toast.error(result.error);
					else {
						toast.success("Gasto registrado");
						setAmount("");
						qc.invalidateQueries();
					}
				}),
				children: "Guardar gasto"
			}),
			(list.data ?? []).map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm",
				children: [
					row.spentOn,
					" · ",
					row.payee,
					" · ",
					money(row.amountCents, business.currency)
				]
			}, row.id))
		]
	});
}
function Purchases() {
	const { business, branchId } = useNexo();
	const qc = useQueryClient();
	const products = useQuery({
		queryKey: [
			"products",
			business.id,
			branchId,
			""
		],
		queryFn: () => listProductsFn({ data: {
			businessId: business.id,
			branchId,
			query: ""
		} })
	});
	const suppliers = useQuery({
		queryKey: ["suppliers", business.id],
		queryFn: () => listSuppliersFn({ data: { businessId: business.id } })
	});
	const history = useQuery({
		queryKey: ["purchases", business.id],
		queryFn: () => listPurchasesFn({ data: { businessId: business.id } })
	});
	const [supplierId, setSupplierId] = (0, import_react.useState)("");
	const [productId, setProductId] = (0, import_react.useState)("");
	const [qty, setQty] = (0, import_react.useState)("1");
	const [cost, setCost] = (0, import_react.useState)("");
	const [freight, setFreight] = (0, import_react.useState)("0");
	const [number, setNumber] = (0, import_react.useState)("");
	const [method, setMethod] = (0, import_react.useState)("cash");
	const [pay, setPay] = (0, import_react.useState)("");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl",
				children: "Compras"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Proveedor",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
					value: supplierId,
					onChange: (event) => setSupplierId(event.target.value),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "",
						children: "Sin proveedor"
					}), (suppliers.data ?? []).map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
						value: row.id,
						children: [
							row.name,
							" · debe ",
							money(row.balanceCents, business.currency)
						]
					}, row.id))]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Producto",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
					value: productId,
					onChange: (event) => setProductId(event.target.value),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "",
						children: "Elegir"
					}), (products.data ?? []).map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: row.id,
						children: row.name
					}, row.id))]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Cantidad",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
							value: qty,
							onChange: (event) => setQty(event.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Costo unitario",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
							value: cost,
							onChange: (event) => setCost(event.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Flete",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
							value: freight,
							onChange: (event) => setFreight(event.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Factura",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
							value: number,
							onChange: (event) => setNumber(event.target.value)
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
				value: method,
				onChange: (event) => setMethod(event.target.value),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "cash",
						children: "Contado efectivo"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "transfer",
						children: "Transferencia"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "credit",
						children: "Crédito"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				onClick: () => void purchaseFn({ data: {
					businessId: business.id,
					branchId,
					supplierId: supplierId || null,
					number,
					method,
					freightCents: Math.round(Number(freight || 0) * 100),
					note: "",
					lines: [{
						productId,
						qty: Number(qty),
						unitCostCents: Math.round(Number(cost || 0) * 100)
					}]
				} }).then((result) => {
					if (!result.ok) toast.error(result.error);
					else {
						toast.success("Compra recibida. El costo promedio se actualizó.");
						qc.invalidateQueries();
					}
				}),
				children: "Recibir mercancía"
			}),
			supplierId && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "card space-y-2 p-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Abono al proveedor",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
						value: pay,
						onChange: (event) => setPay(event.target.value)
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					tone: "ghost",
					onClick: () => void paySupplierFn({ data: {
						businessId: business.id,
						branchId,
						supplierId,
						amountCents: Math.round(Number(pay) * 100),
						method: "cash",
						note: "Abono"
					} }).then((result) => {
						if (!result.ok) toast.error(result.error);
						else {
							toast.success("Pago registrado");
							qc.invalidateQueries();
						}
					}),
					children: "Pagar"
				})]
			}),
			(history.data ?? []).map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm",
				children: [
					row.supplierName,
					" · ",
					money(row.totalCents, business.currency),
					" · ",
					row.method
				]
			}, row.id))
		]
	});
}
function Books({ from, to }) {
	const { business } = useNexo();
	const qc = useQueryClient();
	const fin = useQuery({
		queryKey: [
			"fin",
			business.id,
			from,
			to
		],
		queryFn: () => financialsFn({ data: {
			businessId: business.id,
			from,
			to
		} })
	});
	const journal = useQuery({
		queryKey: ["journal", business.id],
		queryFn: () => journalFn({ data: { businessId: business.id } })
	});
	const accounts = useQuery({
		queryKey: ["accounts", business.id],
		queryFn: () => accountsFn({ data: { businessId: business.id } })
	});
	const [memo, setMemo] = (0, import_react.useState)("");
	const [a1, setA1] = (0, import_react.useState)("");
	const [a2, setA2] = (0, import_react.useState)("");
	const [amount, setAmount] = (0, import_react.useState)("");
	const rows = fin.data;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl",
				children: "Contabilidad"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-muted",
				children: [
					"Partida doble del ",
					from,
					" al ",
					to,
					". Los períodos cerrados rechazan asientos nuevos."
				]
			}),
			rows && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-2 gap-2",
				children: [
					["Ingresos", rows.income],
					["Costo", rows.cost],
					["Gastos", rows.expense],
					["Utilidad", rows.net],
					["Activos", rows.assets],
					["Pasivos", rows.liabilities],
					["Patrimonio", rows.equity],
					["Resultado acumulado", rows.accumulated]
				].map(([label, value]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "card px-3 py-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted",
						children: label
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "tabular-nums font-semibold",
						children: money(Number(value), business.currency)
					})]
				}, String(label)))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "card space-y-2 p-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-semibold",
						children: "Asiento manual"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
						placeholder: "Concepto",
						value: memo,
						onChange: (event) => setMemo(event.target.value)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
						value: a1,
						onChange: (event) => setA1(event.target.value),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "",
							children: "Cuenta débito"
						}), (accounts.data ?? []).map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
							value: row.id,
							children: [
								row.code,
								" ",
								row.name
							]
						}, row.id))]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
						value: a2,
						onChange: (event) => setA2(event.target.value),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "",
							children: "Cuenta crédito"
						}), (accounts.data ?? []).map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
							value: row.id,
							children: [
								row.code,
								" ",
								row.name
							]
						}, row.id))]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
						inputMode: "decimal",
						placeholder: "Monto",
						value: amount,
						onChange: (event) => setAmount(event.target.value)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						onClick: () => {
							const cents = Math.round(Number(amount) * 100);
							manualJournalFn({ data: {
								businessId: business.id,
								memo,
								lines: [{
									accountId: a1,
									debitCents: cents,
									creditCents: 0
								}, {
									accountId: a2,
									debitCents: 0,
									creditCents: cents
								}]
							} }).then((result) => {
								if (!result.ok) toast.error(result.error);
								else {
									toast.success("Asiento registrado");
									qc.invalidateQueries();
								}
							});
						},
						children: "Registrar asiento"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				tone: "ghost",
				onClick: () => {
					const [year, month] = to.split("-").map(Number);
					lockFn({ data: {
						businessId: business.id,
						year,
						month,
						unlock: false
					} }).then((result) => {
						if (!result.ok) toast.error(result.error);
						else toast.success("Período cerrado");
					});
				},
				children: "Cerrar mes en curso"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-2",
				children: (journal.data ?? []).map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "card p-3 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "font-medium",
						children: [
							entry.date,
							" · ",
							entry.memo
						]
					}), entry.lines.map((line) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "tabular-nums text-muted",
						children: [
							line.code,
							" ",
							line.name,
							" ",
							line.debitCents ? `Dr ${money(line.debitCents, business.currency)}` : `Cr ${money(line.creditCents, business.currency)}`
						]
					}, line.code + line.name))]
				}, entry.id))
			})
		]
	});
}
function Loans({ today }) {
	const { business, branchId } = useNexo();
	const qc = useQueryClient();
	const loans = useQuery({
		queryKey: ["loans", business.id],
		queryFn: () => listLoansFn({ data: { businessId: business.id } })
	});
	const [name, setName] = (0, import_react.useState)("");
	const [principal, setPrincipal] = (0, import_react.useState)("");
	const [rate, setRate] = (0, import_react.useState)("0");
	const [months, setMonths] = (0, import_react.useState)("12");
	const [direction, setDirection] = (0, import_react.useState)("received");
	const [payId, setPayId] = (0, import_react.useState)("");
	const [payPrincipal, setPayPrincipal] = (0, import_react.useState)("");
	const [payInterest, setPayInterest] = (0, import_react.useState)("0");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl",
				children: "Préstamos"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Son deudas del negocio, distintas del fiado de clientes."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
				value: direction,
				onChange: (event) => setDirection(event.target.value),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: "received",
					children: "Recibido por el negocio"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: "granted",
					children: "Otorgado por el negocio"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
				placeholder: "Prestamista o deudor",
				value: name,
				onChange: (event) => setName(event.target.value)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
				inputMode: "decimal",
				placeholder: "Capital",
				value: principal,
				onChange: (event) => setPrincipal(event.target.value)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
				inputMode: "decimal",
				placeholder: "Tasa anual %",
				value: rate,
				onChange: (event) => setRate(event.target.value)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
				inputMode: "numeric",
				placeholder: "Plazo en meses",
				value: months,
				onChange: (event) => setMonths(event.target.value)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				onClick: () => void createLoanFn({ data: {
					businessId: business.id,
					branchId,
					direction,
					counterparty: name,
					principalCents: Math.round(Number(principal) * 100),
					rateBps: Math.round(Number(rate) * 100),
					startDate: today,
					termMonths: Number(months),
					frequency: "mensual",
					collateral: "",
					note: "",
					method: "cash"
				} }).then((result) => {
					if (!result.ok) toast.error(result.error);
					else {
						toast.success(`Cuota de referencia ${money(result.data.installmentCents, business.currency)}`);
						qc.invalidateQueries();
					}
				}),
				children: "Registrar préstamo"
			}),
			(loans.data ?? []).map((loan) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "card w-full px-3 py-2 text-left text-sm",
				onClick: () => setPayId(loan.id),
				children: [
					loan.counterparty,
					" · saldo ",
					money(loan.balanceCents, business.currency),
					" · cuota ",
					money(loan.installmentCents, business.currency)
				]
			}, loan.id)),
			payId && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "card space-y-2 p-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
						placeholder: "Capital",
						value: payPrincipal,
						onChange: (event) => setPayPrincipal(event.target.value)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
						placeholder: "Interés",
						value: payInterest,
						onChange: (event) => setPayInterest(event.target.value)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						onClick: () => void payLoanFn({ data: {
							businessId: business.id,
							branchId,
							loanId: payId,
							principalCents: Math.round(Number(payPrincipal || 0) * 100),
							interestCents: Math.round(Number(payInterest || 0) * 100),
							method: "cash",
							note: ""
						} }).then((result) => {
							if (!result.ok) toast.error(result.error);
							else {
								toast.success("Pago aplicado");
								qc.invalidateQueries();
							}
						}),
						children: "Registrar pago"
					})
				]
			})
		]
	});
}
async function qrData(text) {
	return (await import("../_libs/qrcode.mjs").then((n) => /* @__PURE__ */ __toESM(n.t()))).toDataURL(text, {
		margin: 0,
		width: 512,
		errorCorrectionLevel: "M"
	});
}
async function downloadPdf(build, filename) {
	const blob = await build();
	const file = new File([blob], filename, { type: "application/pdf" });
	if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) try {
		await navigator.share({
			files: [file],
			title: filename
		});
		return;
	} catch {}
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
}
function methodLabel(method) {
	if (method === "cash") return "Efectivo";
	if (method === "transfer") return "Transferencia";
	if (method === "card") return "Tarjeta";
	if (method === "credit") return "Fiado";
	return method;
}
async function invoiceBlob(sale, format) {
	const { jsPDF } = await import("../_libs/jspdf.mjs").then((n) => /* @__PURE__ */ __toESM(n.t()));
	const currency = sale.business.currency;
	const qr = await qrData(`nexo:v:${sale.id}`);
	if (format === "letter") {
		const doc = new jsPDF({
			unit: "mm",
			format: "letter"
		});
		doc.setFont("helvetica", "bold");
		doc.setFontSize(18);
		doc.text(sale.business.name, 16, 18);
		doc.setFont("helvetica", "normal");
		doc.setFontSize(10);
		doc.text([
			sale.business.address,
			sale.business.phone,
			sale.business.taxId
		].filter(Boolean), 16, 26);
		doc.setFont("helvetica", "bold");
		doc.text(sale.kind === "return" ? "NOTA DE CRÉDITO" : "COMPROBANTE", 200, 18, { align: "right" });
		doc.setFont("helvetica", "normal");
		doc.text(sale.number, 200, 24, { align: "right" });
		doc.text(new Date(sale.createdAt).toLocaleString("es-NI"), 200, 30, { align: "right" });
		doc.text(`Cliente: ${sale.customerName}`, 16, 48);
		doc.text(`Atendió: ${sale.cashierName}`, 16, 54);
		let y = 66;
		doc.setFont("helvetica", "bold");
		doc.text("Cant.", 16, y);
		doc.text("Descripción", 32, y);
		doc.text("Importe", 200, y, { align: "right" });
		doc.setFont("helvetica", "normal");
		y += 6;
		for (const item of sale.items) {
			doc.text(String(item.qty), 16, y);
			doc.text(item.name.slice(0, 48), 32, y);
			doc.text(money(item.lineTotalCents, currency), 200, y, { align: "right" });
			y += 6;
			if (y > 250) {
				doc.addPage();
				y = 20;
			}
		}
		y += 4;
		const rows = [
			["Subtotal", sale.subtotalCents],
			["Descuento", sale.discountCents],
			["Impuesto", sale.taxCents],
			["Total", sale.totalCents]
		];
		for (const [label, amount] of rows) {
			doc.text(label, 140, y);
			doc.text(money(amount, currency), 200, y, { align: "right" });
			y += 6;
		}
		for (const pay of sale.payments) {
			doc.text(`${methodLabel(pay.method)}${pay.status === "pending" ? " (pendiente)" : ""}`, 16, y);
			doc.text(money(pay.amountCents, currency), 80, y);
			y += 6;
		}
		if (sale.changeCents > 0) {
			doc.text(`Recibido ${money(sale.cashTenderedCents, currency)} · Cambio ${money(sale.changeCents, currency)}`, 16, y);
			y += 8;
		}
		doc.addImage(qr, "PNG", 16, y, 28, 28);
		doc.setFontSize(8);
		doc.text("Comprobante interno. No es factura fiscal electrónica de la DGI.", 48, y + 10);
		doc.text("El código consulta esta venta dentro de NEXO POS.", 48, y + 15);
		return doc.output("blob");
	}
	const width = format === "58" ? 58 : 80;
	const doc = new jsPDF({
		unit: "mm",
		format: [width, 90 + sale.items.length * 8 + sale.payments.length * 6]
	});
	let y = 8;
	doc.setFont("helvetica", "bold");
	doc.setFontSize(12);
	doc.text(sale.business.name, width / 2, y, { align: "center" });
	y += 5;
	doc.setFont("helvetica", "normal");
	doc.setFontSize(8);
	for (const line of [
		sale.business.address,
		sale.business.phone,
		sale.business.taxId
	].filter(Boolean)) {
		doc.text(line, width / 2, y, { align: "center" });
		y += 4;
	}
	doc.text(sale.number, width / 2, y, { align: "center" });
	y += 4;
	doc.text(new Date(sale.createdAt).toLocaleString("es-NI"), width / 2, y, { align: "center" });
	y += 5;
	doc.text(sale.customerName, 4, y);
	y += 5;
	for (const item of sale.items) {
		doc.text(`${item.qty} ${item.name}`.slice(0, 32), 4, y);
		y += 4;
		doc.text(money(item.lineTotalCents, currency), width - 4, y, { align: "right" });
		y += 4;
	}
	doc.setFont("helvetica", "bold");
	doc.text(`Total ${money(sale.totalCents, currency)}`, width / 2, y, { align: "center" });
	y += 5;
	doc.setFont("helvetica", "normal");
	for (const pay of sale.payments) {
		doc.text(`${methodLabel(pay.method)} ${money(pay.amountCents, currency)}`, 4, y);
		y += 4;
	}
	if (sale.changeCents > 0) {
		doc.text(`Cambio ${money(sale.changeCents, currency)}`, 4, y);
		y += 4;
	}
	doc.addImage(qr, "PNG", (width - 24) / 2, y, 24, 24);
	y += 28;
	doc.setFontSize(7);
	doc.text("Comprobante interno, no fiscal.", width / 2, y, { align: "center" });
	return doc.output("blob");
}
async function labelsBlob(options) {
	const { jsPDF } = await import("../_libs/jspdf.mjs").then((n) => /* @__PURE__ */ __toESM(n.t()));
	const JsBarcode = (await import("../_libs/jsbarcode.mjs").then((n) => /* @__PURE__ */ __toESM(n.t()))).default;
	const grid = labelGrid(options);
	const slots = options.products.flatMap((product) => Array.from({ length: options.copies }, () => product));
	const doc = new jsPDF({
		unit: "mm",
		format: "letter"
	});
	let page = 0;
	for (let index = 0; index < slots.length; index += 1) {
		const cellIndex = index % grid.cells.length;
		if (index > 0 && cellIndex === 0) {
			doc.addPage();
			page += 1;
		}
		const cell = grid.cells[cellIndex];
		const product = slots[index];
		doc.setDrawColor(180);
		doc.rect(cell.x, cell.y, cell.w, cell.h);
		let cursor = cell.y + 3;
		if (options.showBusiness) {
			doc.setFontSize(7);
			doc.setFont("helvetica", "normal");
			doc.text(options.businessName.slice(0, 28), cell.x + cell.w / 2, cursor, { align: "center" });
			cursor += 3.5;
		}
		const qrSize = Math.min(cell.w * .42, cell.h * .46);
		if (options.showQr) {
			const image = await qrData(qrPayload(product.id));
			doc.addImage(image, "PNG", cell.x + (cell.w - qrSize) / 2, cursor, qrSize, qrSize);
			cursor += qrSize + 1.5;
		}
		if (options.showName) {
			doc.setFont("helvetica", "bold");
			doc.setFontSize(8);
			doc.text(product.name.slice(0, 32), cell.x + cell.w / 2, cursor, {
				align: "center",
				maxWidth: cell.w - 3
			});
			cursor += 4;
		}
		if (options.showPrice) {
			doc.setFontSize(11);
			doc.text(money(product.priceCents, options.currency), cell.x + cell.w / 2, cursor + 1, { align: "center" });
			cursor += 5;
		}
		if (options.showBarcode && product.barcode && cursor < cell.y + cell.h - 8) try {
			const canvas = document.createElement("canvas");
			JsBarcode(canvas, product.barcode, {
				format: "CODE128",
				displayValue: false,
				margin: 0,
				height: 24
			});
			doc.addImage(canvas.toDataURL("image/png"), "PNG", cell.x + 2, cursor, cell.w - 4, 7);
		} catch {}
	}
	if (!slots.length) {
		doc.setFontSize(12);
		doc.text("Seleccione productos para imprimir.", 20, 20);
	}
	return doc.output("blob");
}
var empty = {
	name: "",
	description: "",
	category: "",
	subcategory: "",
	brand: "",
	sku: "",
	barcode: "",
	cost: "",
	price: "",
	wholesale: "",
	promo: "",
	promoUntil: "",
	volumeQty: "",
	volumePrice: "",
	minQty: "0",
	unit: "unidad",
	expiresOn: "",
	lotCode: "",
	location: "",
	variant: "",
	initialQty: "0",
	taxExempt: false,
	regulated: false,
	active: true,
	favorite: false
};
function volumeTier(qty, price) {
	const minQty = Number(qty);
	const priceCents = Math.round(Number(price) * 100);
	if (!qty || !price || !Number.isInteger(minQty) || minQty < 2 || !Number.isFinite(priceCents) || priceCents < 0) return [];
	return [{
		minQty,
		priceCents
	}];
}
function Inventory() {
	const { business, branchId, screen, go } = useNexo();
	const qc = useQueryClient();
	const [editing, setEditing] = (0, import_react.useState)(null);
	const [form, setForm] = (0, import_react.useState)(empty);
	const [photo, setPhoto] = (0, import_react.useState)(null);
	const [open, setOpen] = (0, import_react.useState)(false);
	const [adjustFor, setAdjustFor] = (0, import_react.useState)(null);
	const [delta, setDelta] = (0, import_react.useState)("");
	const [reason, setReason] = (0, import_react.useState)("Ajuste");
	const [csv, setCsv] = (0, import_react.useState)("nombre,precio,costo,existencia,codigo,categoria,unidad,minimo");
	const [percent, setPercent] = (0, import_react.useState)("10");
	const [field, setField] = (0, import_react.useState)("price");
	const [counts, setCounts] = (0, import_react.useState)({});
	const products = useQuery({
		queryKey: [
			"products",
			business.id,
			branchId,
			""
		],
		queryFn: () => listProductsFn({ data: {
			businessId: business.id,
			branchId,
			query: ""
		} })
	});
	const moves = useQuery({
		queryKey: ["moves", business.id],
		enabled: screen === "movimientos",
		queryFn: () => listMovementsFn({ data: { businessId: business.id } })
	});
	const categories = useQuery({
		queryKey: ["cats", business.id],
		queryFn: () => listCategoriesFn({ data: { businessId: business.id } })
	});
	function startNew() {
		setEditing(null);
		setForm(empty);
		setPhoto(null);
		setOpen(true);
	}
	function startEdit(product) {
		setEditing(product);
		setPhoto(product.photo);
		setForm({
			...empty,
			name: product.name,
			description: product.description,
			category: product.categoryName,
			subcategory: product.subcategory,
			brand: product.brand,
			sku: product.sku,
			barcode: product.barcode,
			cost: (product.costCents / 100).toString(),
			price: (product.priceCents / 100).toString(),
			wholesale: (product.wholesaleCents / 100).toString(),
			promo: product.promoCents == null ? "" : (product.promoCents / 100).toString(),
			promoUntil: product.promoUntil ?? "",
			volumeQty: product.volumePrices[0] ? String(product.volumePrices[0].minQty) : "",
			volumePrice: product.volumePrices[0] ? (product.volumePrices[0].priceCents / 100).toString() : "",
			minQty: String(product.minQty),
			unit: product.unit,
			expiresOn: product.expiresOn ?? "",
			lotCode: product.lotCode,
			location: product.location,
			variant: product.variantLabel,
			initialQty: "0",
			taxExempt: product.taxExempt,
			regulated: product.regulated,
			active: product.active,
			favorite: product.favorite
		});
		setOpen(true);
	}
	async function save() {
		const price = Math.round(Number(form.price) * 100);
		const cost = Math.round(Number(form.cost || 0) * 100);
		if (!form.name.trim() || !Number.isFinite(price) || price < 0) {
			toast.error("Nombre y precio de venta son obligatorios");
			return;
		}
		const result = await saveProductFn({ data: {
			businessId: business.id,
			branchId,
			id: editing?.id,
			name: form.name,
			description: form.description,
			photo,
			category: form.category,
			subcategory: form.subcategory,
			brand: form.brand,
			sku: form.sku,
			barcode: form.barcode,
			costCents: Number.isFinite(cost) ? cost : 0,
			priceCents: price,
			wholesaleCents: Math.round(Number(form.wholesale || 0) * 100) || 0,
			promoCents: form.promo ? Math.round(Number(form.promo) * 100) : null,
			promoUntil: form.promoUntil || null,
			volumePrices: volumeTier(form.volumeQty, form.volumePrice),
			taxExempt: form.taxExempt,
			regulated: form.regulated,
			minQty: Number(form.minQty) || 0,
			unit: form.unit,
			supplierId: null,
			expiresOn: form.expiresOn || null,
			lotCode: form.lotCode,
			location: form.location,
			active: form.active,
			favorite: form.favorite,
			parentId: null,
			variantLabel: form.variant,
			initialQty: editing ? 0 : Number(form.initialQty) || 0
		} });
		if (!result.ok) toast.error(result.error);
		else {
			toast.success(editing ? "Producto actualizado" : "Producto registrado");
			setOpen(false);
			qc.invalidateQueries();
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-3xl",
					children: "Inventario"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					onClick: startNew,
					children: "Nuevo"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex gap-2 overflow-auto text-sm",
				children: [
					["lista", "Productos"],
					["conteo", "Conteo"],
					["importar", "Importar"],
					["movimientos", "Historial"]
				].map(([key, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: `min-h-11 shrink-0 rounded-full px-3 ${screen === key ? "bg-teal text-on-teal" : "bg-surface"}`,
					onClick: () => go("inventario", key),
					children: label
				}, key))
			}),
			screen === "lista" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "card grid grid-cols-2 gap-2 p-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Campo",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
								value: field,
								onChange: (event) => setField(event.target.value),
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "price",
										children: "Precio de venta"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "wholesale",
										children: "Mayoreo"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "cost",
										children: "Costo"
									})
								]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Porcentaje",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
								value: percent,
								onChange: (event) => setPercent(event.target.value)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							className: "col-span-2",
							tone: "ghost",
							onClick: () => {
								const bps = Math.round(Number(percent) * 100);
								bulkPriceFn({ data: {
									businessId: business.id,
									categoryId: null,
									field,
									percentBps: bps
								} }).then((result) => {
									if (!result.ok) toast.error(result.error);
									else {
										toast.success(`Se actualizaron ${result.data} productos`);
										qc.invalidateQueries();
									}
								});
							},
							children: "Aplicar cambio de precios"
						})
					]
				}),
				(products.data ?? []).length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, {
					title: "Sin productos",
					body: "Registre el primero o cargue el negocio de demostración desde el inicio."
				}),
				(products.data ?? []).map((product) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "card p-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-3",
						children: [product.photo && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: product.photo,
							alt: "",
							className: "h-16 w-16 rounded-xl object-cover"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 flex-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-semibold",
									children: product.name
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-sm text-muted",
									children: [
										money(product.priceCents, business.currency),
										" · costo ",
										money(product.costCents, business.currency),
										" · hay ",
										product.stock,
										product.barcode ? ` · ${product.barcode}` : ""
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "break-all text-xs text-muted",
									children: qrPayload(product.id)
								})
							]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 flex gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								tone: "ghost",
								onClick: () => startEdit(product),
								children: "Editar"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								tone: "ghost",
								onClick: () => setAdjustFor(product),
								children: "Ajustar"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								tone: "ghost",
								onClick: () => void downloadPdf(() => labelsBlob({
									businessName: business.name,
									currency: business.currency,
									cols: 3,
									rows: 8,
									marginMm: 10,
									gapX: 2,
									gapY: 2,
									showPhoto: false,
									showName: true,
									showPrice: true,
									showQr: true,
									showBarcode: Boolean(product.barcode),
									showBusiness: true,
									copies: 1,
									products: [product]
								}), `${product.name}.pdf`),
								children: "QR"
							})
						]
					})]
				}, product.id))
			] }),
			screen === "movimientos" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [(moves.data ?? []).map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "card px-3 py-2 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-medium",
						children: row.name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-muted",
						children: [
							row.qty > 0 ? "+" : "",
							row.qty,
							" · ",
							row.reason,
							" · ",
							row.branchName
						]
					})]
				}, row.id)), moves.isSuccess && moves.data.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Empty, {
					title: "Sin movimientos",
					body: "Las ventas, compras y ajustes aparecerán aquí."
				})]
			}),
			screen === "importar" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "CSV con encabezado: nombre,precio,costo,existencia,codigo,categoria,unidad,minimo. Los precios van en córdobas, no en centavos."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
						value: csv,
						onChange: (event) => setCsv(event.target.value)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						onClick: () => {
							const lines = csv.trim().split(/\r?\n/).filter(Boolean);
							const header = lines[0]?.split(",").map((cell) => cell.trim().toLowerCase()) ?? [];
							const col = (cells, name) => cells[header.indexOf(name)]?.trim() ?? "";
							const rows = lines.slice(1).map((line) => {
								const cells = line.split(",");
								return {
									name: col(cells, "nombre"),
									priceCents: Math.round(Number(col(cells, "precio") || 0) * 100),
									costCents: Math.round(Number(col(cells, "costo") || 0) * 100),
									qty: Number(col(cells, "existencia") || 0),
									barcode: col(cells, "codigo"),
									category: col(cells, "categoria"),
									unit: col(cells, "unidad") || "unidad",
									minQty: Number(col(cells, "minimo") || 0),
									sku: ""
								};
							});
							importProductsFn({ data: {
								businessId: business.id,
								branchId,
								rows
							} }).then((result) => {
								if (!result.ok) toast.error(result.error);
								else {
									toast.success(`Se importaron ${result.data} productos`);
									qc.invalidateQueries();
								}
							});
						},
						children: "Importar"
					})
				]
			}),
			screen === "conteo" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "Escriba la existencia física. Al confirmar, solo se ajustan las diferencias y queda el motivo “Conteo físico”."
					}),
					(products.data ?? []).map((product) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "card flex items-center justify-between gap-3 px-3 py-2 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [product.name, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "block text-muted",
							children: ["Sistema: ", product.stock]
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
							className: "max-w-24",
							inputMode: "numeric",
							value: counts[product.id] ?? "",
							placeholder: String(product.stock),
							onChange: (event) => setCounts((curr) => ({
								...curr,
								[product.id]: event.target.value
							}))
						})]
					}, product.id)),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						onClick: () => {
							const lines = Object.entries(counts).filter(([, value]) => value !== "").map(([productId, value]) => ({
								productId,
								counted: Number(value)
							}));
							postCountFn({ data: {
								businessId: business.id,
								branchId,
								lines
							} }).then((result) => {
								if (!result.ok) toast.error(result.error);
								else {
									toast.success(`Ajustes aplicados: ${result.data}`);
									setCounts({});
									qc.invalidateQueries();
								}
							});
						},
						children: "Confirmar conteo"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Modal, {
				open,
				title: editing ? "Editar producto" : "Nuevo producto",
				onClose: () => setOpen(false),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Nombre",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
								value: form.name,
								onChange: (event) => setForm({
									...form,
									name: event.target.value
								})
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Descripción",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
								value: form.description,
								onChange: (event) => setForm({
									...form,
									description: event.target.value
								})
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Foto",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "file",
								accept: "image/*",
								capture: "environment",
								onChange: (event) => {
									const file = event.target.files?.[0];
									if (!file) return;
									fileToPhoto(file).then(setPhoto).catch(() => toast.error("No se pudo usar esa foto"));
								}
							})
						}),
						photo && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: photo,
							alt: "",
							className: "h-24 w-24 rounded-xl object-cover"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Categoría",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
										list: "cats",
										value: form.category,
										onChange: (event) => setForm({
											...form,
											category: event.target.value
										})
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("datalist", {
									id: "cats",
									children: (categories.data ?? []).map((cat) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: cat.name }, cat.id))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Subcategoría",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
										value: form.subcategory,
										onChange: (event) => setForm({
											...form,
											subcategory: event.target.value
										})
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Marca",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
										value: form.brand,
										onChange: (event) => setForm({
											...form,
											brand: event.target.value
										})
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "SKU",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
										value: form.sku,
										onChange: (event) => setForm({
											...form,
											sku: event.target.value
										})
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Código de barras",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
										value: form.barcode,
										onChange: (event) => setForm({
											...form,
											barcode: event.target.value
										})
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Variante",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
										value: form.variant,
										placeholder: "Talla, color…",
										onChange: (event) => setForm({
											...form,
											variant: event.target.value
										})
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Unidad",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Select, {
										value: form.unit,
										onChange: (event) => setForm({
											...form,
											unit: event.target.value
										}),
										children: UNITS.map((unit) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: unit }, unit))
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Costo",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
										inputMode: "decimal",
										value: form.cost,
										onChange: (event) => setForm({
											...form,
											cost: event.target.value
										})
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Precio de venta",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
										inputMode: "decimal",
										value: form.price,
										onChange: (event) => setForm({
											...form,
											price: event.target.value
										})
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Mayoreo",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
										inputMode: "decimal",
										value: form.wholesale,
										onChange: (event) => setForm({
											...form,
											wholesale: event.target.value
										})
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Precio promo",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
										inputMode: "decimal",
										value: form.promo,
										onChange: (event) => setForm({
											...form,
											promo: event.target.value
										})
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Promo hasta",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
										type: "date",
										value: form.promoUntil,
										onChange: (event) => setForm({
											...form,
											promoUntil: event.target.value
										})
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Desde cuántas unidades",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
										inputMode: "numeric",
										value: form.volumeQty,
										onChange: (event) => setForm({
											...form,
											volumeQty: event.target.value
										})
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Precio por volumen",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
										inputMode: "decimal",
										value: form.volumePrice,
										onChange: (event) => setForm({
											...form,
											volumePrice: event.target.value
										})
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Mínimo",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
										inputMode: "numeric",
										value: form.minQty,
										onChange: (event) => setForm({
											...form,
											minQty: event.target.value
										})
									})
								}),
								!editing && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Existencia inicial",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
										inputMode: "numeric",
										value: form.initialQty,
										onChange: (event) => setForm({
											...form,
											initialQty: event.target.value
										})
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Vence",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
										type: "date",
										value: form.expiresOn,
										onChange: (event) => setForm({
											...form,
											expiresOn: event.target.value
										})
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Lote",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
										value: form.lotCode,
										onChange: (event) => setForm({
											...form,
											lotCode: event.target.value
										})
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
									label: "Ubicación",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
										value: form.location,
										onChange: (event) => setForm({
											...form,
											location: event.target.value
										})
									})
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex min-h-11 items-center gap-2 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: form.taxExempt,
								onChange: (event) => setForm({
									...form,
									taxExempt: event.target.checked
								})
							}), " Exento de impuesto"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex min-h-11 items-center gap-2 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: form.regulated,
								onChange: (event) => setForm({
									...form,
									regulated: event.target.checked
								})
							}), " Sujeto a control (pide referencia al vender)"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex min-h-11 items-center gap-2 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: form.active,
								onChange: (event) => setForm({
									...form,
									active: event.target.checked
								})
							}), " Activo"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex min-h-11 items-center gap-2 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: form.favorite,
								onChange: (event) => setForm({
									...form,
									favorite: event.target.checked
								})
							}), " Favorito en caja"]
						}),
						business.businessType === "farmacia" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: "En farmacia, registre cada lote como producto. Al escanear el mismo código se ofrece primero el que vence antes. Los vencidos no se venden."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							onClick: () => void save(),
							children: "Guardar"
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Modal, {
				open: Boolean(adjustFor),
				title: "Ajuste de existencia",
				onClose: () => setAdjustFor(null),
				children: adjustFor && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm",
							children: [
								adjustFor.name,
								". Sistema: ",
								adjustFor.stock,
								". Use un número negativo para una salida."
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Cantidad (+/−)",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
								value: delta,
								onChange: (event) => setDelta(event.target.value)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Motivo",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
								value: reason,
								onChange: (event) => setReason(event.target.value)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							onClick: () => {
								adjustStockFn({ data: {
									businessId: business.id,
									branchId,
									productId: adjustFor.id,
									qtyDelta: Number(delta),
									reason,
									note: ""
								} }).then((result) => {
									if (!result.ok) toast.error(result.error);
									else {
										toast.success(`Nueva existencia: ${result.data}`);
										setAdjustFor(null);
										setDelta("");
										qc.invalidateQueries();
									}
								});
							},
							children: "Confirmar ajuste"
						})
					]
				})
			})
		]
	});
}
var subscribeToNothing = () => () => {};
var noGateSessionOnServer = () => false;
/**
* Minimal signed-in identity chip + sign-out. Restyle freely (see the
* `design-ui` skill). Sign-out is only shown when auth is enabled (the
* disabled-auth dev user has nothing to sign out of) and the session is not
* gate-materialized — behind the gate the next request signs the viewer
* straight back in, so a sign-out control there is a broken loop.
*/
function UserButton() {
	const user = useCurrentUser();
	const [signingOut, setSigningOut] = (0, import_react.useState)(false);
	const gateSession = (0, import_react.useSyncExternalStore)(subscribeToNothing, hasGateSessionMarker, noGateSessionOnServer);
	if (!user) return null;
	const label = user.displayName ?? user.primaryEmail ?? "Account";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-2",
		children: [
			user.profileImageUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: user.profileImageUrl,
				alt: "",
				className: "h-8 w-8 rounded-full object-cover"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "grid h-8 w-8 place-items-center rounded-full bg-black/10 text-sm font-medium dark:bg-white/20",
				children: label.charAt(0).toUpperCase()
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-sm font-medium",
				children: label
			}),
			!gateSession && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				disabled: signingOut,
				onClick: () => {
					setSigningOut(true);
					signOut().catch(() => setSigningOut(false));
				},
				className: "cursor-pointer text-sm underline-offset-4 opacity-70 hover:underline disabled:cursor-wait disabled:no-underline",
				children: signingOut ? "Signing out…" : "Sign out"
			})
		]
	});
}
function More() {
	const { screen, go } = useNexo();
	if (screen === "clientes" || screen === "fiados") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Customers, { fiados: screen === "fiados" });
	if (screen === "proveedores") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Suppliers, {});
	if (screen === "etiquetas") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Labels, {});
	if (screen === "reportes") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Reports, {});
	if (screen === "equipo") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Team, {});
	if (screen === "sucursales") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Branches, {});
	if (screen === "auditoria") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Audit, {});
	if (screen === "ajustes") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, {});
	if (screen === "integraciones") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Integrations, {});
	if (screen === "ayuda") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Help, {});
	if (screen === "cotizaciones") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Quotes, {});
	if (screen === "ventas") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SalesHistory, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-display text-3xl",
			children: "Más"
		}), [
			["clientes", "Clientes"],
			["fiados", "Fiados y abonos"],
			["proveedores", "Proveedores"],
			["ventas", "Historial de ventas"],
			["etiquetas", "Etiquetas QR"],
			["cotizaciones", "Cotizaciones"],
			["reportes", "Reportes"],
			["equipo", "Empleados"],
			["sucursales", "Sucursales"],
			["auditoria", "Auditoría"],
			["ajustes", "Configuración"],
			["integraciones", "Integraciones"],
			["ayuda", "Ayuda"]
		].map(([key, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			className: "card min-h-12 w-full px-4 text-left font-medium",
			onClick: () => go("mas", key),
			children: label
		}, key))]
	});
}
function Customers({ fiados }) {
	const { business, branchId } = useNexo();
	const qc = useQueryClient();
	const list = useQuery({
		queryKey: ["customers", business.id],
		queryFn: () => listCustomersFn({ data: { businessId: business.id } })
	});
	const [name, setName] = (0, import_react.useState)("");
	const [phone, setPhone] = (0, import_react.useState)("");
	const [limit, setLimit] = (0, import_react.useState)("0");
	const [openId, setOpenId] = (0, import_react.useState)(null);
	const [abono, setAbono] = (0, import_react.useState)("");
	const statement = useQuery({
		queryKey: ["statement", openId],
		enabled: Boolean(openId),
		queryFn: () => statementFn({ data: {
			businessId: business.id,
			customerId: openId
		} })
	});
	const rows = (list.data ?? []).filter((row) => !fiados || row.balanceCents > 0);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl",
				children: fiados ? "Fiados" : "Clientes"
			}),
			!fiados && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "card space-y-2 p-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
						placeholder: "Nombre",
						value: name,
						onChange: (event) => setName(event.target.value)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
						placeholder: "Teléfono",
						value: phone,
						onChange: (event) => setPhone(event.target.value)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
						placeholder: "Límite de crédito (0 = sin fiado)",
						value: limit,
						onChange: (event) => setLimit(event.target.value)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						onClick: () => void saveCustomerFn({ data: {
							businessId: business.id,
							name,
							phone,
							address: "",
							taxId: "",
							photo: null,
							creditLimitCents: Math.round(Number(limit || 0) * 100),
							priceTier: "retail",
							blocked: false,
							notes: ""
						} }).then((result) => {
							if (!result.ok) toast.error(result.error);
							else {
								toast.success("Cliente guardado");
								setName("");
								qc.invalidateQueries();
							}
						}),
						children: "Guardar cliente"
					})
				]
			}),
			rows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "card w-full px-3 py-2 text-left",
				onClick: () => setOpenId(row.id),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-medium",
					children: row.name
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "block text-sm text-muted",
					children: [
						"Saldo ",
						money(row.balanceCents, business.currency),
						" · límite ",
						money(row.creditLimitCents, business.currency)
					]
				})]
			}, row.id)),
			openId && statement.data && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "card space-y-2 p-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-semibold",
						children: statement.data.customer.name
					}),
					statement.data.sales.map((sale) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm",
						children: [
							sale.number,
							" · ",
							money(sale.totalCents, business.currency),
							" ",
							sale.dueOn ? `· vence ${sale.dueOn}` : ""
						]
					}, sale.id)),
					statement.data.payments.map((pay) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm",
						children: [
							pay.receiptNumber,
							" · ",
							pay.method,
							" · ",
							money(pay.amountCents, business.currency),
							" ",
							pay.reversesId ? "(reversión)" : ""
						]
					}, pay.id)),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
						placeholder: "Abono",
						value: abono,
						onChange: (event) => setAbono(event.target.value)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						onClick: () => void abonoFn({ data: {
							businessId: business.id,
							branchId,
							customerId: openId,
							amountCents: Math.round(Number(abono) * 100),
							method: "cash",
							reference: "",
							note: "",
							clientId: crypto.randomUUID()
						} }).then((result) => {
							if (!result.ok) toast.error(result.error);
							else {
								toast.success(`Recibo ${result.data.receipt}`);
								setAbono("");
								qc.invalidateQueries();
							}
						}),
						children: "Registrar abono"
					})
				]
			})
		]
	});
}
function Suppliers() {
	const { business } = useNexo();
	const qc = useQueryClient();
	const list = useQuery({
		queryKey: ["suppliers", business.id],
		queryFn: () => listSuppliersFn({ data: { businessId: business.id } })
	});
	const [name, setName] = (0, import_react.useState)("");
	const [phone, setPhone] = (0, import_react.useState)("");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl",
				children: "Proveedores"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
				placeholder: "Nombre comercial",
				value: name,
				onChange: (event) => setName(event.target.value)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
				placeholder: "Teléfono",
				value: phone,
				onChange: (event) => setPhone(event.target.value)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				onClick: () => void saveSupplierFn({ data: {
					businessId: business.id,
					name,
					phone,
					contact: "",
					address: "",
					taxId: "",
					terms: "",
					notes: ""
				} }).then((result) => {
					if (!result.ok) toast.error(result.error);
					else {
						toast.success("Proveedor guardado");
						qc.invalidateQueries();
					}
				}),
				children: "Guardar"
			}),
			(list.data ?? []).map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "card px-3 py-2 text-sm",
				children: [
					row.name,
					" · por pagar ",
					money(row.balanceCents, business.currency)
				]
			}, row.id))
		]
	});
}
function Labels() {
	const { business, branchId } = useNexo();
	const products = useQuery({
		queryKey: [
			"products",
			business.id,
			branchId,
			""
		],
		queryFn: () => listProductsFn({ data: {
			businessId: business.id,
			branchId,
			query: ""
		} })
	});
	const [picked, setPicked] = (0, import_react.useState)([]);
	const [cols, setCols] = (0, import_react.useState)(3);
	const [rows, setRows] = (0, import_react.useState)(8);
	const [margin, setMargin] = (0, import_react.useState)(10);
	const [gap, setGap] = (0, import_react.useState)(2);
	const [copies, setCopies] = (0, import_react.useState)(1);
	const [showBusiness, setShowBusiness] = (0, import_react.useState)(true);
	const [showBarcode, setShowBarcode] = (0, import_react.useState)(false);
	let gridError = "";
	let cells = 0;
	try {
		cells = labelGrid({
			cols,
			rows,
			marginMm: margin,
			gapX: gap,
			gapY: gap
		}).cells.length;
	} catch (error) {
		gridError = error instanceof Error ? error.message : "Cuadrícula inválida";
	}
	const chosen = (products.data ?? []).filter((product) => picked.includes(product.id));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl",
				children: "Etiquetas"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Hoja carta 21.59 × 27.94 cm. El QR guarda el identificador del producto, no el precio."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Columnas",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
							inputMode: "numeric",
							value: cols,
							onChange: (event) => setCols(Number(event.target.value))
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Filas",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
							inputMode: "numeric",
							value: rows,
							onChange: (event) => setRows(Number(event.target.value))
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Margen mm",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
							inputMode: "numeric",
							value: margin,
							onChange: (event) => setMargin(Number(event.target.value))
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Separación mm",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
							inputMode: "numeric",
							value: gap,
							onChange: (event) => setGap(Number(event.target.value))
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Copias",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
							inputMode: "numeric",
							value: copies,
							onChange: (event) => setCopies(Number(event.target.value))
						})
					})
				]
			}),
			gridError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-clay",
				children: gridError
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-muted",
				children: [cells, " etiquetas por hoja."]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "flex min-h-11 items-center gap-2 text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "checkbox",
					checked: showBusiness,
					onChange: (event) => setShowBusiness(event.target.checked)
				}), " Nombre del negocio"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "flex min-h-11 items-center gap-2 text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "checkbox",
					checked: showBarcode,
					onChange: (event) => setShowBarcode(event.target.checked)
				}), " Código de barras si existe"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mx-auto w-full max-w-sm bg-white p-2 shadow",
				style: { aspectRatio: "8.5 / 11" },
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid h-full w-full",
					style: {
						gridTemplateColumns: `repeat(${Math.max(cols, 1)}, 1fr)`,
						gridTemplateRows: `repeat(${Math.max(rows, 1)}, 1fr)`,
						gap: 2,
						padding: 4
					},
					children: Array.from({ length: cells }).map((_, index) => {
						const product = chosen[index % Math.max(chosen.length, 1)];
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "overflow-hidden border border-line p-0.5 text-center text-[8px] text-ink",
							children: product ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mx-auto my-0.5 h-4 w-4 bg-ink" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "truncate font-semibold",
									children: product.name
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: money(product.priceCents, business.currency) })
							] }) : null
						}, index);
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				tone: "ghost",
				onClick: () => setPicked((products.data ?? []).map((product) => product.id)),
				children: "Seleccionar todos"
			}),
			(products.data ?? []).map((product) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "flex min-h-11 items-center gap-2 text-sm",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked: picked.includes(product.id),
						onChange: (event) => setPicked((curr) => event.target.checked ? [...curr, product.id] : curr.filter((id) => id !== product.id))
					}),
					product.name,
					" · ",
					money(product.priceCents, business.currency)
				]
			}, product.id)),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				disabled: Boolean(gridError) || chosen.length === 0,
				onClick: () => void downloadPdf(() => labelsBlob({
					businessName: business.name,
					currency: business.currency,
					cols,
					rows,
					marginMm: margin,
					gapX: gap,
					gapY: gap,
					showPhoto: false,
					showName: true,
					showPrice: true,
					showQr: true,
					showBarcode,
					showBusiness,
					copies: Math.max(1, copies),
					products: chosen
				}), "etiquetas-nexo.pdf"),
				children: "Generar PDF"
			})
		]
	});
}
function Reports() {
	const { business, branchId } = useNexo();
	const today = todayIn(business.timezone);
	const [from, setFrom] = (0, import_react.useState)(`${today.slice(0, 8)}01`);
	const [to, setTo] = (0, import_react.useState)(today);
	const data = useQuery({
		queryKey: [
			"report",
			business.id,
			branchId,
			from,
			to
		],
		queryFn: () => reportFn({ data: {
			businessId: business.id,
			branchId,
			from,
			to
		} })
	}).data;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl",
				children: "Reportes"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
					type: "date",
					value: from,
					onChange: (event) => setFrom(event.target.value)
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
					type: "date",
					value: to,
					onChange: (event) => setTo(event.target.value)
				})]
			}),
			data && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-2 gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "Ventas netas",
							value: money(data.netSales, business.currency)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "Margen bruto",
							value: money(data.gross, business.currency)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "Gastos",
							value: money(data.expenses, business.currency)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "Utilidad neta",
							value: money(data.net, business.currency)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "Período anterior",
							value: money(data.previousCents, business.currency)
						})
					]
				}),
				data.byCashier.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm",
					children: [
						row.name,
						": ",
						money(row.totalCents, business.currency)
					]
				}, row.name)),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-semibold",
					children: "Ganancia por producto"
				}),
				data.products.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm",
					children: [
						row.name,
						" · ",
						row.qty,
						" · ",
						money(row.profitCents, business.currency)
					]
				}, row.name)),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-semibold",
					children: "Sin movimiento"
				}),
				data.quiet.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "No hay productos quietos con existencia en este período."
				}),
				data.quiet.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm",
					children: [
						row.name,
						" · hay ",
						row.qty
					]
				}, row.name)),
				data.hints.map((hint) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "rounded-xl bg-teal-soft px-3 py-2 text-sm",
					children: [
						hint.name,
						": se vendieron ",
						hint.qty,
						" en el período y dejó ",
						money(hint.profitCents, business.currency),
						" de margen."
					]
				}, hint.name)),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					tone: "ghost",
					onClick: () => {
						const csv = [
							"concepto,monto",
							`ventas,${data.netSales / 100}`,
							`margen,${data.gross / 100}`,
							`utilidad,${data.net / 100}`
						].join("\n");
						const blob = new Blob([csv], { type: "text/csv" });
						const url = URL.createObjectURL(blob);
						const link = document.createElement("a");
						link.href = url;
						link.download = "reporte-nexo.csv";
						link.click();
					},
					children: "Descargar CSV"
				})
			] })
		]
	});
}
function Stat({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "card px-3 py-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-semibold tabular-nums",
			children: value
		})]
	});
}
function Team() {
	const { business, displayName } = useNexo();
	const qc = useQueryClient();
	const members = useQuery({
		queryKey: ["members", business.id],
		queryFn: () => listMembersFn({ data: { businessId: business.id } })
	});
	const [role, setRole] = (0, import_react.useState)("cashier");
	const [code, setCode] = (0, import_react.useState)("");
	const [join, setJoin] = (0, import_react.useState)("");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl",
				children: "Equipo"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Select, {
				value: role,
				onChange: (event) => setRole(event.target.value),
				children: Object.entries(ROLE_LABEL).filter(([key]) => key !== "owner").map(([key, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: key,
					children: label
				}, key))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				onClick: () => void createInviteFn({ data: {
					businessId: business.id,
					role
				} }).then((result) => {
					if (!result.ok) toast.error(result.error);
					else setCode(result.data);
				}),
				children: "Crear código de invitación"
			}),
			code && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-display text-3xl tracking-widest",
				children: code
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "La otra persona inicia sesión y escribe el código. Caduca en 7 días y sirve una vez."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
				placeholder: "Tengo un código",
				value: join,
				onChange: (event) => setJoin(event.target.value)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				tone: "ghost",
				onClick: () => void acceptInviteFn({ data: {
					code: join,
					displayName
				} }).then((result) => {
					if (!result.ok) toast.error(result.error);
					else {
						toast.success("Se unió al negocio");
						qc.invalidateQueries();
					}
				}),
				children: "Unirme"
			}),
			(members.data ?? []).map((member) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "card p-3 text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "font-medium",
					children: [
						member.displayName,
						" · ",
						ROLE_LABEL[member.role] ?? member.role
					]
				}), member.role !== "owner" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-2 flex flex-wrap gap-2",
					children: ALL_CAPS.map((cap) => {
						const on = capsFor(member.role, member.caps).includes(cap);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: `min-h-10 rounded-full px-3 ${on ? "bg-teal text-on-teal" : "bg-paper"}`,
							onClick: () => {
								const next = new Set(capsFor(member.role, member.caps));
								if (next.has(cap)) next.delete(cap);
								else next.add(cap);
								updateCapsFn({ data: {
									businessId: business.id,
									memberId: member.id,
									caps: [...next]
								} }).then((result) => {
									if (!result.ok) toast.error(result.error);
									else qc.invalidateQueries();
								});
							},
							children: CAP_LABEL[cap]
						}, cap);
					})
				})]
			}, member.id))
		]
	});
}
function Branches() {
	const { business, branchId } = useNexo();
	const qc = useQueryClient();
	const products = useQuery({
		queryKey: [
			"products",
			business.id,
			branchId,
			""
		],
		queryFn: () => listProductsFn({ data: {
			businessId: business.id,
			branchId,
			query: ""
		} })
	});
	const [name, setName] = (0, import_react.useState)("");
	const [productId, setProductId] = (0, import_react.useState)("");
	const [to, setTo] = (0, import_react.useState)("");
	const [qty, setQty] = (0, import_react.useState)("1");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl",
				children: "Sucursales"
			}),
			business.branches.map((branch) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm",
				children: [branch.name, branch.isDefault ? " · principal" : ""]
			}, branch.id)),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
				placeholder: "Nueva sucursal",
				value: name,
				onChange: (event) => setName(event.target.value)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				onClick: () => void createBranchFn({ data: {
					businessId: business.id,
					name
				} }).then((result) => {
					if (!result.ok) toast.error(result.error);
					else {
						toast.success("Sucursal creada");
						qc.invalidateQueries();
					}
				}),
				children: "Crear sucursal"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
				value: productId,
				onChange: (event) => setProductId(event.target.value),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: "",
					children: "Producto a trasladar"
				}), (products.data ?? []).map((product) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: product.id,
					children: product.name
				}, product.id))]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
				value: to,
				onChange: (event) => setTo(event.target.value),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: "",
					children: "Sucursal destino"
				}), business.branches.filter((branch) => branch.id !== branchId).map((branch) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: branch.id,
					children: branch.name
				}, branch.id))]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
				value: qty,
				onChange: (event) => setQty(event.target.value)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				tone: "ghost",
				onClick: () => void transferFn({ data: {
					businessId: business.id,
					fromBranchId: branchId,
					toBranchId: to,
					productId,
					qty: Number(qty),
					note: ""
				} }).then((result) => {
					if (!result.ok) toast.error(result.error);
					else {
						toast.success("Traslado hecho");
						qc.invalidateQueries();
					}
				}),
				children: "Trasladar"
			})
		]
	});
}
function Audit() {
	const { business } = useNexo();
	const query = useQuery({
		queryKey: ["audit", business.id],
		queryFn: () => auditFn({ data: { businessId: business.id } })
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-display text-3xl",
			children: "Auditoría"
		}), (query.data ?? []).map((row, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "text-sm",
			children: [
				new Date(row.createdAt).toLocaleString("es-NI"),
				" · ",
				row.actor,
				" · ",
				row.action,
				" ",
				row.entity,
				" ",
				row.detail
			]
		}, `${row.createdAt}-${index}`))]
	});
}
function Settings() {
	const { business, selectBusiness } = useNexo();
	const qc = useQueryClient();
	const [name, setName] = (0, import_react.useState)(business.name);
	const [address, setAddress] = (0, import_react.useState)(business.address);
	const [phone, setPhone] = (0, import_react.useState)(business.phone);
	const [taxId, setTaxId] = (0, import_react.useState)(business.taxId);
	const [type, setType] = (0, import_react.useState)(business.businessType);
	const [currency, setCurrency] = (0, import_react.useState)(business.currency);
	const [prefix, setPrefix] = (0, import_react.useState)(business.invoicePrefix);
	const [tax, setTax] = (0, import_react.useState)((business.taxRateBps / 100).toString());
	const [days, setDays] = (0, import_react.useState)(String(business.creditDays));
	const [negative, setNegative] = (0, import_react.useState)(business.allowNegativeStock);
	const [confirm, setConfirm] = (0, import_react.useState)("");
	const [dark, setDark] = (0, import_react.useState)(typeof document !== "undefined" && document.documentElement.classList.contains("dark"));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl",
				children: "Configuración"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserButton, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "card min-h-11 w-full px-3 text-left",
				onClick: () => {
					const next = !dark;
					setDark(next);
					document.documentElement.classList.toggle("dark", next);
					localStorage.setItem("nexo-theme", next ? "dark" : "light");
				},
				children: dark ? "Usar modo claro" : "Usar modo oscuro"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
				value: name,
				onChange: (event) => setName(event.target.value)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
				value: address,
				onChange: (event) => setAddress(event.target.value),
				placeholder: "Dirección"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
				value: phone,
				onChange: (event) => setPhone(event.target.value),
				placeholder: "Teléfono"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
				value: taxId,
				onChange: (event) => setTaxId(event.target.value),
				placeholder: "Identificación fiscal"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Select, {
				value: type,
				onChange: (event) => setType(event.target.value),
				children: BUSINESS_TYPES.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: item.id,
					children: item.label
				}, item.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
				value: currency,
				onChange: (event) => setCurrency(event.target.value),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: "NIO",
					children: "Córdoba (C$)"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: "USD",
					children: "Dólar (US$)"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
				value: prefix,
				onChange: (event) => setPrefix(event.target.value),
				placeholder: "Prefijo de factura"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Impuesto % (no se asume IVA; configúrelo si aplica)",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
					value: tax,
					onChange: (event) => setTax(event.target.value)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Días de crédito",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
					value: days,
					onChange: (event) => setDays(event.target.value)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "flex min-h-11 items-center gap-2 text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "checkbox",
					checked: negative,
					onChange: (event) => setNegative(event.target.checked)
				}), "Permitir existencias negativas"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				onClick: () => void updateBusinessFn({ data: {
					businessId: business.id,
					name,
					address,
					phone,
					taxId,
					businessType: type,
					currency,
					timezone: business.timezone,
					invoicePrefix: prefix,
					taxRateBps: Math.round(Number(tax || 0) * 100),
					creditDays: Number(days || 0),
					allowNegativeStock: negative,
					logo: business.logo
				} }).then((result) => {
					if (!result.ok) toast.error(result.error);
					else {
						toast.success("Configuración guardada");
						qc.invalidateQueries();
					}
				}),
				children: "Guardar"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Escriba el nombre del negocio para eliminarlo",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
					value: confirm,
					onChange: (event) => setConfirm(event.target.value)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				tone: "clay",
				onClick: () => void deleteBusinessFn({ data: {
					businessId: business.id,
					confirmName: confirm
				} }).then((result) => {
					if (!result.ok) toast.error(result.error);
					else {
						toast.success("Negocio eliminado");
						selectBusiness("");
						qc.invalidateQueries();
					}
				}),
				children: "Eliminar negocio"
			})
		]
	});
}
function Integrations() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3 text-sm",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl",
				children: "Integraciones"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "card p-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Google" }), " — El inicio de sesión con Google está activo. NEXO no guarda la contraseña."]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "card p-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Base de datos" }), " — Los datos viven en Postgres, aislados por negocio. No hay un proyecto de Firebase conectado y no se simula."]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "card p-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Hojas, Drive, Calendar y Contactos" }), " — No conectados. Hace falta autorización de Google Cloud. La exportación disponible hoy es CSV y PDF dentro de la app."]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "card p-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Impresora Bluetooth" }), " — El navegador no habla ESC/POS de forma fiable. Use el PDF del ticket, compartir o el cuadro de impresión del teléfono."]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "card p-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Sin internet" }), " — Puede consultar productos ya cargados y, si se corta la red al cobrar, la venta queda en cola en este teléfono. No hay consistencia automática entre varios teléfonos desconectados."]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "card p-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Factura fiscal" }), " — El comprobante es interno. La factura electrónica de la DGI no está integrada."]
			})
		]
	});
}
function Help() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3 text-sm",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl",
				children: "Ayuda"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "1. Cree el negocio y registre un producto con precio, costo y existencia." }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "2. En Inventario, genere el QR. Ese código identifica el producto; el precio se consulta al vender." }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "3. Abra la caja si va a cobrar en efectivo." }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "4. En Venta, escanee o toque el producto, cobre y descargue el comprobante." }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "5. La existencia baja al confirmar. El asiento contable se crea solo." }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Para fiado, el cliente necesita límite de crédito mayor que cero. Un saldo vencido bloquea un fiado nuevo hasta el abono." })
		]
	});
}
function Quotes() {
	const { business, branchId } = useNexo();
	const qc = useQueryClient();
	const products = useQuery({
		queryKey: [
			"products",
			business.id,
			branchId,
			""
		],
		queryFn: () => listProductsFn({ data: {
			businessId: business.id,
			branchId,
			query: ""
		} })
	});
	const quotes = useQuery({
		queryKey: ["quotes", business.id],
		queryFn: () => listQuotesFn({ data: { businessId: business.id } })
	});
	const [productId, setProductId] = (0, import_react.useState)("");
	const [note, setNote] = (0, import_react.useState)("");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl",
				children: "Cotizaciones"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "No mueve inventario ni contabilidad hasta que la pase a una venta."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
				value: productId,
				onChange: (event) => setProductId(event.target.value),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: "",
					children: "Producto"
				}), (products.data ?? []).map((product) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: product.id,
					children: product.name
				}, product.id))]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
				placeholder: "Nota",
				value: note,
				onChange: (event) => setNote(event.target.value)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				onClick: () => {
					const product = products.data?.find((row) => row.id === productId);
					if (!product) return;
					saveQuoteFn({ data: {
						businessId: business.id,
						customerId: null,
						note,
						totalCents: product.priceCents,
						cart: { lines: [{
							productId: product.id,
							name: product.name,
							qty: 1,
							unitPriceCents: product.priceCents,
							discountCents: 0,
							note: "",
							priceTouched: true,
							taxExempt: product.taxExempt,
							regulated: product.regulated
						}] }
					} }).then((result) => {
						if (!result.ok) toast.error(result.error);
						else {
							toast.success(result.data.number);
							qc.invalidateQueries();
						}
					});
				},
				children: "Guardar cotización"
			}),
			(quotes.data ?? []).map((quote) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "card px-3 py-2 text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
					quote.number,
					" · ",
					money(quote.totalCents, business.currency),
					" · ",
					quote.status
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "min-h-11 text-teal",
					onClick: () => void voidQuoteFn({ data: {
						businessId: business.id,
						quoteId: quote.id
					} }).then(() => qc.invalidateQueries()),
					children: "Anular"
				})]
			}, quote.id))
		]
	});
}
function SalesHistory() {
	const { business } = useNexo();
	const qc = useQueryClient();
	const sales = useQuery({
		queryKey: ["sales", business.id],
		queryFn: () => listSalesFn({ data: { businessId: business.id } })
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl",
				children: "Ventas"
			}),
			(sales.data ?? []).map((sale) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "card px-3 py-2 text-sm",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "font-medium",
						children: [
							sale.number,
							" · ",
							sale.kind === "return" ? "Devolución" : "Venta",
							" · ",
							money(sale.totalCents, business.currency)
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-muted",
						children: sale.customerName
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-1 flex gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "min-h-11 text-teal",
							onClick: () => void getSaleFn({ data: {
								businessId: business.id,
								saleId: sale.id
							} }).then((doc) => downloadPdf(() => invoiceBlob(doc, "80"), `${doc.number}.pdf`)),
							children: "PDF"
						}), sale.kind === "sale" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "min-h-11 text-clay",
							onClick: () => void getSaleFn({ data: {
								businessId: business.id,
								saleId: sale.id
							} }).then((doc) => returnSaleFn({ data: {
								businessId: business.id,
								saleId: sale.id,
								clientId: crypto.randomUUID(),
								refundMethod: "cash",
								lines: doc.items.filter((item) => item.qty > item.returnedQty).map((item) => ({
									saleItemId: item.id,
									qty: item.qty - item.returnedQty
								}))
							} })).then((result) => {
								if (!result.ok) toast.error(result.error);
								else {
									toast.success(result.data.number);
									qc.invalidateQueries();
								}
							}),
							children: "Devolver todo"
						})]
					})
				]
			}, sale.id)),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PendingPayments, {})
		]
	});
}
function PendingPayments() {
	const { business } = useNexo();
	const qc = useQueryClient();
	const pending = useQuery({
		queryKey: ["pending", business.id],
		queryFn: () => listPendingFn({ data: { businessId: business.id } })
	});
	const rows = pending.data ?? [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-2 pt-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-xl",
				children: "Pagos por confirmar"
			}),
			pending.isPending && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Buscando transferencias y tarjetas…"
			}),
			!pending.isPending && rows.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "No hay pagos electrónicos esperando confirmación."
			}),
			rows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "card px-3 py-2 text-sm",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "font-medium",
						children: [
							row.number,
							" · ",
							row.method === "card" ? "Tarjeta" : "Transferencia",
							" · ",
							money(row.amountCents, business.currency)
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-muted",
						children: [row.reference || "Sin referencia", " · fondos en tránsito"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "min-h-11 text-teal",
						onClick: () => void confirmPaymentFn({ data: {
							businessId: business.id,
							paymentId: row.id
						} }).then((result) => {
							if (!result.ok) toast.error(result.error);
							else {
								toast.success("Pago confirmado. Pasó de tránsito a bancos.");
								qc.invalidateQueries();
							}
						}),
						children: "Confirmar recibido"
					})
				]
			}, row.id))
		]
	});
}
var OUTBOX = "nexo-outbox";
function readOutbox() {
	try {
		const parsed = JSON.parse(localStorage.getItem(OUTBOX) || "[]");
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}
function Pos() {
	const { business, branchId } = useNexo();
	const qc = useQueryClient();
	const [q, setQ] = (0, import_react.useState)("");
	const [category, setCategory] = (0, import_react.useState)("");
	const [lines, setLines] = (0, import_react.useState)([]);
	const [customerId, setCustomerId] = (0, import_react.useState)(null);
	const [orderDiscount, setOrderDiscount] = (0, import_react.useState)("0");
	const [method, setMethod] = (0, import_react.useState)("cash");
	const [tendered, setTendered] = (0, import_react.useState)("");
	const [confirmed, setConfirmed] = (0, import_react.useState)(false);
	const [reference, setReference] = (0, import_react.useState)("");
	const [cashPart, setCashPart] = (0, import_react.useState)("");
	const [cartOpen, setCartOpen] = (0, import_react.useState)(false);
	const [scanOpen, setScanOpen] = (0, import_react.useState)(false);
	const [manualCode, setManualCode] = (0, import_react.useState)("");
	const [receipt, setReceipt] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [outbox, setOutbox] = (0, import_react.useState)(0);
	const products = useQuery({
		queryKey: [
			"products",
			business.id,
			branchId,
			q
		],
		queryFn: () => listProductsFn({ data: {
			businessId: business.id,
			branchId,
			query: q
		} })
	});
	const customers = useQuery({
		queryKey: ["customers", business.id],
		queryFn: () => listCustomersFn({ data: { businessId: business.id } })
	});
	const parked = useQuery({
		queryKey: ["parked", business.id],
		queryFn: () => listParkedFn({ data: { businessId: business.id } })
	});
	const today = todayIn(business.timezone);
	const customer = customers.data?.find((row) => row.id === customerId) ?? null;
	(0, import_react.useEffect)(() => {
		setOutbox(readOutbox().length);
		const flush = async () => {
			const queue = readOutbox();
			if (!queue.length) return;
			const left = [];
			for (const job of queue) try {
				if (!(await checkoutFn({ data: job })).ok) left.push(job);
			} catch {
				left.push(job);
			}
			localStorage.setItem(OUTBOX, JSON.stringify(left));
			setOutbox(left.length);
			if (left.length !== queue.length) {
				toast.success("Se sincronizaron ventas pendientes");
				qc.invalidateQueries();
			}
		};
		flush();
		window.addEventListener("online", () => void flush());
	}, [qc]);
	const priced = (0, import_react.useMemo)(() => {
		return lines.map((line) => {
			if (line.priceTouched) return line;
			const product = products.data?.find((item) => item.id === line.productId);
			if (!product) return line;
			return {
				...line,
				unitPriceCents: suggestPrice({
					priceCents: product.priceCents,
					wholesaleCents: product.wholesaleCents,
					promoCents: product.promoCents,
					promoUntil: product.promoUntil,
					volumePrices: product.volumePrices
				}, line.qty, customer?.priceTier ?? "retail", today)
			};
		});
	}, [
		lines,
		products.data,
		customer?.priceTier,
		today
	]);
	const discountCents = Math.round(Number(orderDiscount || 0) * 100) || 0;
	let totals = null;
	let totalError = "";
	try {
		totals = priced.length ? calcCart({
			taxRateBps: business.taxRateBps,
			orderDiscountCents: Number.isFinite(discountCents) ? discountCents : 0,
			lines: priced.map((line) => ({
				qty: line.qty,
				unitPriceCents: line.unitPriceCents,
				discountCents: line.discountCents,
				taxExempt: line.taxExempt,
				costCents: 0
			}))
		}) : null;
	} catch (error) {
		totalError = error instanceof Error ? error.message : "Revise el carrito";
	}
	function addProduct(product, note = "") {
		if (!product.active) {
			toast.error("Ese producto está inactivo");
			return;
		}
		if (product.expiresOn && product.expiresOn < today) {
			toast.error(`${product.name} está vencido`);
			return;
		}
		if (product.regulated && !note) {
			const typed = window.prompt(`Referencia de receta o autorización para ${product.name}`) ?? "";
			if (!typed.trim()) return;
			note = typed.trim();
		}
		setLines((current) => {
			const found = current.find((line) => line.productId === product.id && !line.priceTouched);
			if (found) return current.map((line) => line === found ? {
				...line,
				qty: line.qty + 1,
				note: note || line.note
			} : line);
			return [...current, {
				productId: product.id,
				name: product.name,
				qty: 1,
				unitPriceCents: product.priceCents,
				discountCents: 0,
				note,
				priceTouched: false,
				taxExempt: product.taxExempt,
				regulated: product.regulated
			}];
		});
		setCartOpen(true);
		navigator.vibrate?.(12);
	}
	async function onScan(raw) {
		const result = await resolveCodeFn({ data: {
			businessId: business.id,
			branchId,
			raw
		} });
		if (!result.ok) {
			toast.error(result.error);
			return;
		}
		addProduct(result.data);
		setScanOpen(false);
		setManualCode("");
	}
	async function sell() {
		if (!totals || !priced.length) return;
		const cashCents = method === "mixed" ? Math.round(Number(cashPart || 0) * 100) : method === "cash" ? totals.totalCents : 0;
		const rest = totals.totalCents - cashCents;
		const payments = [];
		if (cashCents > 0) payments.push({
			method: "cash",
			amountCents: cashCents,
			confirmed: true
		});
		if (method === "credit") payments.push({
			method: "credit",
			amountCents: totals.totalCents
		});
		else if (method === "transfer" || method === "card") payments.push({
			method,
			amountCents: totals.totalCents,
			reference,
			confirmed
		});
		else if (method === "mixed" && rest > 0) payments.push({
			method: "transfer",
			amountCents: rest,
			reference,
			confirmed
		});
		const tender = cashCents > 0 ? Math.max(cashCents, Math.round(Number((tendered || cashCents / 100).toString()) * 100) || cashCents) : 0;
		const payload = {
			businessId: business.id,
			branchId,
			clientId: crypto.randomUUID(),
			customerId,
			orderDiscountCents: discountCents,
			cashTenderedCents: tender,
			note: "",
			lines: priced.map((line) => ({
				productId: line.productId,
				qty: line.qty,
				unitPriceCents: line.unitPriceCents,
				discountCents: line.discountCents,
				note: line.note
			})),
			payments
		};
		setBusy(true);
		try {
			const result = await checkoutFn({ data: payload });
			if (!result.ok) {
				toast.error(result.error);
				return;
			}
			toast.success(result.data.idempotent ? "Esa venta ya estaba registrada" : `Venta ${result.data.number}`);
			const doc = await getSaleFn({ data: {
				businessId: business.id,
				saleId: result.data.saleId
			} });
			setReceipt(doc);
			setLines([]);
			setCartOpen(false);
			qc.invalidateQueries();
		} catch {
			const queue = readOutbox();
			queue.push(payload);
			localStorage.setItem(OUTBOX, JSON.stringify(queue));
			setOutbox(queue.length);
			toast.message("Sin conexión. La venta quedó guardada en este teléfono.");
			setLines([]);
			setCartOpen(false);
		} finally {
			setBusy(false);
		}
	}
	const visible = (products.data ?? []).filter((product) => !category || product.categoryName === category);
	const categories = [...new Set((products.data ?? []).map((product) => product.categoryName).filter(Boolean))];
	const favorites = (products.data ?? []).filter((product) => product.favorite);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-3xl",
					children: "Venta"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					tone: "ghost",
					onClick: () => setScanOpen(true),
					children: "Escanear"
				})]
			}),
			outbox > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "rounded-xl bg-clay-soft px-3 py-2 text-sm",
				children: [
					outbox,
					" venta",
					outbox === 1 ? "" : "s",
					" pendiente",
					outbox === 1 ? "" : "s",
					" de sincronizar en este teléfono."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
				value: q,
				onChange: (event) => setQ(event.target.value),
				placeholder: "Buscar producto, SKU o código"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2 overflow-auto",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: `min-h-11 shrink-0 rounded-full px-3 text-sm ${category === "" ? "bg-teal text-on-teal" : "bg-surface"}`,
					onClick: () => setCategory(""),
					children: "Todos"
				}), categories.map((name) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: `min-h-11 shrink-0 rounded-full px-3 text-sm ${category === name ? "bg-teal text-on-teal" : "bg-surface"}`,
					onClick: () => setCategory(name),
					children: name
				}, name))]
			}),
			favorites.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex gap-2 overflow-auto",
				children: favorites.map((product) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "card min-h-11 shrink-0 px-3 text-sm",
					onClick: () => addProduct(product),
					children: product.name
				}, product.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [visible.map((product) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "card flex w-full items-center gap-3 px-3 py-2 text-left",
					onClick: () => addProduct(product),
					children: [product.photo ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: product.photo,
						alt: "",
						className: "h-12 w-12 rounded-xl object-cover"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "grid h-12 w-12 place-items-center rounded-xl bg-teal-soft text-xs text-teal",
						children: "QR"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block truncate font-medium",
							children: product.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-sm text-muted",
							children: [
								money(product.priceCents, business.currency),
								" · hay ",
								product.stock,
								" ",
								product.unit,
								product.expiresOn ? ` · vence ${product.expiresOn}` : "",
								product.isDemo ? " · demo" : ""
							]
						})]
					})]
				}, product.id)), products.isSuccess && visible.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "No hay productos para mostrar. Regístrelos en Inventario."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "fixed inset-x-4 bottom-24 z-20 min-h-12 rounded-2xl bg-ink px-4 text-paper lg:left-72",
				onClick: () => setCartOpen(true),
				children: [
					"Carrito · ",
					priced.reduce((s, line) => s + line.qty, 0),
					" · ",
					money(totals?.totalCents ?? 0, business.currency)
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Modal, {
				open: cartOpen,
				title: "Carrito",
				onClose: () => setCartOpen(false),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3",
					children: [
						priced.map((line) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "border-b border-line pb-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-medium",
									children: line.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "tabular-nums",
									children: money(line.unitPriceCents * line.qty - line.discountCents, business.currency)
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-2 flex items-center gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										type: "button",
										tone: "ghost",
										onClick: () => setLines((rows) => rows.flatMap((row) => row.productId === line.productId ? row.qty === 1 ? [] : [{
											...row,
											qty: row.qty - 1
										}] : [row])),
										children: "−"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "tabular-nums",
										children: line.qty
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										type: "button",
										tone: "ghost",
										onClick: () => setLines((rows) => rows.map((row) => row.productId === line.productId ? {
											...row,
											qty: row.qty + 1
										} : row)),
										children: "+"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
										className: "max-w-28",
										inputMode: "decimal",
										"aria-label": "Precio",
										value: (line.unitPriceCents / 100).toString(),
										onChange: (event) => {
											const next = Math.round(Number(event.target.value) * 100);
											if (!Number.isFinite(next) || next < 0) return;
											setLines((rows) => rows.map((row) => row.productId === line.productId ? {
												...row,
												unitPriceCents: next,
												priceTouched: true
											} : row));
										}
									})
								]
							})]
						}, line.productId)),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "block text-sm text-muted",
							children: ["Cliente", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								className: "mt-1 min-h-11 w-full rounded-xl border border-line bg-paper px-3",
								value: customerId ?? "",
								onChange: (event) => setCustomerId(event.target.value || null),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "",
									children: "Consumidor final"
								}), (customers.data ?? []).map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
									value: row.id,
									children: [
										row.name,
										" · saldo ",
										money(row.balanceCents, business.currency)
									]
								}, row.id))]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "block text-sm text-muted",
							children: [
								"Descuento general (",
								business.currency === "USD" ? "US$" : "C$",
								")",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
									inputMode: "decimal",
									value: orderDiscount,
									onChange: (event) => setOrderDiscount(event.target.value)
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-wrap gap-2",
							children: [
								"cash",
								"transfer",
								"card",
								"credit",
								"mixed"
							].map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: `min-h-11 rounded-full px-3 text-sm ${method === item ? "bg-teal text-on-teal" : "bg-paper"}`,
								onClick: () => setMethod(item),
								children: item === "cash" ? "Efectivo" : item === "transfer" ? "Transferencia" : item === "card" ? "Tarjeta" : item === "credit" ? "Fiado" : "Mixto"
							}, item))
						}),
						method === "cash" || method === "mixed" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "block text-sm text-muted",
							children: ["Efectivo recibido", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
								inputMode: "decimal",
								value: tendered,
								placeholder: totals ? (totals.totalCents / 100).toFixed(2) : "0",
								onChange: (event) => setTendered(event.target.value)
							})]
						}) : null,
						method === "mixed" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "block text-sm text-muted",
							children: ["Parte en efectivo", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
								inputMode: "decimal",
								value: cashPart,
								onChange: (event) => setCashPart(event.target.value)
							})]
						}),
						(method === "transfer" || method === "card" || method === "mixed") && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex min-h-11 items-center gap-2 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: confirmed,
								onChange: (event) => setConfirmed(event.target.checked)
							}), "Confirmo que el pago electrónico ya se recibió"]
						}),
						(method === "transfer" || method === "card" || method === "mixed") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
							value: reference,
							placeholder: "Referencia",
							onChange: (event) => setReference(event.target.value)
						}),
						totals && method === "cash" && tendered && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "tabular-nums",
							children: ["Cambio ", money(Math.max(0, Math.round(Number(tendered) * 100) - totals.totalCents), business.currency)]
						}),
						totalError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-clay",
							children: totalError
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-display text-2xl tabular-nums",
							children: ["Total ", money(totals?.totalCents ?? 0, business.currency)]
						}),
						business.taxRateBps > 0 && totals && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm text-muted",
							children: ["Incluye impuesto ", money(totals.taxCents, business.currency)]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								tone: "ghost",
								onClick: () => {
									parkSaleFn({ data: {
										businessId: business.id,
										branchId,
										label: customer?.name || "Mostrador",
										cart: {
											lines: priced,
											customerId,
											orderDiscount
										}
									} }).then((result) => {
										if (!result.ok) toast.error(result.error);
										else {
											toast.success("Venta suspendida");
											setLines([]);
											setCartOpen(false);
											parked.refetch();
										}
									});
								},
								children: "Suspender"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								disabled: busy || !totals,
								onClick: () => void sell(),
								children: busy ? "Cobrando…" : "Cobrar"
							})]
						}),
						(parked.data ?? []).map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "w-full rounded-xl bg-paper px-3 py-2 text-left text-sm",
							onClick: () => {
								const cart = row.cart;
								setLines(cart.lines ?? []);
								setCustomerId(cart.customerId ?? null);
								setOrderDiscount(cart.orderDiscount ?? "0");
								discardParkedFn({ data: {
									businessId: business.id,
									parkedId: row.id
								} });
							},
							children: ["Recuperar ", row.label]
						}, row.id))
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, {
				open: scanOpen,
				title: "Escanear código",
				onClose: () => setScanOpen(false),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scanner, { onCode: (code) => void onScan(code) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm text-muted",
						children: "Si la cámara no está disponible, escriba el código o el texto del QR."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
							value: manualCode,
							placeholder: "nexo:p:… o código de barras",
							onChange: (event) => setManualCode(event.target.value)
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							onClick: () => void onScan(manualCode),
							children: "Usar"
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Modal, {
				open: Boolean(receipt),
				title: receipt ? receipt.number : "Venta",
				onClose: () => setReceipt(null),
				children: receipt && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-3xl tabular-nums",
							children: money(receipt.totalCents, receipt.business.currency)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm text-muted",
							children: [
								receipt.customerName,
								" · cambio ",
								money(receipt.changeCents, receipt.business.currency)
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "button",
									onClick: () => void downloadPdf(() => invoiceBlob(receipt, "80"), `${receipt.number}.pdf`),
									children: "Ticket 80 mm"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "button",
									tone: "ghost",
									onClick: () => void downloadPdf(() => invoiceBlob(receipt, "58"), `${receipt.number}.pdf`),
									children: "Ticket 58 mm"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "button",
									tone: "ghost",
									onClick: () => void downloadPdf(() => invoiceBlob(receipt, "letter"), `${receipt.number}.pdf`),
									children: "Carta"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted",
							children: "Comprobante interno. La factura fiscal de la DGI no está conectada."
						})
					]
				})
			})
		]
	});
}
function Scanner({ onCode }) {
	const videoRef = (0, import_react.useRef)(null);
	const onCodeRef = (0, import_react.useRef)(onCode);
	onCodeRef.current = onCode;
	const [help, setHelp] = (0, import_react.useState)("Apunte al QR del estante o al código de barras.");
	(0, import_react.useEffect)(() => {
		let stop = false;
		let stream = null;
		const Detector = window.BarcodeDetector;
		(async () => {
			if (!navigator.mediaDevices?.getUserMedia) {
				setHelp("Este navegador no abre la cámara. Escriba el código abajo.");
				return;
			}
			try {
				stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
				if (!videoRef.current) return;
				videoRef.current.srcObject = stream;
				await videoRef.current.play();
				if (!Detector) {
					setHelp("La cámara está activa, pero este navegador no decodifica códigos. Escriba el código.");
					return;
				}
				const detector = new Detector({ formats: [
					"qr_code",
					"ean_13",
					"ean_8",
					"code_128",
					"upc_a",
					"upc_e",
					"code_39"
				] });
				const tick = async () => {
					if (stop || !videoRef.current) return;
					try {
						const found = await detector.detect(videoRef.current);
						if (found[0]?.rawValue) {
							onCodeRef.current(found[0].rawValue);
							return;
						}
					} catch {}
					if (!stop) requestAnimationFrame(() => void tick());
				};
				tick();
			} catch {
				setHelp("No se permitió la cámara. Puede escribir el código.");
			}
		})();
		return () => {
			stop = true;
			stream?.getTracks().forEach((track) => track.stop());
		};
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
		ref: videoRef,
		className: "h-52 w-full rounded-2xl bg-ink object-cover",
		muted: true,
		playsInline: true
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "mt-2 text-sm text-muted",
		children: help
	})] });
}
var AREAS = [
	{
		id: "inicio",
		label: "Inicio",
		icon: LayoutDashboard
	},
	{
		id: "venta",
		label: "Ventas",
		icon: ShoppingCart
	},
	{
		id: "inventario",
		label: "Inventario",
		icon: Package
	},
	{
		id: "finanzas",
		label: "Finanzas",
		icon: Landmark
	},
	{
		id: "mas",
		label: "Más",
		icon: Menu
	}
];
function NexoApp({ user }) {
	const qc = useQueryClient();
	const businesses = useQuery({
		queryKey: ["businesses"],
		queryFn: () => listBusinessesFn()
	});
	const [businessId, setBusinessId] = (0, import_react.useState)("");
	const [branchId, setBranchId] = (0, import_react.useState)("");
	const [area, setArea] = (0, import_react.useState)("inicio");
	const [screen, setScreen] = (0, import_react.useState)("menu");
	const displayName = user.displayName || user.primaryEmail || "Propietario";
	(0, import_react.useEffect)(() => {
		if (!businesses.data?.length) return;
		const stored = localStorage.getItem(`nexo-biz:${user.id}`);
		const found = businesses.data.find((row) => row.id === stored) ?? businesses.data[0];
		setBusinessId((current) => current && businesses.data?.some((row) => row.id === current) ? current : found.id);
	}, [businesses.data, user.id]);
	const business = businesses.data?.find((row) => row.id === businessId) ?? null;
	(0, import_react.useEffect)(() => {
		if (!business) return;
		const stored = localStorage.getItem(`nexo-branch:${business.id}`);
		const found = business.branches.find((row) => row.id === stored) ?? business.branches[0];
		if (found) setBranchId(found.id);
	}, [business]);
	const value = (0, import_react.useMemo)(() => {
		if (!business) return null;
		return {
			displayName,
			businesses: businesses.data ?? [],
			business,
			branchId: branchId || business.branches[0]?.id || "",
			setBranch: (id) => {
				setBranchId(id);
				localStorage.setItem(`nexo-branch:${business.id}`, id);
			},
			selectBusiness: (id) => {
				setBusinessId(id);
				if (id) localStorage.setItem(`nexo-biz:${user.id}`, id);
				setArea("inicio");
			},
			area,
			screen,
			go: (next, nextScreen = "menu") => {
				setArea(next);
				setScreen(nextScreen || "menu");
			}
		};
	}, [
		business,
		businesses.data,
		branchId,
		displayName,
		area,
		screen,
		user.id
	]);
	if (businesses.isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "p-6 text-muted",
		children: "Cargando sus negocios…"
	});
	if (businesses.isError) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "p-6 text-clay",
		children: "No se pudieron leer los negocios. Intente de nuevo."
	});
	if (!business || !value) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Onboarding, {
		displayName,
		onCreated: () => void qc.invalidateQueries()
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NexoCtx.Provider, {
		value,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-h-dvh lg:pl-60",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
					className: "nav-pad fixed inset-y-0 left-0 z-30 hidden w-60 flex-col gap-1 border-r border-line bg-surface p-3 lg:flex",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display px-2 text-2xl",
						children: "NEXO"
					}), AREAS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: `min-h-11 rounded-xl px-3 text-left ${area === item.id ? "bg-teal text-on-teal" : ""}`,
						onClick: () => value.go(item.id),
						children: item.label
					}, item.id))]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: "sticky top-0 z-20 flex items-center justify-between gap-2 bg-paper/90 px-4 py-3 backdrop-blur",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate text-sm font-semibold",
							children: business.name
						}), business.branches.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							className: "bg-transparent text-xs text-muted",
							value: value.branchId,
							onChange: (event) => value.setBranch(event.target.value),
							children: business.branches.map((branch) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: branch.id,
								children: branch.name
							}, branch.id))
						})]
					}), businesses.data && businesses.data.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						className: "max-w-40 rounded-xl bg-surface px-2 py-1 text-sm",
						value: business.id,
						onChange: (event) => value.selectBusiness(event.target.value),
						children: businesses.data.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: row.id,
							children: row.name
						}, row.id))
					})]
				}),
				business.isDemo && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mx-4 rounded-xl bg-clay-soft px-3 py-2 text-sm",
					children: "Negocio de demostración. Las ventas y los saldos son de ejemplo y puede borrarlo en Configuración."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
					className: "page-pad px-4 py-3 lg:pb-8",
					children: [
						area === "inicio" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dashboard, {}),
						area === "venta" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pos, {}),
						area === "inventario" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inventory, {}),
						area === "finanzas" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Finance, {}),
						area === "mas" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(More, {})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
					className: "nav-pad fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface lg:hidden",
					children: AREAS.map((item) => {
						const Icon = item.icon;
						const active = area === item.id;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: `flex min-h-14 flex-col items-center justify-center text-xs ${active ? "text-teal" : "text-muted"}`,
							onClick: () => value.go(item.id),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { size: 20 }), item.label]
						}, item.id);
					})
				})
			]
		})
	});
}
function Onboarding({ displayName, onCreated }) {
	const [name, setName] = (0, import_react.useState)("");
	const [type, setType] = (0, import_react.useState)("pulperia");
	const [address, setAddress] = (0, import_react.useState)("");
	const [phone, setPhone] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto max-w-lg space-y-4 px-4 py-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-display text-4xl",
				children: "Cree su negocio"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-pretty text-muted",
				children: "Empieza vacío. Si quiere ver el flujo con datos marcados, cargue la pulpería de demostración."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Nombre comercial",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
					value: name,
					onChange: (event) => setName(event.target.value)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Tipo",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Select, {
					value: type,
					onChange: (event) => setType(event.target.value),
					children: BUSINESS_TYPES.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: item.id,
						children: item.label
					}, item.id))
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Dirección",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
					value: address,
					onChange: (event) => setAddress(event.target.value)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Teléfono",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
					value: phone,
					onChange: (event) => setPhone(event.target.value)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				disabled: busy,
				onClick: () => {
					setBusy(true);
					createBusinessFn({ data: {
						name,
						address,
						phone,
						taxId: "",
						businessType: type,
						currency: "NIO",
						timezone: "America/Managua",
						displayName,
						logo: null
					} }).then((result) => {
						setBusy(false);
						if (!result.ok) toast.error(result.error);
						else onCreated();
					});
				},
				children: "Crear negocio"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				tone: "ghost",
				disabled: busy,
				onClick: () => {
					setBusy(true);
					createDemoFn({ data: { displayName } }).then((result) => {
						setBusy(false);
						if (!result.ok) toast.error(result.error);
						else {
							toast.success("Demostración lista");
							onCreated();
						}
					});
				},
				children: "Cargar pulpería de demostración"
			})
		]
	});
}
function Home() {
	const [mounted, setMounted] = (0, import_react.useState)(false);
	const { user, isPending } = useCurrentUserState();
	(0, import_react.useEffect)(() => setMounted(true), []);
	if (!mounted || isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Splash, {});
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Welcome, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NexoApp, { user });
}
//#endregion
export { Home as component };

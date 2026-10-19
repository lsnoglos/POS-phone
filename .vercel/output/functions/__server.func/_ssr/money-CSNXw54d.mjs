//#region node_modules/.nitro/vite/services/ssr/assets/money-CSNXw54d.js
function allocate(weights, amount) {
	const sum = weights.reduce((s, w) => s + w, 0);
	if (amount <= 0 || sum <= 0) return weights.map(() => 0);
	const raw = weights.map((w) => amount * w / sum);
	const floors = raw.map((n) => Math.floor(n));
	let left = amount - floors.reduce((s, n) => s + n, 0);
	const order = raw.map((n, i) => ({
		i,
		frac: n - Math.floor(n)
	})).sort((a, b) => b.frac - a.frac || a.i - b.i);
	for (const slot of order) {
		if (left <= 0) break;
		floors[slot.i] += 1;
		left -= 1;
	}
	return floors;
}
function calcCart(input) {
	if (!Number.isInteger(input.taxRateBps) || input.taxRateBps < 0 || input.taxRateBps > 5e3) throw new Error("La tasa de impuesto no es válida");
	if (!Number.isInteger(input.orderDiscountCents) || input.orderDiscountCents < 0) throw new Error("El descuento general no es válido");
	const lines = input.lines.map((line) => {
		if (!Number.isInteger(line.qty) || line.qty <= 0) throw new Error("Cantidad inválida");
		if (!Number.isInteger(line.unitPriceCents) || line.unitPriceCents < 0) throw new Error("Precio inválido");
		if (!Number.isInteger(line.discountCents) || line.discountCents < 0) throw new Error("Descuento inválido");
		const gross = line.unitPriceCents * line.qty;
		if (line.discountCents > gross) throw new Error("El descuento supera el importe del producto");
		return {
			...line,
			gross,
			net: gross - line.discountCents
		};
	});
	const subtotalCents = lines.reduce((s, l) => s + l.gross, 0);
	const lineDisc = lines.reduce((s, l) => s + l.discountCents, 0);
	const base = subtotalCents - lineDisc;
	if (input.orderDiscountCents > base) throw new Error("El descuento general supera el subtotal");
	const alloc = allocate(lines.map((l) => l.net), input.orderDiscountCents);
	const shaped = lines.map((line, i) => {
		const after = line.net - alloc[i];
		return {
			after,
			taxBase: line.taxExempt ? 0 : after,
			line
		};
	});
	const taxableCents = shaped.reduce((s, l) => s + l.taxBase, 0);
	const taxCents = Math.round(taxableCents * input.taxRateBps / 1e4);
	const taxAlloc = allocate(shaped.map((l) => l.taxBase), taxCents);
	const costCents = lines.reduce((s, l) => s + l.costCents * l.qty, 0);
	return {
		subtotalCents,
		discountCents: lineDisc + input.orderDiscountCents,
		taxableCents,
		taxCents,
		totalCents: base - input.orderDiscountCents + taxCents,
		costCents,
		lines: shaped.map((row, i) => ({
			discountCents: row.line.discountCents + alloc[i],
			netCents: row.after,
			taxCents: taxAlloc[i],
			lineTotalCents: row.after + taxAlloc[i]
		}))
	};
}
/** Cents belonging to `take` units out of `qty`, after `already` were taken. Sums to `total`. */
function chunkCents(total, qty, already, take) {
	if (take <= 0) return 0;
	if (already + take > qty) throw new Error("La devolución supera lo vendido");
	const prev = Math.floor(total * already / qty);
	if (already + take === qty) return total - prev;
	return Math.floor(total * (already + take) / qty) - prev;
}
function cashChange(cashApplied, tendered) {
	if (!Number.isInteger(tendered) || tendered < 0) throw new Error("El monto recibido no es válido");
	if (cashApplied <= 0) return 0;
	if (tendered < cashApplied) throw new Error("El efectivo recibido no cubre el pago en efectivo");
	return tendered - cashApplied;
}
var LETTER_MM = {
	w: 215.9,
	h: 279.4
};
function labelGrid(opts) {
	const { cols, rows, marginMm, gapX, gapY } = opts;
	if (cols < 1 || rows < 1 || cols > 8 || rows > 16) throw new Error("La cuadrícula no cabe en la hoja");
	if (marginMm < 4 || gapX < 0 || gapY < 0) throw new Error("Márgenes inválidos");
	const innerW = LETTER_MM.w - marginMm * 2 - gapX * (cols - 1);
	const innerH = LETTER_MM.h - marginMm * 2 - gapY * (rows - 1);
	const cellW = innerW / cols;
	const cellH = innerH / rows;
	if (cellW < 18 || cellH < 18) throw new Error("Las etiquetas quedarían demasiado pequeñas");
	const cells = [];
	for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) cells.push({
		x: marginMm + c * (cellW + gapX),
		y: marginMm + r * (cellH + gapY),
		w: cellW,
		h: cellH
	});
	const last = cells[cells.length - 1];
	if (last.x + last.w > LETTER_MM.w + .01 || last.y + last.h > LETTER_MM.h + .01) throw new Error("Las etiquetas se salen de la hoja");
	return {
		cells,
		cellW,
		cellH
	};
}
function money(cents, currency = "NIO") {
	const sign = cents < 0 ? "-" : "";
	const formatted = (Math.abs(cents) / 100).toLocaleString("es-NI", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
	return `${sign}${currency === "USD" ? "US$" : "C$"}${formatted}`;
}
function suggestPrice(product, qty, tier, today) {
	let price = product.priceCents;
	if (tier === "wholesale" && product.wholesaleCents > 0) price = product.wholesaleCents;
	else if (product.promoCents != null && product.promoCents >= 0 && product.promoUntil && product.promoUntil >= today) price = product.promoCents;
	const tiers = [...product.volumePrices].sort((a, b) => a.minQty - b.minQty);
	for (const step of tiers) if (qty >= step.minQty) price = step.priceCents;
	return price;
}
var ROLE_LABEL = {
	owner: "Propietario",
	admin: "Administrador",
	cashier: "Cajero",
	inventory: "Inventarista",
	accountant: "Contador",
	supervisor: "Supervisor"
};
var ALL_CAPS = [
	"sell",
	"refund",
	"products",
	"stock",
	"customers",
	"credit",
	"purchases",
	"expenses",
	"cash",
	"accounting",
	"settings",
	"team",
	"reports"
];
var CAP_LABEL = {
	sell: "Vender",
	refund: "Devolver",
	products: "Productos",
	stock: "Existencias",
	customers: "Clientes",
	credit: "Fiados y abonos",
	purchases: "Compras",
	expenses: "Gastos",
	cash: "Caja",
	accounting: "Contabilidad",
	settings: "Configuración",
	team: "Equipo",
	reports: "Reportes"
};
var ROLE_CAPS = {
	owner: [...ALL_CAPS],
	admin: [...ALL_CAPS],
	cashier: [
		"sell",
		"customers",
		"credit",
		"cash"
	],
	inventory: [
		"products",
		"stock",
		"purchases"
	],
	accountant: [
		"customers",
		"credit",
		"expenses",
		"accounting",
		"reports"
	],
	supervisor: [
		"sell",
		"refund",
		"products",
		"stock",
		"customers",
		"credit",
		"purchases",
		"expenses",
		"cash",
		"accounting",
		"reports"
	]
};
function capsFor(role, custom) {
	if (role === "owner") return [...ALL_CAPS];
	if (custom && custom.length) return custom.filter((c) => ALL_CAPS.includes(c));
	return ROLE_CAPS[role] ?? [];
}
var BUSINESS_TYPES = [
	{
		id: "pulperia",
		label: "Pulpería o abarrotería"
	},
	{
		id: "farmacia",
		label: "Farmacia"
	},
	{
		id: "ferreteria",
		label: "Ferretería"
	},
	{
		id: "ropa",
		label: "Ropa y calzado"
	},
	{
		id: "minimercado",
		label: "Minimercado"
	},
	{
		id: "libreria",
		label: "Librería"
	},
	{
		id: "repuestos",
		label: "Repuestos"
	},
	{
		id: "distribuidora",
		label: "Distribuidora"
	},
	{
		id: "otro",
		label: "Otro negocio"
	}
];
var UNITS = [
	"unidad",
	"caja",
	"paquete",
	"par",
	"docena",
	"kilogramo",
	"litro",
	"libra"
];
function qrPayload(productId) {
	return `nexo:p:${productId}`;
}
//#endregion
export { UNITS as a, cashChange as c, money as d, qrPayload as f, ROLE_LABEL as i, chunkCents as l, BUSINESS_TYPES as n, calcCart as o, suggestPrice as p, CAP_LABEL as r, capsFor as s, ALL_CAPS as t, labelGrid as u };

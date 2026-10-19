/** Pure money and label math. Amounts are integer cents. Quantities are whole units. */

export type CartLineIn = {
  qty: number;
  unitPriceCents: number;
  discountCents: number;
  taxExempt: boolean;
  costCents: number;
};

export type CartInput = {
  taxRateBps: number;
  orderDiscountCents: number;
  lines: CartLineIn[];
};

export type CartLineOut = {
  discountCents: number;
  netCents: number;
  taxCents: number;
  lineTotalCents: number;
};

export type CartTotals = {
  subtotalCents: number;
  discountCents: number;
  taxableCents: number;
  taxCents: number;
  totalCents: number;
  costCents: number;
  lines: CartLineOut[];
};

export function allocate(weights: number[], amount: number): number[] {
  const sum = weights.reduce((s, w) => s + w, 0);
  if (amount <= 0 || sum <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (amount * w) / sum);
  const floors = raw.map((n) => Math.floor(n));
  let left = amount - floors.reduce((s, n) => s + n, 0);
  const order = raw
    .map((n, i) => ({ i, frac: n - Math.floor(n) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const slot of order) {
    if (left <= 0) break;
    floors[slot.i] += 1;
    left -= 1;
  }
  return floors;
}

export function calcCart(input: CartInput): CartTotals {
  if (!Number.isInteger(input.taxRateBps) || input.taxRateBps < 0 || input.taxRateBps > 5000) {
    throw new Error("La tasa de impuesto no es válida");
  }
  if (!Number.isInteger(input.orderDiscountCents) || input.orderDiscountCents < 0) {
    throw new Error("El descuento general no es válido");
  }
  const lines = input.lines.map((line) => {
    if (!Number.isInteger(line.qty) || line.qty <= 0) throw new Error("Cantidad inválida");
    if (!Number.isInteger(line.unitPriceCents) || line.unitPriceCents < 0) {
      throw new Error("Precio inválido");
    }
    if (!Number.isInteger(line.discountCents) || line.discountCents < 0) {
      throw new Error("Descuento inválido");
    }
    const gross = line.unitPriceCents * line.qty;
    if (line.discountCents > gross) throw new Error("El descuento supera el importe del producto");
    return { ...line, gross, net: gross - line.discountCents };
  });
  const subtotalCents = lines.reduce((s, l) => s + l.gross, 0);
  const lineDisc = lines.reduce((s, l) => s + l.discountCents, 0);
  const base = subtotalCents - lineDisc;
  if (input.orderDiscountCents > base) throw new Error("El descuento general supera el subtotal");
  const alloc = allocate(
    lines.map((l) => l.net),
    input.orderDiscountCents,
  );
  const shaped = lines.map((line, i) => {
    const after = line.net - alloc[i];
    return { after, taxBase: line.taxExempt ? 0 : after, line };
  });
  const taxableCents = shaped.reduce((s, l) => s + l.taxBase, 0);
  const taxCents = Math.round((taxableCents * input.taxRateBps) / 10000);
  const taxAlloc = allocate(
    shaped.map((l) => l.taxBase),
    taxCents,
  );
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
      lineTotalCents: row.after + taxAlloc[i],
    })),
  };
}

/** Cents belonging to `take` units out of `qty`, after `already` were taken. Sums to `total`. */
export function chunkCents(total: number, qty: number, already: number, take: number): number {
  if (take <= 0) return 0;
  if (already + take > qty) throw new Error("La devolución supera lo vendido");
  const prev = Math.floor((total * already) / qty);
  if (already + take === qty) return total - prev;
  const next = Math.floor((total * (already + take)) / qty);
  return next - prev;
}

export function cashChange(cashApplied: number, tendered: number): number {
  if (!Number.isInteger(tendered) || tendered < 0) throw new Error("El monto recibido no es válido");
  if (cashApplied <= 0) return 0;
  if (tendered < cashApplied) throw new Error("El efectivo recibido no cubre el pago en efectivo");
  return tendered - cashApplied;
}

export const LETTER_MM = { w: 215.9, h: 279.4 };

export type LabelCell = { x: number; y: number; w: number; h: number };

export function labelGrid(opts: {
  cols: number;
  rows: number;
  marginMm: number;
  gapX: number;
  gapY: number;
}): { cells: LabelCell[]; cellW: number; cellH: number } {
  const { cols, rows, marginMm, gapX, gapY } = opts;
  if (cols < 1 || rows < 1 || cols > 8 || rows > 16) throw new Error("La cuadrícula no cabe en la hoja");
  if (marginMm < 4 || gapX < 0 || gapY < 0) throw new Error("Márgenes inválidos");
  const innerW = LETTER_MM.w - marginMm * 2 - gapX * (cols - 1);
  const innerH = LETTER_MM.h - marginMm * 2 - gapY * (rows - 1);
  const cellW = innerW / cols;
  const cellH = innerH / rows;
  if (cellW < 18 || cellH < 18) throw new Error("Las etiquetas quedarían demasiado pequeñas");
  const cells: LabelCell[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      cells.push({
        x: marginMm + c * (cellW + gapX),
        y: marginMm + r * (cellH + gapY),
        w: cellW,
        h: cellH,
      });
    }
  }
  const last = cells[cells.length - 1];
  if (last.x + last.w > LETTER_MM.w + 0.01 || last.y + last.h > LETTER_MM.h + 0.01) {
    throw new Error("Las etiquetas se salen de la hoja");
  }
  return { cells, cellW, cellH };
}

export function money(cents: number, currency = "NIO"): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents) / 100;
  const formatted = abs.toLocaleString("es-NI", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const symbol = currency === "USD" ? "US$" : "C$";
  return `${sign}${symbol}${formatted}`;
}

export function suggestPrice(
  product: {
    priceCents: number;
    wholesaleCents: number;
    promoCents: number | null;
    promoUntil: string | null;
    volumePrices: { minQty: number; priceCents: number }[];
  },
  qty: number,
  tier: string,
  today: string,
): number {
  let price = product.priceCents;
  if (tier === "wholesale" && product.wholesaleCents > 0) price = product.wholesaleCents;
  else if (
    product.promoCents != null &&
    product.promoCents >= 0 &&
    product.promoUntil &&
    product.promoUntil >= today
  ) {
    price = product.promoCents;
  }
  const tiers = [...product.volumePrices].sort((a, b) => a.minQty - b.minQty);
  for (const step of tiers) {
    if (qty >= step.minQty) price = step.priceCents;
  }
  return price;
}

export const ROLE_LABEL: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  cashier: "Cajero",
  inventory: "Inventarista",
  accountant: "Contador",
  supervisor: "Supervisor",
};

export const ALL_CAPS = [
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
  "reports",
] as const;

export type Cap = (typeof ALL_CAPS)[number];

export const CAP_LABEL: Record<Cap, string> = {
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
  reports: "Reportes",
};

export const ROLE_CAPS: Record<string, Cap[]> = {
  owner: [...ALL_CAPS],
  admin: [...ALL_CAPS],
  cashier: ["sell", "customers", "credit", "cash"],
  inventory: ["products", "stock", "purchases"],
  accountant: ["customers", "credit", "expenses", "accounting", "reports"],
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
    "reports",
  ],
};

export function capsFor(role: string, custom: string[] | null | undefined): Cap[] {
  if (role === "owner") return [...ALL_CAPS];
  if (custom && custom.length) return custom.filter((c): c is Cap => (ALL_CAPS as readonly string[]).includes(c));
  return ROLE_CAPS[role] ?? [];
}

export const BUSINESS_TYPES: { id: string; label: string }[] = [
  { id: "pulperia", label: "Pulpería o abarrotería" },
  { id: "farmacia", label: "Farmacia" },
  { id: "ferreteria", label: "Ferretería" },
  { id: "ropa", label: "Ropa y calzado" },
  { id: "minimercado", label: "Minimercado" },
  { id: "libreria", label: "Librería" },
  { id: "repuestos", label: "Repuestos" },
  { id: "distribuidora", label: "Distribuidora" },
  { id: "otro", label: "Otro negocio" },
];

export const UNITS = ["unidad", "caja", "paquete", "par", "docena", "kilogramo", "litro", "libra"];

export function qrPayload(productId: string): string {
  return `nexo:p:${productId}`;
}

export function parseScan(raw: string): { productId?: string; code: string } {
  const text = raw.trim();
  const match = /^nexo:p:(.+)$/.exec(text);
  if (match) return { productId: match[1], code: text };
  return { code: text };
}

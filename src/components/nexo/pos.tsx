import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  checkoutFn,
  discardParkedFn,
  getSaleFn,
  listCustomersFn,
  listParkedFn,
  listProductsFn,
  parkSaleFn,
  resolveCodeFn,
} from "@/lib/nexo/fns";
import { calcCart, money, suggestPrice } from "@/lib/nexo/money";
import type { CheckoutInput, Product, SaleDoc } from "@/lib/nexo/types";
import { downloadPdf, invoiceBlob } from "@/lib/nexo/pdf";
import { useNexo } from "./context";
import { Button, Modal, TextInput, todayIn } from "./ui";

type Line = {
  productId: string;
  name: string;
  qty: number;
  unitPriceCents: number;
  discountCents: number;
  note: string;
  priceTouched: boolean;
  taxExempt: boolean;
  regulated: boolean;
};

const OUTBOX = "nexo-outbox";

function readOutbox(): CheckoutInput[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(OUTBOX) || "[]") as CheckoutInput[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function Pos() {
  const { business, branchId } = useNexo();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(q), 180);
    return () => window.clearTimeout(timer);
  }, [q]);
  const [category, setCategory] = useState("");
  const cartStorageKey = `nexo-cart:${business.id}:${branchId}`;
  const [lines, setLines] = useState<Line[]>(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(cartStorageKey) || "[]") as unknown;
      if (!Array.isArray(stored)) return [];
      return stored.filter((row): row is Line => Boolean(row && typeof row === "object" &&
        "productId" in row && typeof row.productId === "string" && "qty" in row &&
        typeof row.qty === "number" && Number.isInteger(row.qty) && row.qty > 0 &&
        "name" in row && typeof row.name === "string" && "unitPriceCents" in row &&
        typeof row.unitPriceCents === "number" && Number.isFinite(row.unitPriceCents)));
    } catch { return []; }
  });
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [orderDiscount, setOrderDiscount] = useState("0");
  const [method, setMethod] = useState<"cash" | "transfer" | "card" | "credit" | "mixed">("cash");
  const [tendered, setTendered] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [reference, setReference] = useState("");
  const [cashPart, setCashPart] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [lastScanned, setLastScanned] = useState("");
  useEffect(() => {
    try { sessionStorage.setItem(cartStorageKey, JSON.stringify(lines)); } catch { /* unavailable */ }
  }, [cartStorageKey, lines]);
  const [receipt, setReceipt] = useState<SaleDoc | null>(null);
  const [busy, setBusy] = useState(false);
  const [outbox, setOutbox] = useState(0);
  const products = useQuery({
    queryKey: ["products", business.id, branchId, debouncedQ],
    queryFn: () => listProductsFn({ data: { businessId: business.id, branchId, query: debouncedQ } }),
  });
  const customers = useQuery({
    queryKey: ["customers", business.id],
    queryFn: () => listCustomersFn({ data: { businessId: business.id } }),
  });
  const parked = useQuery({
    queryKey: ["parked", business.id],
    queryFn: () => listParkedFn({ data: { businessId: business.id } }),
  });
  const today = todayIn(business.timezone);
  const customer = customers.data?.find((row) => row.id === customerId) ?? null;

  useEffect(() => {
    setOutbox(readOutbox().filter((job) => job.businessId === business.id).length);
    let flushing = false;
    const flush = async () => {
      if (flushing) return;
      flushing = true;
      // Only sync sales for the currently selected business.
      const queue = readOutbox().filter((job) => job.businessId === business.id);
      if (!queue.length) { flushing = false; return; }
      const left: CheckoutInput[] = [];
      for (const job of queue) {
        try {
          const result = await checkoutFn({ data: job });
          if (!result.ok) left.push(job);
        } catch {
          left.push(job);
        }
      }
      // Never overwrite newly queued sales while a previous batch was being synchronized.
      const inBatch = new Set(queue.map((job) => job.clientId));
      const newer = readOutbox().filter((job) => !inBatch.has(job.clientId));
      const remaining = [...left, ...newer];
      localStorage.setItem(OUTBOX, JSON.stringify(remaining));
      setOutbox(remaining.filter((job) => job.businessId === business.id).length);
      flushing = false;
      if (left.length !== queue.length) {
        toast.success("Se sincronizaron ventas pendientes");
        void qc.invalidateQueries();
      }
    };
    void flush();
    const onOnline = () => void flush();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [qc, business.id]);

  const priced = useMemo(() => {
    return lines.map((line) => {
      if (line.priceTouched) return line;
      const product = products.data?.find((item) => item.id === line.productId);
      if (!product) return line;
      return {
        ...line,
        unitPriceCents: suggestPrice(
          {
            priceCents: product.priceCents,
            wholesaleCents: product.wholesaleCents,
            promoCents: product.promoCents,
            promoUntil: product.promoUntil,
            volumePrices: product.volumePrices,
          },
          line.qty,
          customer?.priceTier ?? "retail",
          today,
        ),
      };
    });
  }, [lines, products.data, customer?.priceTier, today]);

  const discountCents = Math.round(Number(orderDiscount || 0) * 100) || 0;
  let totals: ReturnType<typeof calcCart> | null = null;
  let totalError = "";
  try {
    totals = priced.length
      ? calcCart({
          taxRateBps: business.taxRateBps,
          orderDiscountCents: Number.isFinite(discountCents) ? discountCents : 0,
          lines: priced.map((line) => ({
            qty: line.qty,
            unitPriceCents: line.unitPriceCents,
            discountCents: line.discountCents,
            taxExempt: line.taxExempt,
            costCents: 0,
          })),
        })
      : null;
  } catch (error) {
    totalError = error instanceof Error ? error.message : "Revise el carrito";
  }

  function addProduct(product: Product, note = ""): boolean {
    if (!product.active) {
      toast.error("Ese producto está inactivo");
      return false;
    }
    if (product.expiresOn && product.expiresOn < today) {
      toast.error(`${product.name} está vencido`);
      return false;
    }
    if (product.regulated && !note) {
      const typed = window.prompt(`Referencia de receta o autorización para ${product.name}`) ?? "";
      if (!typed.trim()) return false;
      note = typed.trim();
    }
    setLines((current) => {
      const found = current.find((line) => line.productId === product.id);
      if (found) return current.map((line) => (line === found ? { ...line, qty: line.qty + 1, note: note || line.note } : line));
      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          qty: 1,
          unitPriceCents: product.priceCents,
          discountCents: 0,
          note,
          priceTouched: false,
          taxExempt: product.taxExempt,
          regulated: product.regulated,
        },
      ];
    });
    navigator.vibrate?.(12);
    return true;
  }

  async function onScan(raw: string): Promise<boolean> {
    if (!raw.trim()) { toast.error("Ingrese un código válido"); return false; }
    try {
      const result = await resolveCodeFn({ data: { businessId: business.id, branchId, raw: raw.trim() } });
      if (!result.ok) { toast.error(result.error); return false; }
      if (!addProduct(result.data)) return false;
      setLastScanned(result.data.name);
      setManualCode("");
      return true;
    } catch {
      toast.error("No se pudo consultar el producto. Revise su conexión.");
      return false;
    }
  }

  async function sell() {
    if (busy || !totals || !priced.length) return;
    if (method === "credit" && !customerId) {
      toast.error("Seleccione un cliente para vender fiado");
      return;
    }
    const paid = tendered.trim() ? Math.round(Number(tendered) * 100) : totals.totalCents;
    const part = Math.round(Number(cashPart || 0) * 100);
    if ((method === "cash" && (!Number.isFinite(paid) || paid < totals.totalCents)) ||
        (method === "mixed" && (!Number.isFinite(part) || part <= 0 || part >= totals.totalCents ||
          (tendered.trim() && (!Number.isFinite(paid) || paid < part))))) {
      toast.error("Revise el efectivo: el importe debe cubrir la cantidad que se cobra.");
      return;
    }
    const cashCents = method === "mixed" ? Math.round(Number(cashPart || 0) * 100) : method === "cash" ? totals.totalCents : 0;
    const rest = totals.totalCents - cashCents;
    const payments: CheckoutInput["payments"] = [];
    if (cashCents > 0) payments.push({ method: "cash", amountCents: cashCents, confirmed: true });
    if (method === "credit") payments.push({ method: "credit", amountCents: totals.totalCents });
    else if (method === "transfer" || method === "card") {
      payments.push({ method, amountCents: totals.totalCents, reference, confirmed });
    } else if (method === "mixed" && rest > 0) {
      payments.push({ method: "transfer", amountCents: rest, reference, confirmed });
    }
    const tender = cashCents > 0 ? Math.max(cashCents, tendered.trim() ? paid : cashCents) : 0;
    const payload: CheckoutInput = {
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
        note: line.note,
      })),
      payments,
    };
    setBusy(true);
    try {
      let result: Awaited<ReturnType<typeof checkoutFn>>;
      try {
        result = await checkoutFn({ data: payload });
      } catch {
        // A dropped response can arrive AFTER the server committed the sale.
        // Keep this exact clientId when replaying so the backend can deduplicate.
        const queue = readOutbox();
        if (!queue.some((job) => job.clientId === payload.clientId)) queue.push(payload);
        localStorage.setItem(OUTBOX, JSON.stringify(queue));
        setOutbox(queue.filter((job) => job.businessId === business.id).length);
        toast.message("Venta pendiente de verificar. No la cobre otra vez; se sincronizará con el mismo identificador.");
        setLines([]);
        setCartOpen(false);
        return;
      }
      if (!result.ok) { toast.error(result.error); return; }
      toast.success(result.data.idempotent ? "Esa venta ya estaba registrada" : `Venta ${result.data.number}`);
      // The sale has been committed; a receipt retrieval failure must never queue it again.
      setLines([]);
      setCartOpen(false);
      setCustomerId(null);
      setOrderDiscount("0");
      setTendered("");
      void qc.invalidateQueries();
      try {
        const doc = await getSaleFn({ data: { businessId: business.id, saleId: result.data.saleId } });
        setReceipt(doc);
      } catch {
        toast.error("Venta registrada. Consulte el historial para imprimir el comprobante.");
      }
    } finally {
      setBusy(false);
    }
  }

  const visible = (products.data ?? [])
    .filter((product) => !category || product.categoryName === category)
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name, "es"));
  const categories = [...new Set((products.data ?? []).map((product) => product.categoryName).filter(Boolean))];
  const favorites = (products.data ?? []).filter((product) => product.favorite);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Venta</h1>
        <Button type="button" tone="ghost" onClick={() => setScanOpen(true)}>
          Escanear
        </Button>
      </div>
      {outbox > 0 && (
        <p className="rounded-xl bg-clay-soft px-3 py-2 text-sm">
          {outbox} venta{outbox === 1 ? "" : "s"} pendiente{outbox === 1 ? "" : "s"} de sincronizar en este teléfono.
        </p>
      )}
      <TextInput value={q} onChange={(event) => setQ(event.target.value)} placeholder="Buscar producto, SKU o código" />
      <div className="flex gap-2 overflow-auto">
        <button type="button" className={`min-h-11 shrink-0 rounded-full px-3 text-sm ${category === "" ? "bg-teal text-on-teal" : "bg-surface"}`} onClick={() => setCategory("")}>
          Todos
        </button>
        {categories.map((name) => (
          <button key={name} type="button" className={`min-h-11 shrink-0 rounded-full px-3 text-sm ${category === name ? "bg-teal text-on-teal" : "bg-surface"}`} onClick={() => setCategory(name)}>
            {name}
          </button>
        ))}
      </div>
      {favorites.length > 0 && (
        <div className="flex gap-2 overflow-auto">
          {favorites.map((product) => (
            <button key={product.id} type="button" className="card min-h-11 shrink-0 px-3 text-sm" onClick={() => addProduct(product)}>
              {product.name}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((product) => (
          <button key={product.id} type="button" className="card flex flex-col gap-2 p-3 text-left"
            aria-label={`Agregar ${product.name} al carrito`} onClick={() => addProduct(product)}>
            {product.photo ? (
              <img src={product.photo} alt="" className="h-20 w-full rounded-xl object-contain" loading="lazy" />
            ) : (
              <span className="grid h-20 w-full place-items-center rounded-xl bg-teal-soft text-sm text-teal">Producto</span>
            )}
            <span className="line-clamp-2 min-h-10 text-sm font-semibold">{product.name}</span>
            <span className="font-semibold tabular-nums">{money(product.priceCents, business.currency)}</span>
            <span className="text-xs text-muted">Hay {product.stock} {product.unit}</span>
            {product.favorite && <span className="text-xs text-teal">★ Favorito</span>}
          </button>
        ))}
        {products.isSuccess && visible.length === 0 && <p className="col-span-2 text-sm text-muted">No hay productos. Regístrelos en Inventario.</p>}
      </div>
      <section className="card space-y-3 p-3" aria-label="Carrito actual">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">Carrito · {priced.reduce((count, line) => count + line.qty, 0)} unidades</h2>
          {priced.length > 0 && <Button type="button" tone="ghost" onClick={() => {
            if (window.confirm("¿Vaciar el carrito?")) setLines([]);
          }}>Vaciar</Button>}
        </div>
        {priced.length === 0 && <p className="text-sm text-muted">Busque un producto o escanee su QR para comenzar.</p>}
        {priced.map((line) => (
          <div key={line.productId} className="flex items-center gap-2 border-b border-line pb-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{line.name}</p>
              <p className="text-xs text-muted tabular-nums">{money(line.unitPriceCents * line.qty, business.currency)}</p>
            </div>
            <Button type="button" tone="ghost" aria-label={`Quitar uno de ${line.name}`}
              onClick={() => setLines((rows) => rows.flatMap((row) => row.productId === line.productId
                ? row.qty > 1 ? [{ ...row, qty: row.qty - 1 }] : [] : [row]))}>−</Button>
            <TextInput aria-label={`Cantidad de ${line.name}`} type="number" min="1" step="1" inputMode="numeric"
              className="w-16 px-1 text-center" value={line.qty} onChange={(event) => {
                const qty = Number(event.target.value);
                if (!Number.isInteger(qty) || qty < 1 || qty > 99999) return;
                setLines((rows) => rows.map((row) => row.productId === line.productId ? { ...row, qty } : row));
              }} />
            <Button type="button" tone="ghost" aria-label={`Añadir uno de ${line.name}`}
              onClick={() => setLines((rows) => rows.map((row) => row.productId === line.productId
                ? { ...row, qty: row.qty + 1 } : row))}>+</Button>
          </div>
        ))}
        <div className="flex items-center justify-between font-semibold">
          <span>Total de compra</span>
          <span className="tabular-nums">{money(totals?.totalCents ?? 0, business.currency)}</span>
        </div>
        {totalError && <p className="text-sm text-clay">{totalError}</p>}
        <Button type="button" disabled={!totals} onClick={() => setCartOpen(true)}>Continuar al cobro</Button>
      </section>
      <div className="h-16 lg:hidden" />
      <button type="button" disabled={!totals} className="fixed inset-x-4 bottom-[5.5rem] z-20 min-h-12 rounded-2xl bg-ink px-4 text-paper disabled:opacity-60 lg:left-72 lg:bottom-4"
        onClick={() => setCartOpen(true)}>
        Cobrar · {priced.reduce((count, line) => count + line.qty, 0)} · {money(totals?.totalCents ?? 0, business.currency)}
      </button>
      <Modal open={cartOpen} title="Revisar y cobrar" onClose={() => setCartOpen(false)}>
        <div className="space-y-3">
          {priced.map((line) => (
            <div key={line.productId} className="border-b border-line pb-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{line.name}</p>
                <p className="tabular-nums">{money(line.unitPriceCents * line.qty - line.discountCents, business.currency)}</p>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Button type="button" tone="ghost" onClick={() => setLines((rows) => rows.flatMap((row) => (row.productId === line.productId ? (row.qty === 1 ? [] : [{ ...row, qty: row.qty - 1 }]) : [row])))}>
                  −
                </Button>
                <span className="tabular-nums">{line.qty}</span>
                <Button type="button" tone="ghost" onClick={() => setLines((rows) => rows.map((row) => (row.productId === line.productId ? { ...row, qty: row.qty + 1 } : row)))}>
                  +
                </Button>
                <TextInput
                  className="max-w-28"
                  inputMode="decimal"
                  aria-label="Precio"
                  value={(line.unitPriceCents / 100).toString()}
                  onChange={(event) => {
                    const next = Math.round(Number(event.target.value) * 100);
                    if (!Number.isFinite(next) || next < 0) return;
                    setLines((rows) => rows.map((row) => (row.productId === line.productId ? { ...row, unitPriceCents: next, priceTouched: true } : row)));
                  }}
                />
              </div>
            </div>
          ))}
          <label className="block text-sm text-muted">
            Cliente
            <select className="mt-1 min-h-11 w-full rounded-xl border border-line bg-paper px-3" value={customerId ?? ""} onChange={(event) => setCustomerId(event.target.value || null)}>
              <option value="">Consumidor final</option>
              {(customers.data ?? []).map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name} · saldo {money(row.balanceCents, business.currency)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-muted">
            Descuento general ({business.currency === "USD" ? "US$" : "C$"})
            <TextInput inputMode="decimal" value={orderDiscount} onChange={(event) => setOrderDiscount(event.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2">
            {(["cash", "transfer", "card", "credit", "mixed"] as const).map((item) => (
              <button key={item} type="button" className={`min-h-11 rounded-full px-3 text-sm ${method === item ? "bg-teal text-on-teal" : "bg-paper"}`} onClick={() => setMethod(item)}>
                {item === "cash" ? "Efectivo" : item === "transfer" ? "Transferencia" : item === "card" ? "Tarjeta" : item === "credit" ? "Fiado" : "Mixto"}
              </button>
            ))}
          </div>
          {method === "cash" || method === "mixed" ? (
            <label className="block text-sm text-muted">
              Efectivo recibido
              <TextInput inputMode="decimal" value={tendered} placeholder={totals ? (totals.totalCents / 100).toFixed(2) : "0"} onChange={(event) => setTendered(event.target.value)} />
            </label>
          ) : null}
          {method === "mixed" && (
            <label className="block text-sm text-muted">
              Parte en efectivo
              <TextInput inputMode="decimal" value={cashPart} onChange={(event) => setCashPart(event.target.value)} />
            </label>
          )}
          {(method === "transfer" || method === "card" || method === "mixed") && (
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
              Confirmo que el pago electrónico ya se recibió
            </label>
          )}
          {(method === "transfer" || method === "card" || method === "mixed") && (
            <TextInput value={reference} placeholder="Referencia" onChange={(event) => setReference(event.target.value)} />
          )}
          {totals && method === "cash" && tendered && (
            <p className="tabular-nums">Cambio {money(Math.max(0, Math.round(Number(tendered) * 100) - totals.totalCents), business.currency)}</p>
          )}
          {totalError && <p className="text-sm text-clay">{totalError}</p>}
          <p className="font-display text-2xl tabular-nums">Total {money(totals?.totalCents ?? 0, business.currency)}</p>
          {business.taxRateBps > 0 && totals && (
            <p className="text-sm text-muted">Incluye impuesto {money(totals.taxCents, business.currency)}</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              tone="ghost"
              onClick={() => {
                void parkSaleFn({
                  data: { businessId: business.id, branchId, label: customer?.name || "Mostrador", cart: { lines: priced, customerId, orderDiscount } },
                }).then((result) => {
                  if (!result.ok) toast.error(result.error);
                  else {
                    toast.success("Venta suspendida");
                    setLines([]);
                    setCartOpen(false);
                    void parked.refetch();
                  }
                });
              }}
            >
              Suspender
            </Button>
            <Button type="button" disabled={busy || !totals} onClick={() => void sell()}>
              {busy ? "Cobrando…" : "Cobrar"}
            </Button>
          </div>
          {(parked.data ?? []).map((row) => (
            <button
              key={row.id}
              type="button"
              className="w-full rounded-xl bg-paper px-3 py-2 text-left text-sm"
              onClick={() => {
                const cart = row.cart as { lines?: Line[]; customerId?: string | null; orderDiscount?: string };
                setLines(cart.lines ?? []);
                setCustomerId(cart.customerId ?? null);
                setOrderDiscount(cart.orderDiscount ?? "0");
                void discardParkedFn({ data: { businessId: business.id, parkedId: row.id } });
              }}
            >
              Recuperar {row.label}
            </button>
          ))}
        </div>
      </Modal>
      <Modal open={scanOpen} title="Escaneo continuo" onClose={() => setScanOpen(false)}>
        <Scanner onCode={onScan} />
        <div className="mt-3 rounded-xl bg-teal-soft p-3" aria-live="polite">
          <p className="text-sm">{lastScanned ? `Añadido: ${lastScanned}` : "Apunte al QR de cada producto"}</p>
          <p className="mt-1 font-semibold tabular-nums">
            {priced.reduce((count, line) => count + line.qty, 0)} artículos · {money(totals?.totalCents ?? 0, business.currency)}
          </p>
          <div className="mt-2 max-h-28 space-y-1 overflow-auto">
            {priced.map((line) => <p key={line.productId} className="text-xs">{line.qty} × {line.name}</p>)}
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">Retire el código de la cámara antes de volver a escanearlo. También puede introducirlo manualmente.</p>
        <div className="mt-2 flex gap-2">
          <TextInput value={manualCode} placeholder="nexo:p:… o código de barras" onChange={(event) => setManualCode(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") void onScan(manualCode); }} />
          <Button type="button" onClick={() => void onScan(manualCode)}>Agregar</Button>
        </div>
        <Button type="button" disabled={!totals} onClick={() => { setScanOpen(false); setCartOpen(true); }}>
          Revisar carrito y cobrar
        </Button>
      </Modal>
      <Modal open={Boolean(receipt)} title={receipt ? receipt.number : "Venta"} onClose={() => setReceipt(null)}>
        {receipt && (
          <div className="space-y-3">
            <p className="font-display text-3xl tabular-nums">{money(receipt.totalCents, receipt.business.currency)}</p>
            <p className="text-sm text-muted">
              {receipt.customerName} · cambio {money(receipt.changeCents, receipt.business.currency)}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" onClick={() => void downloadPdf(() => invoiceBlob(receipt, "80"), `${receipt.number}.pdf`)}>
                Ticket 80 mm
              </Button>
              <Button type="button" tone="ghost" onClick={() => void downloadPdf(() => invoiceBlob(receipt, "58"), `${receipt.number}.pdf`)}>
                Ticket 58 mm
              </Button>
              <Button type="button" tone="ghost" onClick={() => void downloadPdf(() => invoiceBlob(receipt, "letter"), `${receipt.number}.pdf`)}>
                Carta
              </Button>
            </div>
            <p className="text-xs text-muted">Comprobante interno. La factura fiscal de la DGI no está conectada.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Scanner({ onCode }: { onCode: (code: string) => Promise<boolean> }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;
  const [help, setHelp] = useState("Iniciando cámara…");

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let heldCode = "";
    let missingFrames = 0;
    const Detector = (window as unknown as {
      BarcodeDetector?: new (opts?: { formats?: string[] }) => {
        detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
      };
    }).BarcodeDetector;

    void (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setHelp("El navegador no permite abrir la cámara. Introduzca el código manualmente.");
        return;
      }
      try {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false, video: { facingMode: { ideal: "environment" } },
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
        }
        if (stopped || !videoRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();

        if (!Detector) {
          setHelp("Cámara activa, pero este navegador no tiene detector de QR. Utilice otro navegador compatible o introduzca el código.");
          return;
        }
        let detector: InstanceType<typeof Detector>;
        try {
          detector = new Detector({
            formats: ["qr_code", "ean_13", "ean_8", "code_128", "upc_a", "upc_e", "code_39"],
          });
        } catch {
          detector = new Detector();
        }
        setHelp("Escanee un QR. Retírelo del cuadro para poder leerlo nuevamente.");

        const tick = async () => {
          if (stopped) return;
          try {
            const codes = await detector.detect(video);
            const code = codes[0]?.rawValue?.trim() || "";
            if (!code) {
              missingFrames += 1;
              if (missingFrames >= 3) heldCode = "";
            } else {
              missingFrames = 0;
              // A stationary QR is seen on dozens of consecutive frames.
              // Only count it again after it leaves the camera and comes back.
              if (code !== heldCode) {
                heldCode = code;
                const ok = await onCodeRef.current(code);
                if (!stopped) setHelp(ok ? "Producto agregado. Escanee el siguiente código." : "Código no reconocido. Pruebe nuevamente.");
              }
            }
          } catch {
            // A temporary blurred frame must not terminate continuous scanning.
          }
          if (!stopped) timer = window.setTimeout(() => void tick(), 180);
        };
        void tick();
      } catch (error) {
        const reason = error instanceof Error && error.name === "NotAllowedError"
          ? "Permiso de cámara denegado. Autorícelo en los ajustes del navegador."
          : "No se pudo iniciar la cámara. Compruebe permisos, HTTPS y que no esté siendo utilizada.";
        if (!stopped) setHelp(reason);
      }
    })();

    return () => {
      stopped = true;
      if (timer !== undefined) window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div>
      <video ref={videoRef} className="h-52 w-full rounded-2xl bg-ink object-cover" muted playsInline />
      <p className="mt-2 text-sm text-muted" role="status">{help}</p>
    </div>
  );
}

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
  const [category, setCategory] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
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
  const [receipt, setReceipt] = useState<SaleDoc | null>(null);
  const [busy, setBusy] = useState(false);
  const [outbox, setOutbox] = useState(0);
  const products = useQuery({
    queryKey: ["products", business.id, branchId, q],
    queryFn: () => listProductsFn({ data: { businessId: business.id, branchId, query: q } }),
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
    setOutbox(readOutbox().length);
    const flush = async () => {
      const queue = readOutbox();
      if (!queue.length) return;
      const left: CheckoutInput[] = [];
      for (const job of queue) {
        try {
          const result = await checkoutFn({ data: job });
          if (!result.ok) left.push(job);
        } catch {
          left.push(job);
        }
      }
      localStorage.setItem(OUTBOX, JSON.stringify(left));
      setOutbox(left.length);
      if (left.length !== queue.length) {
        toast.success("Se sincronizaron ventas pendientes");
        void qc.invalidateQueries();
      }
    };
    void flush();
    window.addEventListener("online", () => void flush());
  }, [qc]);

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

  function addProduct(product: Product, note = "") {
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
    setCartOpen(true);
    navigator.vibrate?.(12);
  }

  async function onScan(raw: string) {
    const result = await resolveCodeFn({ data: { businessId: business.id, branchId, raw } });
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
    const payments: CheckoutInput["payments"] = [];
    if (cashCents > 0) payments.push({ method: "cash", amountCents: cashCents, confirmed: true });
    if (method === "credit") payments.push({ method: "credit", amountCents: totals.totalCents });
    else if (method === "transfer" || method === "card") {
      payments.push({ method, amountCents: totals.totalCents, reference, confirmed });
    } else if (method === "mixed" && rest > 0) {
      payments.push({ method: "transfer", amountCents: rest, reference, confirmed });
    }
    const tender =
      cashCents > 0 ? Math.max(cashCents, Math.round(Number((tendered || cashCents / 100).toString()) * 100) || cashCents) : 0;
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
      const result = await checkoutFn({ data: payload });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.data.idempotent ? "Esa venta ya estaba registrada" : `Venta ${result.data.number}`);
      const doc = await getSaleFn({ data: { businessId: business.id, saleId: result.data.saleId } });
      setReceipt(doc);
      setLines([]);
      setCartOpen(false);
      void qc.invalidateQueries();
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
      <div className="space-y-2">
        {visible.map((product) => (
          <button key={product.id} type="button" className="card flex w-full items-center gap-3 px-3 py-2 text-left" onClick={() => addProduct(product)}>
            {product.photo ? (
              <img src={product.photo} alt="" className="h-12 w-12 rounded-xl object-cover" />
            ) : (
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-teal-soft text-xs text-teal">QR</span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{product.name}</span>
              <span className="text-sm text-muted">
                {money(product.priceCents, business.currency)} · hay {product.stock} {product.unit}
                {product.expiresOn ? ` · vence ${product.expiresOn}` : ""}
                {product.isDemo ? " · demo" : ""}
              </span>
            </span>
          </button>
        ))}
        {products.isSuccess && visible.length === 0 && <p className="text-sm text-muted">No hay productos para mostrar. Regístrelos en Inventario.</p>}
      </div>
      <button type="button" className="fixed inset-x-4 bottom-24 z-20 min-h-12 rounded-2xl bg-ink px-4 text-paper lg:left-72" onClick={() => setCartOpen(true)}>
        Carrito · {priced.reduce((s, line) => s + line.qty, 0)} · {money(totals?.totalCents ?? 0, business.currency)}
      </button>
      <Modal open={cartOpen} title="Carrito" onClose={() => setCartOpen(false)}>
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
      <Modal open={scanOpen} title="Escanear código" onClose={() => setScanOpen(false)}>
        <Scanner onCode={(code) => void onScan(code)} />
        <p className="mt-3 text-sm text-muted">Si la cámara no está disponible, escriba el código o el texto del QR.</p>
        <div className="mt-2 flex gap-2">
          <TextInput value={manualCode} placeholder="nexo:p:… o código de barras" onChange={(event) => setManualCode(event.target.value)} />
          <Button type="button" onClick={() => void onScan(manualCode)}>
            Usar
          </Button>
        </div>
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

function Scanner({ onCode }: { onCode: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;
  const [help, setHelp] = useState("Apunte al QR del estante o al código de barras.");
  useEffect(() => {
    let stop = false;
    let stream: MediaStream | null = null;
    const Detector = (
      window as unknown as {
        BarcodeDetector?: new (opts?: { formats?: string[] }) => {
          detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
        };
      }
    ).BarcodeDetector;
    void (async () => {
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
        const detector = new Detector({ formats: ["qr_code", "ean_13", "ean_8", "code_128", "upc_a", "upc_e", "code_39"] });
        const tick = async () => {
          if (stop || !videoRef.current) return;
          try {
            const found = await detector.detect(videoRef.current);
            if (found[0]?.rawValue) {
              onCodeRef.current(found[0].rawValue);
              return;
            }
          } catch {
            /* frame */
          }
          if (!stop) requestAnimationFrame(() => void tick());
        };
        void tick();
      } catch {
        setHelp("No se permitió la cámara. Puede escribir el código.");
      }
    })();
    return () => {
      stop = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);
  return (
    <div>
      <video ref={videoRef} className="h-52 w-full rounded-2xl bg-ink object-cover" muted playsInline />
      <p className="mt-2 text-sm text-muted">{help}</p>
    </div>
  );
}

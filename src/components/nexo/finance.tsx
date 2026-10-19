import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  accountsFn,
  cashMoveFn,
  cashStateFn,
  closeCashFn,
  createLoanFn,
  expenseFn,
  financialsFn,
  journalFn,
  listExpensesFn,
  listLoansFn,
  listProductsFn,
  listPurchasesFn,
  listSuppliersFn,
  lockFn,
  manualJournalFn,
  openCashFn,
  payLoanFn,
  paySupplierFn,
  purchaseFn,
  saveProductFn,
  saveSupplierFn,
} from "@/lib/nexo/fns";
import { money } from "@/lib/nexo/money";
import type { Product } from "@/lib/nexo/types";
import { useNexo } from "./context";
import { Button, Field, PhotoPicker, Select, TextInput, pesos, todayIn } from "./ui";

export function Finance() {
  const { business, branchId, screen, go } = useNexo();
  const today = todayIn(business.timezone);
  const from = `${today.slice(0, 8)}01`;
  if (screen === "caja") return <Cash />;
  if (screen === "gastos") return <Expenses today={today} />;
  if (screen === "compras") return <Purchases />;
  if (screen === "contabilidad") return <Books from={from} to={today} />;
  if (screen === "prestamos") return <Loans today={today} />;
  const items = [
    ["caja", "Caja del turno"],
    ["gastos", "Gastos"],
    ["compras", "Compras"],
    ["contabilidad", "Contabilidad"],
    ["prestamos", "Préstamos"],
  ] as const;
  return (
    <div className="space-y-3">
      <h1 className="font-display text-3xl">Finanzas</h1>
      {items.map(([key, label]) => (
        <button key={key} type="button" className="card min-h-14 w-full px-4 text-left font-semibold" onClick={() => go("finanzas", key)}>
          {label}
        </button>
      ))}
      <p className="text-sm text-muted">La caja física y la caja contable se muestran por separado. La apertura no crea un asiento: si el fondo es un aporte nuevo, regístrelo como entrada de capital.</p>
    </div>
  );
}

function Cash() {
  const { business, branchId } = useNexo();
  const qc = useQueryClient();
  const state = useQuery({
    queryKey: ["cash", business.id, branchId],
    queryFn: () => cashStateFn({ data: { businessId: business.id, branchId } }),
  });
  const [opening, setOpening] = useState("0");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [counted, setCounted] = useState("");
  const data = state.data;
  return (
    <div className="space-y-3">
      <h1 className="font-display text-3xl">Caja</h1>
      {data && !data.open && (
        <div className="card space-y-2 p-3">
          <Field label="Fondo inicial contado">
            <TextInput inputMode="decimal" value={opening} onChange={(event) => setOpening(event.target.value)} />
          </Field>
          <Button type="button" onClick={() => void openCashFn({ data: { businessId: business.id, branchId, openingCents: Math.round(Number(opening || 0) * 100) } }).then((result) => {
            if (!result.ok) toast.error(result.error);
            else {
              toast.success("Caja abierta");
              void qc.invalidateQueries();
            }
          })}>
            Abrir caja
          </Button>
        </div>
      )}
      {data?.open && (
        <div className="space-y-3">
          <div className="card p-3">
            <p className="text-sm text-muted">Esperado en el cajón</p>
            <p className="font-display text-3xl tabular-nums">{money(data.expectedCents, business.currency)}</p>
            <p className="text-sm text-muted">Apertura {money(data.openingCents, business.currency)}</p>
          </div>
          {data.movements.map((row, index) => (
            <p key={`${row.createdAt}-${index}`} className="text-sm">
              {row.kind} · {money(row.amountCents, business.currency)} · {row.note}
            </p>
          ))}
          <Field label="Monto"><TextInput inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></Field>
          <Field label="Motivo"><TextInput value={note} onChange={(event) => setNote(event.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" tone="ghost" onClick={() => void move("in")}>Entrada (capital)</Button>
            <Button type="button" tone="ghost" onClick={() => void move("out")}>Retiro</Button>
          </div>
          <Field label="Arqueo contado"><TextInput inputMode="decimal" value={counted} onChange={(event) => setCounted(event.target.value)} /></Field>
          <Button type="button" tone="clay" onClick={() => void closeCashFn({ data: { businessId: business.id, branchId, countedCents: Math.round(Number(counted || 0) * 100), note } }).then((result) => {
            if (!result.ok) toast.error(result.error);
            else {
              toast.success(`Diferencia ${money(result.data.differenceCents, business.currency)}`);
              void qc.invalidateQueries();
            }
          })}>
            Cerrar caja
          </Button>
        </div>
      )}
    </div>
  );
  function move(direction: "in" | "out") {
    void cashMoveFn({
      data: { businessId: business.id, branchId, direction, amountCents: Math.round(Number(amount) * 100), note },
    }).then((result) => {
      if (!result.ok) toast.error(result.error);
      else {
        toast.success("Movimiento registrado");
        setAmount("");
        void qc.invalidateQueries();
      }
    });
  }
}

function Expenses({ today }: { today: string }) {
  const { business, branchId } = useNexo();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["expenses", business.id], queryFn: () => listExpensesFn({ data: { businessId: business.id } }) });
  const [payee, setPayee] = useState("");
  const [amount, setAmount] = useState("");
  const [key, setKey] = useState("servicios");
  const [method, setMethod] = useState<"cash" | "transfer">("cash");
  const [receipt, setReceipt] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <h1 className="font-display text-3xl">Gastos</h1>
      <Field label="A quién"><TextInput value={payee} onChange={(event) => setPayee(event.target.value)} /></Field>
      <Field label="Monto"><TextInput inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></Field>
      <Field label="Tipo">
        <Select value={key} onChange={(event) => setKey(event.target.value)}>
          <option value="servicios">Servicios</option>
          <option value="gastos">Operativo</option>
          <option value="salarios">Salarios</option>
          <option value="intereses">Intereses</option>
        </Select>
      </Field>
      <Field label="Pago">
        <Select value={method} onChange={(event) => setMethod(event.target.value as typeof method)}>
          <option value="cash">Efectivo</option>
          <option value="transfer">Transferencia</option>
        </Select>
      </Field>
      <div>
        <p className="mb-1 text-sm text-muted">Foto del recibo</p>
        <PhotoPicker value={receipt} onChange={setReceipt} />
      </div>
      <Button type="button" onClick={() => void expenseFn({
        data: { businessId: business.id, branchId, accountKey: key, amountCents: Math.round(Number(amount) * 100), method, payee, note: "", receipt, spentOn: today },
      }).then((result) => {
        if (!result.ok) toast.error(result.error);
        else {
          toast.success("Gasto registrado");
          setAmount("");
          void qc.invalidateQueries();
        }
      })}>
        Guardar gasto
      </Button>
      {(list.data ?? []).map((row) => (
        <p key={row.id} className="text-sm">{row.spentOn} · {row.payee} · {money(row.amountCents, business.currency)}</p>
      ))}
    </div>
  );
}

function Purchases() {
  const { business, branchId } = useNexo();
  const qc = useQueryClient();
  const products = useQuery({ queryKey: ["products", business.id, branchId, ""], queryFn: () => listProductsFn({ data: { businessId: business.id, branchId, query: "" } }) });
  const suppliers = useQuery({ queryKey: ["suppliers", business.id], queryFn: () => listSuppliersFn({ data: { businessId: business.id } }) });
  const history = useQuery({ queryKey: ["purchases", business.id], queryFn: () => listPurchasesFn({ data: { businessId: business.id } }) });
  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [newSupplier, setNewSupplier] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Record<string, { qty: string; cost: string; price: string; photo: string | null }>>({});
  const [drafts, setDrafts] = useState<{ key: string; name: string; qty: string; cost: string; price: string; photo: string | null }[]>([]);
  const [freight, setFreight] = useState("0");
  const [number, setNumber] = useState("");
  const [method, setMethod] = useState<"cash" | "transfer" | "credit">("cash");
  const [pay, setPay] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (suppliers.data && suppliers.data.length === 0) setNewSupplier(true);
  }, [suppliers.data]);
  useEffect(() => {
    if (products.data && products.data.length === 0 && drafts.length === 0) {
      setDrafts([{ key: crypto.randomUUID(), name: "", qty: "1", cost: "", price: "", photo: null }]);
    }
  }, [products.data, drafts.length]);

  const visible = (products.data ?? []).filter((product) => product.name.toLowerCase().includes(query.trim().toLowerCase()));

  function toggle(product: Product) {
    setPicked((current) => {
      if (current[product.id]) {
        const next = { ...current };
        delete next[product.id];
        return next;
      }
      return {
        ...current,
        [product.id]: {
          qty: "1",
          cost: (product.costCents / 100).toString(),
          price: (product.priceCents / 100).toString(),
          photo: product.photo,
        },
      };
    });
  }

  async function receive() {
    const lines: { productId: string; qty: number; unitCostCents: number }[] = [];
    setBusy(true);
    try {
      let sid = supplierId || null;
      if (newSupplier && supplierName.trim()) {
        const saved = await saveSupplierFn({
          data: {
            businessId: business.id,
            name: supplierName,
            contact: "",
            phone: supplierPhone,
            address: "",
            taxId: "",
            terms: "",
            notes: "",
          },
        });
        if (!saved.ok) {
          toast.error(saved.error);
          return;
        }
        sid = saved.data;
        setSupplierId(saved.data);
        setNewSupplier(false);
      }
      for (const [productId, line] of Object.entries(picked)) {
        const product = products.data?.find((row) => row.id === productId);
        if (!product) continue;
        const qty = Number(line.qty);
        const cost = pesos(line.cost);
        const price = pesos(line.price);
        if (!Number.isInteger(qty) || qty <= 0 || cost == null || price == null) {
          toast.error(`Revise cantidad y precios de ${product.name}`);
          return;
        }
        if (line.photo !== product.photo || price !== product.priceCents) {
          const updated = await saveProductFn({
            data: {
              businessId: business.id,
              branchId,
              id: product.id,
              name: product.name,
              description: product.description,
              photo: line.photo,
              category: product.categoryName,
              subcategory: product.subcategory,
              brand: product.brand,
              sku: product.sku,
              barcode: product.barcode,
              costCents: cost,
              priceCents: price,
              wholesaleCents: product.wholesaleCents,
              promoCents: product.promoCents,
              promoUntil: product.promoUntil,
              volumePrices: product.volumePrices,
              taxExempt: product.taxExempt,
              regulated: product.regulated,
              minQty: product.minQty,
              unit: product.unit,
              supplierId: sid,
              expiresOn: product.expiresOn,
              lotCode: product.lotCode,
              location: product.location,
              active: product.active,
              favorite: product.favorite,
              parentId: product.parentId,
              variantLabel: product.variantLabel,
              initialQty: 0,
            },
          });
          if (!updated.ok) {
            toast.error(updated.error);
            return;
          }
        }
        lines.push({ productId, qty, unitCostCents: cost });
      }
      for (const draft of drafts) {
        if (!draft.name.trim()) continue;
        const qty = Number(draft.qty);
        const cost = pesos(draft.cost);
        const price = pesos(draft.price);
        if (!draft.price.trim()) {
          toast.error(`Escriba el precio de venta de ${draft.name}`);
          return;
        }
        if (!Number.isInteger(qty) || qty <= 0 || cost == null || price == null) {
          toast.error(`Revise ${draft.name || "el producto nuevo"}`);
          return;
        }
        const created = await saveProductFn({
          data: {
            businessId: business.id,
            branchId,
            name: draft.name,
            description: "",
            photo: draft.photo,
            category: "",
            subcategory: "",
            brand: "",
            sku: "",
            barcode: "",
            costCents: cost,
            priceCents: price,
            wholesaleCents: 0,
            promoCents: null,
            promoUntil: null,
            volumePrices: [],
            taxExempt: false,
            regulated: false,
            minQty: 0,
            unit: "unidad",
            supplierId: sid,
            expiresOn: null,
            lotCode: "",
            location: "",
            active: true,
            favorite: false,
            parentId: null,
            variantLabel: "",
            initialQty: 0,
          },
        });
        if (!created.ok) {
          toast.error(created.error);
          return;
        }
        lines.push({ productId: created.data, qty, unitCostCents: cost });
      }
      if (!lines.length) {
        toast.error("Marque productos o registre uno nuevo");
        return;
      }
      const result = await purchaseFn({
        data: {
          businessId: business.id,
          branchId,
          supplierId: sid,
          number,
          method,
          freightCents: Math.round(Number(freight || 0) * 100),
          note: "",
          lines,
        },
      });
      if (!result.ok) toast.error(result.error);
      else {
        toast.success("Compra recibida. El costo promedio se actualizó.");
        setPicked({});
        setDrafts([]);
        setNumber("");
        void qc.invalidateQueries();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <h1 className="font-display text-3xl">Compras</h1>
      <Field label="Proveedor">
        <Select value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
          <option value="">Sin proveedor</option>
          {(suppliers.data ?? []).map((row) => (
            <option key={row.id} value={row.id}>{row.name} · debe {money(row.balanceCents, business.currency)}</option>
          ))}
        </Select>
      </Field>
      {!newSupplier ? (
        <button type="button" className="min-h-11 text-sm font-semibold text-teal" onClick={() => setNewSupplier(true)}>
          Agregar proveedor
        </button>
      ) : (
        <div className="card space-y-2 p-3">
          <p className="text-sm font-semibold">Proveedor nuevo</p>
          <Field label="Nombre"><TextInput value={supplierName} onChange={(event) => setSupplierName(event.target.value)} /></Field>
          <Field label="Teléfono"><TextInput value={supplierPhone} onChange={(event) => setSupplierPhone(event.target.value)} /></Field>
          <button type="button" className="min-h-11 text-sm text-muted" onClick={() => setNewSupplier(false)}>Usar uno de la lista</button>
        </div>
      )}
      <Field label="Buscar en la lista">
        <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre del producto" />
      </Field>
      <div className="space-y-2">
        {visible.map((product) => {
          const line = picked[product.id];
          return (
            <div key={product.id} className="card p-3">
              <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
                <input type="checkbox" checked={Boolean(line)} onChange={() => toggle(product)} />
                <span className="min-w-0 flex-1">
                  {product.name}
                  <span className="block font-normal text-muted">Hay {product.stock} · venta {money(product.priceCents, business.currency)}</span>
                </span>
              </label>
              {line && (
                <div className="mt-2 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <Field label="Cantidad"><TextInput inputMode="numeric" value={line.qty} onChange={(event) => setPicked((curr) => ({ ...curr, [product.id]: { ...line, qty: event.target.value } }))} /></Field>
                    <Field label="Costo"><TextInput inputMode="decimal" value={line.cost} onChange={(event) => setPicked((curr) => ({ ...curr, [product.id]: { ...line, cost: event.target.value } }))} /></Field>
                    <Field label="Precio venta"><TextInput inputMode="decimal" value={line.price} onChange={(event) => setPicked((curr) => ({ ...curr, [product.id]: { ...line, price: event.target.value } }))} /></Field>
                  </div>
                  <PhotoPicker value={line.photo} onChange={(photo) => setPicked((curr) => ({ ...curr, [product.id]: { ...line, photo } }))} />
                </div>
              )}
            </div>
          );
        })}
        {products.isSuccess && visible.length === 0 && <p className="text-sm text-muted">No hay productos en la lista. Registre uno abajo y entra con esta compra.</p>}
      </div>
      {drafts.map((draft) => (
        <div key={draft.key} className="card space-y-2 p-3">
          <p className="text-sm font-semibold">Producto nuevo</p>
          <Field label="Nombre"><TextInput value={draft.name} onChange={(event) => setDrafts((rows) => rows.map((row) => row.key === draft.key ? { ...row, name: event.target.value } : row))} /></Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Cantidad"><TextInput inputMode="numeric" value={draft.qty} onChange={(event) => setDrafts((rows) => rows.map((row) => row.key === draft.key ? { ...row, qty: event.target.value } : row))} /></Field>
            <Field label="Costo"><TextInput inputMode="decimal" value={draft.cost} onChange={(event) => setDrafts((rows) => rows.map((row) => row.key === draft.key ? { ...row, cost: event.target.value } : row))} /></Field>
            <Field label="Precio venta"><TextInput inputMode="decimal" value={draft.price} onChange={(event) => setDrafts((rows) => rows.map((row) => row.key === draft.key ? { ...row, price: event.target.value } : row))} /></Field>
          </div>
          <PhotoPicker value={draft.photo} onChange={(photo) => setDrafts((rows) => rows.map((row) => row.key === draft.key ? { ...row, photo } : row))} />
          <button type="button" className="min-h-11 text-sm text-clay" onClick={() => setDrafts((rows) => rows.filter((row) => row.key !== draft.key))}>Quitar</button>
        </div>
      ))}
      <Button type="button" tone="ghost" onClick={() => setDrafts((rows) => [...rows, { key: crypto.randomUUID(), name: "", qty: "1", cost: "", price: "", photo: null }])}>
        Registrar producto en esta compra
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Flete"><TextInput inputMode="decimal" value={freight} onChange={(event) => setFreight(event.target.value)} /></Field>
        <Field label="Factura"><TextInput value={number} onChange={(event) => setNumber(event.target.value)} /></Field>
      </div>
      <Select value={method} onChange={(event) => setMethod(event.target.value as typeof method)}>
        <option value="cash">Contado efectivo</option>
        <option value="transfer">Transferencia</option>
        <option value="credit">Crédito del proveedor</option>
      </Select>
      <Button type="button" disabled={busy} onClick={() => void receive()}>Recibir mercancía</Button>
      {supplierId && (
        <div className="card space-y-2 p-3">
          <Field label="Abono al proveedor"><TextInput value={pay} onChange={(event) => setPay(event.target.value)} /></Field>
          <Button type="button" tone="ghost" onClick={() => void paySupplierFn({
            data: { businessId: business.id, branchId, supplierId, amountCents: Math.round(Number(pay) * 100), method: "cash", note: "Abono" },
          }).then((result) => {
            if (!result.ok) toast.error(result.error);
            else {
              toast.success("Pago registrado");
              void qc.invalidateQueries();
            }
          })}>
            Pagar
          </Button>
        </div>
      )}
      {(history.data ?? []).map((row) => (
        <p key={row.id} className="text-sm">{row.supplierName} · {money(row.totalCents, business.currency)} · {row.method}</p>
      ))}
    </div>
  );
}

function Books({ from, to }: { from: string; to: string }) {
  const { business } = useNexo();
  const qc = useQueryClient();
  const fin = useQuery({ queryKey: ["fin", business.id, from, to], queryFn: () => financialsFn({ data: { businessId: business.id, from, to } }) });
  const journal = useQuery({ queryKey: ["journal", business.id], queryFn: () => journalFn({ data: { businessId: business.id } }) });
  const accounts = useQuery({ queryKey: ["accounts", business.id], queryFn: () => accountsFn({ data: { businessId: business.id } }) });
  const [memo, setMemo] = useState("");
  const [a1, setA1] = useState("");
  const [a2, setA2] = useState("");
  const [amount, setAmount] = useState("");
  const rows = fin.data;
  return (
    <div className="space-y-3">
      <h1 className="font-display text-3xl">Contabilidad</h1>
      <p className="text-sm text-muted">Partida doble del {from} al {to}. Los períodos cerrados rechazan asientos nuevos.</p>
      {rows && (
        <div className="grid grid-cols-2 gap-2">
          {[
            ["Ingresos", rows.income],
            ["Costo", rows.cost],
            ["Gastos", rows.expense],
            ["Utilidad", rows.net],
            ["Activos", rows.assets],
            ["Pasivos", rows.liabilities],
            ["Patrimonio", rows.equity],
            ["Resultado acumulado", rows.accumulated],
          ].map(([label, value]) => (
            <div key={String(label)} className="card px-3 py-2">
              <p className="text-xs text-muted">{label}</p>
              <p className="tabular-nums font-semibold">{money(Number(value), business.currency)}</p>
            </div>
          ))}
        </div>
      )}
      <div className="card space-y-2 p-3">
        <p className="font-semibold">Asiento manual</p>
        <TextInput placeholder="Concepto" value={memo} onChange={(event) => setMemo(event.target.value)} />
        <Select value={a1} onChange={(event) => setA1(event.target.value)}>
          <option value="">Cuenta débito</option>
          {(accounts.data ?? []).map((row) => <option key={row.id} value={row.id}>{row.code} {row.name}</option>)}
        </Select>
        <Select value={a2} onChange={(event) => setA2(event.target.value)}>
          <option value="">Cuenta crédito</option>
          {(accounts.data ?? []).map((row) => <option key={row.id} value={row.id}>{row.code} {row.name}</option>)}
        </Select>
        <TextInput inputMode="decimal" placeholder="Monto" value={amount} onChange={(event) => setAmount(event.target.value)} />
        <Button type="button" onClick={() => {
          const cents = Math.round(Number(amount) * 100);
          void manualJournalFn({
            data: { businessId: business.id, memo, lines: [{ accountId: a1, debitCents: cents, creditCents: 0 }, { accountId: a2, debitCents: 0, creditCents: cents }] },
          }).then((result) => {
            if (!result.ok) toast.error(result.error);
            else {
              toast.success("Asiento registrado");
              void qc.invalidateQueries();
            }
          });
        }}>
          Registrar asiento
        </Button>
      </div>
      <Button type="button" tone="ghost" onClick={() => {
        const [year, month] = to.split("-").map(Number);
        void lockFn({ data: { businessId: business.id, year, month, unlock: false } }).then((result) => {
          if (!result.ok) toast.error(result.error);
          else toast.success("Período cerrado");
        });
      }}>
        Cerrar mes en curso
      </Button>
      <div className="space-y-2">
        {(journal.data ?? []).map((entry) => (
          <div key={entry.id} className="card p-3 text-sm">
            <p className="font-medium">{entry.date} · {entry.memo}</p>
            {entry.lines.map((line) => (
              <p key={line.code + line.name} className="tabular-nums text-muted">
                {line.code} {line.name} {line.debitCents ? `Dr ${money(line.debitCents, business.currency)}` : `Cr ${money(line.creditCents, business.currency)}`}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Loans({ today }: { today: string }) {
  const { business, branchId } = useNexo();
  const qc = useQueryClient();
  const loans = useQuery({ queryKey: ["loans", business.id], queryFn: () => listLoansFn({ data: { businessId: business.id } }) });
  const [name, setName] = useState("");
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("0");
  const [months, setMonths] = useState("12");
  const [direction, setDirection] = useState<"received" | "granted">("received");
  const [payId, setPayId] = useState("");
  const [payPrincipal, setPayPrincipal] = useState("");
  const [payInterest, setPayInterest] = useState("0");
  return (
    <div className="space-y-3">
      <h1 className="font-display text-3xl">Préstamos</h1>
      <p className="text-sm text-muted">Son deudas del negocio, distintas del fiado de clientes.</p>
      <Select value={direction} onChange={(event) => setDirection(event.target.value as typeof direction)}>
        <option value="received">Recibido por el negocio</option>
        <option value="granted">Otorgado por el negocio</option>
      </Select>
      <TextInput placeholder="Prestamista o deudor" value={name} onChange={(event) => setName(event.target.value)} />
      <TextInput inputMode="decimal" placeholder="Capital" value={principal} onChange={(event) => setPrincipal(event.target.value)} />
      <TextInput inputMode="decimal" placeholder="Tasa anual %" value={rate} onChange={(event) => setRate(event.target.value)} />
      <TextInput inputMode="numeric" placeholder="Plazo en meses" value={months} onChange={(event) => setMonths(event.target.value)} />
      <Button type="button" onClick={() => void createLoanFn({
        data: {
          businessId: business.id, branchId, direction, counterparty: name,
          principalCents: Math.round(Number(principal) * 100), rateBps: Math.round(Number(rate) * 100),
          startDate: today, termMonths: Number(months), frequency: "mensual", collateral: "", note: "", method: "cash",
        },
      }).then((result) => {
        if (!result.ok) toast.error(result.error);
        else {
          toast.success(`Cuota de referencia ${money(result.data.installmentCents, business.currency)}`);
          void qc.invalidateQueries();
        }
      })}>
        Registrar préstamo
      </Button>
      {(loans.data ?? []).map((loan) => (
        <button key={loan.id} type="button" className="card w-full px-3 py-2 text-left text-sm" onClick={() => setPayId(loan.id)}>
          {loan.counterparty} · saldo {money(loan.balanceCents, business.currency)} · cuota {money(loan.installmentCents, business.currency)}
        </button>
      ))}
      {payId && (
        <div className="card space-y-2 p-3">
          <TextInput placeholder="Capital" value={payPrincipal} onChange={(event) => setPayPrincipal(event.target.value)} />
          <TextInput placeholder="Interés" value={payInterest} onChange={(event) => setPayInterest(event.target.value)} />
          <Button type="button" onClick={() => void payLoanFn({
            data: {
              businessId: business.id, branchId, loanId: payId,
              principalCents: Math.round(Number(payPrincipal || 0) * 100),
              interestCents: Math.round(Number(payInterest || 0) * 100),
              method: "cash", note: "",
            },
          }).then((result) => {
            if (!result.ok) toast.error(result.error);
            else {
              toast.success("Pago aplicado");
              void qc.invalidateQueries();
            }
          })}>
            Registrar pago
          </Button>
        </div>
      )}
    </div>
  );
}

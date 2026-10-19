import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adjustStockFn,
  bulkPriceFn,
  importProductsFn,
  listCategoriesFn,
  listMovementsFn,
  listProductsFn,
  postCountFn,
  saveProductFn,
} from "@/lib/nexo/fns";
import { money, qrPayload, UNITS } from "@/lib/nexo/money";
import type { Product } from "@/lib/nexo/types";
import { downloadPdf, labelsBlob } from "@/lib/nexo/pdf";
import { useNexo } from "./context";
import { Button, Empty, Field, Modal, PhotoPicker, Select, TextInput, Area } from "./ui";

const empty = {
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
  favorite: false,
};

function volumeTier(qty: string, price: string) {
  const minQty = Number(qty);
  const priceCents = Math.round(Number(price) * 100);
  if (!qty || !price || !Number.isInteger(minQty) || minQty < 2 || !Number.isFinite(priceCents) || priceCents < 0) return [];
  return [{ minQty, priceCents }];
}

const DRAFT_KEY = "nexo-product-draft";

export function Inventory() {
  const { business, branchId, screen, go } = useNexo();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(empty);
  const [photo, setPhoto] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [adjustFor, setAdjustFor] = useState<Product | null>(null);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("Ajuste");
  const [csv, setCsv] = useState("nombre,precio,costo,existencia,codigo,categoria,unidad,minimo");
  const [percent, setPercent] = useState("10");
  const [field, setField] = useState<"price" | "wholesale" | "cost">("price");
  const [counts, setCounts] = useState<Record<string, string>>({});
  const products = useQuery({
    queryKey: ["products", business.id, branchId, ""],
    queryFn: () => listProductsFn({ data: { businessId: business.id, branchId, query: "" } }),
  });
  const moves = useQuery({
    queryKey: ["moves", business.id],
    enabled: screen === "movimientos",
    queryFn: () => listMovementsFn({ data: { businessId: business.id } }),
  });
  const categories = useQuery({
    queryKey: ["cats", business.id],
    queryFn: () => listCategoriesFn({ data: { businessId: business.id } }),
  });

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { form?: typeof empty; photo?: string | null; editingId?: string | null };
      if (!parsed.form || typeof parsed.form.name !== "string") return;
      if (!parsed.form.name && !parsed.photo) return;
      setForm({ ...empty, ...parsed.form });
      setPhoto(parsed.photo ?? null);
      setDraftId(parsed.editingId ?? null);
      setOpen(true);
    } catch {
      /* the draft is only a convenience after the camera returns */
    }
  }, []);

  useEffect(() => {
    if (!draftId || editing) return;
    const found = products.data?.find((product) => product.id === draftId);
    if (found) setEditing(found);
  }, [draftId, editing, products.data]);

  useEffect(() => {
    if (!open) return;
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ form, photo, editingId: editing?.id ?? draftId }));
  }, [open, form, photo, editing?.id, draftId]);

  function closeForm() {
    setOpen(false);
    sessionStorage.removeItem(DRAFT_KEY);
  }

  function startNew() {
    setEditing(null);
    setDraftId(null);
    setForm(empty);
    setPhoto(null);
    setOpen(true);
  }
  function startEdit(product: Product) {
    setEditing(product);
    setDraftId(product.id);
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
      favorite: product.favorite,
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
    const result = await saveProductFn({
      data: {
        businessId: business.id,
        branchId,
        id: editing?.id ?? draftId ?? undefined,
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
        initialQty: editing || draftId ? 0 : Number(form.initialQty) || 0,
      },
    });
    if (!result.ok) toast.error(result.error);
    else {
      toast.success(editing || draftId ? "Producto actualizado" : "Producto registrado");
      closeForm();
      void qc.invalidateQueries();
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-3xl">Inventario</h1>
        <Button type="button" onClick={startNew}>
          Nuevo
        </Button>
      </div>
      <div className="flex gap-2 overflow-auto text-sm">
        {[
          ["lista", "Productos"],
          ["conteo", "Conteo"],
          ["importar", "Importar"],
          ["movimientos", "Historial"],
        ].map(([key, label]) => (
          <button key={key} type="button" className={`min-h-11 shrink-0 rounded-full px-3 ${screen === key ? "bg-teal text-on-teal" : "bg-surface"}`} onClick={() => go("inventario", key)}>
            {label}
          </button>
        ))}
      </div>
      {screen === "lista" && (
        <>
          <div className="card grid grid-cols-2 gap-2 p-3">
            <Field label="Campo">
              <Select value={field} onChange={(event) => setField(event.target.value as typeof field)}>
                <option value="price">Precio de venta</option>
                <option value="wholesale">Mayoreo</option>
                <option value="cost">Costo</option>
              </Select>
            </Field>
            <Field label="Porcentaje">
              <TextInput value={percent} onChange={(event) => setPercent(event.target.value)} />
            </Field>
            <Button
              type="button"
              className="col-span-2"
              tone="ghost"
              onClick={() => {
                const bps = Math.round(Number(percent) * 100);
                void bulkPriceFn({ data: { businessId: business.id, categoryId: null, field, percentBps: bps } }).then((result) => {
                  if (!result.ok) toast.error(result.error);
                  else {
                    toast.success(`Se actualizaron ${result.data} productos`);
                    void qc.invalidateQueries();
                  }
                });
              }}
            >
              Aplicar cambio de precios
            </Button>
          </div>
          {(products.data ?? []).length === 0 && <Empty title="Sin productos" body="Registre el primero o cargue el negocio de demostración desde el inicio." />}
          {(products.data ?? []).map((product) => (
            <article key={product.id} className="card p-3">
              <div className="flex gap-3">
                {product.photo && <img src={product.photo} alt="" className="h-16 w-16 rounded-xl object-cover" />}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{product.name}</p>
                  <p className="text-sm text-muted">
                    {money(product.priceCents, business.currency)} · costo {money(product.costCents, business.currency)} · hay {product.stock}
                    {product.barcode ? ` · ${product.barcode}` : ""}
                  </p>
                  <p className="break-all text-xs text-muted">{qrPayload(product.id)}</p>
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <Button type="button" tone="ghost" onClick={() => startEdit(product)}>
                  Editar
                </Button>
                <Button type="button" tone="ghost" onClick={() => setAdjustFor(product)}>
                  Ajustar
                </Button>
                <Button
                  type="button"
                  tone="ghost"
                  onClick={() =>
                    void downloadPdf(
                      () =>
                        labelsBlob({
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
                          products: [product],
                        }),
                      `${product.name}.pdf`,
                    )
                  }
                >
                  QR
                </Button>
              </div>
            </article>
          ))}
        </>
      )}
      {screen === "movimientos" && (
        <div className="space-y-2">
          {(moves.data ?? []).map((row) => (
            <div key={row.id} className="card px-3 py-2 text-sm">
              <p className="font-medium">{row.name}</p>
              <p className="text-muted">
                {row.qty > 0 ? "+" : ""}
                {row.qty} · {row.reason} · {row.branchName}
              </p>
            </div>
          ))}
          {moves.isSuccess && moves.data.length === 0 && <Empty title="Sin movimientos" body="Las ventas, compras y ajustes aparecerán aquí." />}
        </div>
      )}
      {screen === "importar" && (
        <div className="space-y-2">
          <p className="text-sm text-muted">CSV con encabezado: nombre,precio,costo,existencia,codigo,categoria,unidad,minimo. Los precios van en córdobas, no en centavos.</p>
          <Area value={csv} onChange={(event) => setCsv(event.target.value)} />
          <Button
            type="button"
            onClick={() => {
              const lines = csv.trim().split(/\r?\n/).filter(Boolean);
              const header = lines[0]?.split(",").map((cell) => cell.trim().toLowerCase()) ?? [];
              const col = (cells: string[], name: string) => cells[header.indexOf(name)]?.trim() ?? "";
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
                  sku: "",
                };
              });
              void importProductsFn({ data: { businessId: business.id, branchId, rows } }).then((result) => {
                if (!result.ok) toast.error(result.error);
                else {
                  toast.success(`Se importaron ${result.data} productos`);
                  void qc.invalidateQueries();
                }
              });
            }}
          >
            Importar
          </Button>
        </div>
      )}
      {screen === "conteo" && (
        <div className="space-y-2">
          <p className="text-sm text-muted">Escriba la existencia física. Al confirmar, solo se ajustan las diferencias y queda el motivo “Conteo físico”.</p>
          {(products.data ?? []).map((product) => (
            <label key={product.id} className="card flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span>
                {product.name}
                <span className="block text-muted">Sistema: {product.stock}</span>
              </span>
              <TextInput className="max-w-24" inputMode="numeric" value={counts[product.id] ?? ""} placeholder={String(product.stock)} onChange={(event) => setCounts((curr) => ({ ...curr, [product.id]: event.target.value }))} />
            </label>
          ))}
          <Button
            type="button"
            onClick={() => {
              const lines = Object.entries(counts)
                .filter(([, value]) => value !== "")
                .map(([productId, value]) => ({ productId, counted: Number(value) }));
              void postCountFn({ data: { businessId: business.id, branchId, lines } }).then((result) => {
                if (!result.ok) toast.error(result.error);
                else {
                  toast.success(`Ajustes aplicados: ${result.data}`);
                  setCounts({});
                  void qc.invalidateQueries();
                }
              });
            }}
          >
            Confirmar conteo
          </Button>
        </div>
      )}
      <Modal open={open} title={editing || draftId ? "Editar producto" : "Nuevo producto"} onClose={closeForm}>
        <div className="space-y-3">
          <Field label="Nombre"><TextInput value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field label="Descripción"><Area value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
          <div>
            <p className="mb-1 text-sm text-muted">Foto</p>
            <PhotoPicker value={photo} onChange={setPhoto} />
            <p className="mt-1 text-xs text-muted">La foto se toma aquí, sin abrir la cámara del sistema, para que la ficha no se pierda.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Categoría"><TextInput list="cats" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></Field>
            <datalist id="cats">{(categories.data ?? []).map((cat) => <option key={cat.id} value={cat.name} />)}</datalist>
            <Field label="Subcategoría"><TextInput value={form.subcategory} onChange={(event) => setForm({ ...form, subcategory: event.target.value })} /></Field>
            <Field label="Marca"><TextInput value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} /></Field>
            <Field label="SKU"><TextInput value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} /></Field>
            <Field label="Código de barras"><TextInput value={form.barcode} onChange={(event) => setForm({ ...form, barcode: event.target.value })} /></Field>
            <Field label="Variante"><TextInput value={form.variant} placeholder="Talla, color…" onChange={(event) => setForm({ ...form, variant: event.target.value })} /></Field>
            <Field label="Unidad">
              <Select value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })}>
                {UNITS.map((unit) => <option key={unit}>{unit}</option>)}
              </Select>
            </Field>
            <Field label="Costo"><TextInput inputMode="decimal" value={form.cost} onChange={(event) => setForm({ ...form, cost: event.target.value })} /></Field>
            <Field label="Precio de venta"><TextInput inputMode="decimal" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></Field>
            <Field label="Mayoreo"><TextInput inputMode="decimal" value={form.wholesale} onChange={(event) => setForm({ ...form, wholesale: event.target.value })} /></Field>
            <Field label="Precio promo"><TextInput inputMode="decimal" value={form.promo} onChange={(event) => setForm({ ...form, promo: event.target.value })} /></Field>
            <Field label="Promo hasta"><TextInput type="date" value={form.promoUntil} onChange={(event) => setForm({ ...form, promoUntil: event.target.value })} /></Field>
            <Field label="Desde cuántas unidades"><TextInput inputMode="numeric" value={form.volumeQty} onChange={(event) => setForm({ ...form, volumeQty: event.target.value })} /></Field>
            <Field label="Precio por volumen"><TextInput inputMode="decimal" value={form.volumePrice} onChange={(event) => setForm({ ...form, volumePrice: event.target.value })} /></Field>
            <Field label="Mínimo"><TextInput inputMode="numeric" value={form.minQty} onChange={(event) => setForm({ ...form, minQty: event.target.value })} /></Field>
            {!editing && !draftId && <Field label="Existencia inicial"><TextInput inputMode="numeric" value={form.initialQty} onChange={(event) => setForm({ ...form, initialQty: event.target.value })} /></Field>}
            <Field label="Vence"><TextInput type="date" value={form.expiresOn} onChange={(event) => setForm({ ...form, expiresOn: event.target.value })} /></Field>
            <Field label="Lote"><TextInput value={form.lotCode} onChange={(event) => setForm({ ...form, lotCode: event.target.value })} /></Field>
            <Field label="Ubicación"><TextInput value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></Field>
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={form.taxExempt} onChange={(event) => setForm({ ...form, taxExempt: event.target.checked })} /> Exento de impuesto</label>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={form.regulated} onChange={(event) => setForm({ ...form, regulated: event.target.checked })} /> Sujeto a control (pide referencia al vender)</label>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Activo</label>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={form.favorite} onChange={(event) => setForm({ ...form, favorite: event.target.checked })} /> Favorito en caja</label>
          {business.businessType === "farmacia" && <p className="text-sm text-muted">En farmacia, registre cada lote como producto. Al escanear el mismo código se ofrece primero el que vence antes. Los vencidos no se venden.</p>}
          <Button type="button" onClick={() => void save()}>Guardar</Button>
        </div>
      </Modal>
      <Modal open={Boolean(adjustFor)} title="Ajuste de existencia" onClose={() => setAdjustFor(null)}>
        {adjustFor && (
          <div className="space-y-3">
            <p className="text-sm">{adjustFor.name}. Sistema: {adjustFor.stock}. Use un número negativo para una salida.</p>
            <Field label="Cantidad (+/−)"><TextInput value={delta} onChange={(event) => setDelta(event.target.value)} /></Field>
            <Field label="Motivo"><TextInput value={reason} onChange={(event) => setReason(event.target.value)} /></Field>
            <Button
              type="button"
              onClick={() => {
                void adjustStockFn({
                  data: { businessId: business.id, branchId, productId: adjustFor.id, qtyDelta: Number(delta), reason, note: "" },
                }).then((result) => {
                  if (!result.ok) toast.error(result.error);
                  else {
                    toast.success(`Nueva existencia: ${result.data}`);
                    setAdjustFor(null);
                    setDelta("");
                    void qc.invalidateQueries();
                  }
                });
              }}
            >
              Confirmar ajuste
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

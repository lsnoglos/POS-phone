import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserButton } from "@/lib/auth/gates";
import {
  abonoFn,
  acceptInviteFn,
  auditFn,
  createBranchFn,
  createInviteFn,
  listCustomersFn,
  listMembersFn,
  listProductsFn,
  listQuotesFn,
  listSalesFn,
  listSuppliersFn,
  reportFn,
  returnSaleFn,
  saveCustomerFn,
  saveQuoteFn,
  saveSupplierFn,
  statementFn,
  transferFn,
  updateBusinessFn,
  updateCapsFn,
  voidQuoteFn,
  confirmPaymentFn,
  listPendingFn,
  getSaleFn,
  deleteBusinessFn,
} from "@/lib/nexo/fns";
import { ALL_CAPS, BUSINESS_TYPES, CAP_LABEL, capsFor, labelGrid, money, ROLE_LABEL, type Cap } from "@/lib/nexo/money";
import { downloadPdf, invoiceBlob, labelsBlob } from "@/lib/nexo/pdf";
import { useNexo } from "./context";
import { Button, Field, PhotoPicker, Select, TextInput, accentFromDataUrl, todayIn } from "./ui";

export function More() {
  const { screen, go } = useNexo();
  if (screen === "clientes" || screen === "fiados") return <Customers fiados={screen === "fiados"} />;
  if (screen === "proveedores") return <Suppliers />;
  if (screen === "etiquetas") return <Labels />;
  if (screen === "reportes") return <Reports />;
  if (screen === "equipo") return <Team />;
  if (screen === "sucursales") return <Branches />;
  if (screen === "auditoria") return <Audit />;
  if (screen === "ajustes") return <Settings />;
  if (screen === "integraciones") return <Integrations />;
  if (screen === "ayuda") return <Help />;
  if (screen === "cotizaciones") return <Quotes />;
  if (screen === "ventas") return <SalesHistory />;
  const items = [
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
    ["ayuda", "Ayuda"],
  ] as const;
  return (
    <div className="space-y-2">
      <h1 className="font-display text-3xl">Más</h1>
      {items.map(([key, label]) => (
        <button key={key} type="button" className="card min-h-12 w-full px-4 text-left font-medium" onClick={() => go("mas", key)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function Customers({ fiados }: { fiados: boolean }) {
  const { business, branchId } = useNexo();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["customers", business.id], queryFn: () => listCustomersFn({ data: { businessId: business.id } }) });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [limit, setLimit] = useState("0");
  const [openId, setOpenId] = useState<string | null>(null);
  const [abono, setAbono] = useState("");
  const statement = useQuery({
    queryKey: ["statement", openId],
    enabled: Boolean(openId),
    queryFn: () => statementFn({ data: { businessId: business.id, customerId: openId! } }),
  });
  const rows = (list.data ?? []).filter((row) => !fiados || row.balanceCents > 0);
  return (
    <div className="space-y-3">
      <h1 className="font-display text-3xl">{fiados ? "Fiados" : "Clientes"}</h1>
      {!fiados && (
        <div className="card space-y-2 p-3">
          <TextInput placeholder="Nombre" value={name} onChange={(event) => setName(event.target.value)} />
          <TextInput placeholder="Teléfono" value={phone} onChange={(event) => setPhone(event.target.value)} />
          <TextInput placeholder="Límite de crédito (0 = sin fiado)" value={limit} onChange={(event) => setLimit(event.target.value)} />
          <Button type="button" onClick={() => void saveCustomerFn({
            data: {
              businessId: business.id, name, phone, address: "", taxId: "", photo: null,
              creditLimitCents: Math.round(Number(limit || 0) * 100), priceTier: "retail", blocked: false, notes: "",
            },
          }).then((result) => {
            if (!result.ok) toast.error(result.error);
            else {
              toast.success("Cliente guardado");
              setName("");
              void qc.invalidateQueries();
            }
          })}>
            Guardar cliente
          </Button>
        </div>
      )}
      {rows.map((row) => (
        <button key={row.id} type="button" className="card w-full px-3 py-2 text-left" onClick={() => setOpenId(row.id)}>
          <span className="font-medium">{row.name}</span>
          <span className="block text-sm text-muted">Saldo {money(row.balanceCents, business.currency)} · límite {money(row.creditLimitCents, business.currency)}</span>
        </button>
      ))}
      {openId && statement.data && (
        <div className="card space-y-2 p-3">
          <p className="font-semibold">{statement.data.customer.name}</p>
          {statement.data.sales.map((sale) => (
            <p key={sale.id} className="text-sm">{sale.number} · {money(sale.totalCents, business.currency)} {sale.dueOn ? `· vence ${sale.dueOn}` : ""}</p>
          ))}
          {statement.data.payments.map((pay) => (
            <p key={pay.id} className="text-sm">{pay.receiptNumber} · {pay.method} · {money(pay.amountCents, business.currency)} {pay.reversesId ? "(reversión)" : ""}</p>
          ))}
          <TextInput placeholder="Abono" value={abono} onChange={(event) => setAbono(event.target.value)} />
          <Button type="button" onClick={() => void abonoFn({
            data: {
              businessId: business.id, branchId, customerId: openId,
              amountCents: Math.round(Number(abono) * 100), method: "cash", reference: "", note: "", clientId: crypto.randomUUID(),
            },
          }).then((result) => {
            if (!result.ok) toast.error(result.error);
            else {
              toast.success(`Recibo ${result.data.receipt}`);
              setAbono("");
              void qc.invalidateQueries();
            }
          })}>
            Registrar abono
          </Button>
        </div>
      )}
    </div>
  );
}

function Suppliers() {
  const { business } = useNexo();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["suppliers", business.id], queryFn: () => listSuppliersFn({ data: { businessId: business.id } }) });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  return (
    <div className="space-y-3">
      <h1 className="font-display text-3xl">Proveedores</h1>
      <TextInput placeholder="Nombre comercial" value={name} onChange={(event) => setName(event.target.value)} />
      <TextInput placeholder="Teléfono" value={phone} onChange={(event) => setPhone(event.target.value)} />
      <Button type="button" onClick={() => void saveSupplierFn({
        data: { businessId: business.id, name, phone, contact: "", address: "", taxId: "", terms: "", notes: "" },
      }).then((result) => {
        if (!result.ok) toast.error(result.error);
        else {
          toast.success("Proveedor guardado");
          void qc.invalidateQueries();
        }
      })}>
        Guardar
      </Button>
      {(list.data ?? []).map((row) => (
        <p key={row.id} className="card px-3 py-2 text-sm">{row.name} · por pagar {money(row.balanceCents, business.currency)}</p>
      ))}
    </div>
  );
}

function Labels() {
  const { business, branchId } = useNexo();
  const products = useQuery({ queryKey: ["products", business.id, branchId, ""], queryFn: () => listProductsFn({ data: { businessId: business.id, branchId, query: "" } }) });
  const [picked, setPicked] = useState<string[]>([]);
  const [cols, setCols] = useState(3);
  const [rows, setRows] = useState(8);
  const [margin, setMargin] = useState(10);
  const [gap, setGap] = useState(2);
  const [copies, setCopies] = useState(1);
  const [showBusiness, setShowBusiness] = useState(true);
  const [showBarcode, setShowBarcode] = useState(false);
  let gridError = "";
  let cells = 0;
  try {
    cells = labelGrid({ cols, rows, marginMm: margin, gapX: gap, gapY: gap }).cells.length;
  } catch (error) {
    gridError = error instanceof Error ? error.message : "Cuadrícula inválida";
  }
  const chosen = (products.data ?? []).filter((product) => picked.includes(product.id));
  return (
    <div className="space-y-3">
      <h1 className="font-display text-3xl">Etiquetas</h1>
      <p className="text-sm text-muted">Hoja carta 21.59 × 27.94 cm. El QR guarda el identificador del producto, no el precio.</p>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Columnas"><TextInput inputMode="numeric" value={cols} onChange={(event) => setCols(Number(event.target.value))} /></Field>
        <Field label="Filas"><TextInput inputMode="numeric" value={rows} onChange={(event) => setRows(Number(event.target.value))} /></Field>
        <Field label="Margen mm"><TextInput inputMode="numeric" value={margin} onChange={(event) => setMargin(Number(event.target.value))} /></Field>
        <Field label="Separación mm"><TextInput inputMode="numeric" value={gap} onChange={(event) => setGap(Number(event.target.value))} /></Field>
        <Field label="Copias"><TextInput inputMode="numeric" value={copies} onChange={(event) => setCopies(Number(event.target.value))} /></Field>
      </div>
      {gridError ? <p className="text-sm text-clay">{gridError}</p> : <p className="text-sm text-muted">{cells} etiquetas por hoja.</p>}
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={showBusiness} onChange={(event) => setShowBusiness(event.target.checked)} /> Nombre del negocio</label>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={showBarcode} onChange={(event) => setShowBarcode(event.target.checked)} /> Código de barras si existe</label>
      <div className="mx-auto w-full max-w-sm bg-white p-2 shadow" style={{ aspectRatio: "8.5 / 11" }}>
        <div
          className="grid h-full w-full"
          style={{
            gridTemplateColumns: `repeat(${Math.max(cols, 1)}, 1fr)`,
            gridTemplateRows: `repeat(${Math.max(rows, 1)}, 1fr)`,
            gap: 2,
            padding: 4,
          }}
        >
          {Array.from({ length: cells }).map((_, index) => {
            const product = chosen[index % Math.max(chosen.length, 1)];
            return (
              <div key={index} className="overflow-hidden border border-line p-0.5 text-center text-[8px] text-ink">
                {product ? (
                  <>
                    <div className="mx-auto my-0.5 h-4 w-4 bg-ink" />
                    <div className="truncate font-semibold">{product.name}</div>
                    <div>{money(product.priceCents, business.currency)}</div>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <Button type="button" tone="ghost" onClick={() => setPicked((products.data ?? []).map((product) => product.id))}>Seleccionar todos</Button>
      {(products.data ?? []).map((product) => (
        <label key={product.id} className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={picked.includes(product.id)} onChange={(event) => setPicked((curr) => event.target.checked ? [...curr, product.id] : curr.filter((id) => id !== product.id))} />
          {product.name} · {money(product.priceCents, business.currency)}
        </label>
      ))}
      <Button type="button" disabled={Boolean(gridError) || chosen.length === 0} onClick={() => void downloadPdf(() => labelsBlob({
        businessName: business.name, currency: business.currency, cols, rows, marginMm: margin, gapX: gap, gapY: gap,
        showPhoto: false, showName: true, showPrice: true, showQr: true, showBarcode, showBusiness, copies: Math.max(1, copies),
        products: chosen,
      }), "etiquetas-nexo.pdf")}>
        Generar PDF
      </Button>
    </div>
  );
}

function Reports() {
  const { business, branchId } = useNexo();
  const today = todayIn(business.timezone);
  const [from, setFrom] = useState(`${today.slice(0, 8)}01`);
  const [to, setTo] = useState(today);
  const query = useQuery({
    queryKey: ["report", business.id, branchId, from, to],
    queryFn: () => reportFn({ data: { businessId: business.id, branchId, from, to } }),
  });
  const data = query.data;
  return (
    <div className="space-y-3">
      <h1 className="font-display text-3xl">Reportes</h1>
      <div className="grid grid-cols-2 gap-2">
        <TextInput type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        <TextInput type="date" value={to} onChange={(event) => setTo(event.target.value)} />
      </div>
      {data && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Ventas netas" value={money(data.netSales, business.currency)} />
            <Stat label="Margen bruto" value={money(data.gross, business.currency)} />
            <Stat label="Gastos" value={money(data.expenses, business.currency)} />
            <Stat label="Utilidad neta" value={money(data.net, business.currency)} />
            <Stat label="Período anterior" value={money(data.previousCents, business.currency)} />
          </div>
          {data.byCashier.map((row) => <p key={row.name} className="text-sm">{row.name}: {money(row.totalCents, business.currency)}</p>)}
          <p className="font-semibold">Ganancia por producto</p>
          {data.products.map((row) => <p key={row.name} className="text-sm">{row.name} · {row.qty} · {money(row.profitCents, business.currency)}</p>)}
          <p className="font-semibold">Sin movimiento</p>
          {data.quiet.length === 0 && <p className="text-sm text-muted">No hay productos quietos con existencia en este período.</p>}
          {data.quiet.map((row) => <p key={row.name} className="text-sm">{row.name} · hay {row.qty}</p>)}
          {data.hints.map((hint) => (
            <p key={hint.name} className="rounded-xl bg-teal-soft px-3 py-2 text-sm">
              {hint.name}: se vendieron {hint.qty} en el período y dejó {money(hint.profitCents, business.currency)} de margen.
            </p>
          ))}
          <Button type="button" tone="ghost" onClick={() => {
            const csv = ["concepto,monto", `ventas,${data.netSales / 100}`, `margen,${data.gross / 100}`, `utilidad,${data.net / 100}`].join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "reporte-nexo.csv";
            link.click();
          }}>
            Descargar CSV
          </Button>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-3 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Team() {
  const { business, displayName } = useNexo();
  const qc = useQueryClient();
  const members = useQuery({ queryKey: ["members", business.id], queryFn: () => listMembersFn({ data: { businessId: business.id } }) });
  const [role, setRole] = useState("cashier");
  const [code, setCode] = useState("");
  const [join, setJoin] = useState("");
  return (
    <div className="space-y-3">
      <h1 className="font-display text-3xl">Equipo</h1>
      <Select value={role} onChange={(event) => setRole(event.target.value)}>
        {Object.entries(ROLE_LABEL).filter(([key]) => key !== "owner").map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </Select>
      <Button type="button" onClick={() => void createInviteFn({ data: { businessId: business.id, role } }).then((result) => {
        if (!result.ok) toast.error(result.error);
        else setCode(result.data);
      })}>
        Crear código de invitación
      </Button>
      {code && <p className="font-display text-3xl tracking-widest">{code}</p>}
      <p className="text-sm text-muted">La otra persona inicia sesión y escribe el código. Caduca en 7 días y sirve una vez.</p>
      <TextInput placeholder="Tengo un código" value={join} onChange={(event) => setJoin(event.target.value)} />
      <Button type="button" tone="ghost" onClick={() => void acceptInviteFn({ data: { code: join, displayName } }).then((result) => {
        if (!result.ok) toast.error(result.error);
        else {
          toast.success("Se unió al negocio");
          void qc.invalidateQueries();
        }
      })}>
        Unirme
      </Button>
      {(members.data ?? []).map((member) => (
        <div key={member.id} className="card p-3 text-sm">
          <p className="font-medium">{member.displayName} · {ROLE_LABEL[member.role] ?? member.role}</p>
          {member.role !== "owner" && (
            <div className="mt-2 flex flex-wrap gap-2">
              {ALL_CAPS.map((cap) => {
                const on = capsFor(member.role, member.caps).includes(cap);
                return (
                  <button key={cap} type="button" className={`min-h-10 rounded-full px-3 ${on ? "bg-teal text-on-teal" : "bg-paper"}`} onClick={() => {
                    const next = new Set(capsFor(member.role, member.caps));
                    if (next.has(cap)) next.delete(cap);
                    else next.add(cap);
                    void updateCapsFn({ data: { businessId: business.id, memberId: member.id, caps: [...next] } }).then((result) => {
                      if (!result.ok) toast.error(result.error);
                      else void qc.invalidateQueries();
                    });
                  }}>
                    {CAP_LABEL[cap as Cap]}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Branches() {
  const { business, branchId } = useNexo();
  const qc = useQueryClient();
  const products = useQuery({ queryKey: ["products", business.id, branchId, ""], queryFn: () => listProductsFn({ data: { businessId: business.id, branchId, query: "" } }) });
  const [name, setName] = useState("");
  const [productId, setProductId] = useState("");
  const [to, setTo] = useState("");
  const [qty, setQty] = useState("1");
  return (
    <div className="space-y-3">
      <h1 className="font-display text-3xl">Sucursales</h1>
      {business.branches.map((branch) => <p key={branch.id} className="text-sm">{branch.name}{branch.isDefault ? " · principal" : ""}</p>)}
      <TextInput placeholder="Nueva sucursal" value={name} onChange={(event) => setName(event.target.value)} />
      <Button type="button" onClick={() => void createBranchFn({ data: { businessId: business.id, name } }).then((result) => {
        if (!result.ok) toast.error(result.error);
        else {
          toast.success("Sucursal creada");
          void qc.invalidateQueries();
        }
      })}>
        Crear sucursal
      </Button>
      <Select value={productId} onChange={(event) => setProductId(event.target.value)}>
        <option value="">Producto a trasladar</option>
        {(products.data ?? []).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
      </Select>
      <Select value={to} onChange={(event) => setTo(event.target.value)}>
        <option value="">Sucursal destino</option>
        {business.branches.filter((branch) => branch.id !== branchId).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
      </Select>
      <TextInput value={qty} onChange={(event) => setQty(event.target.value)} />
      <Button type="button" tone="ghost" onClick={() => void transferFn({
        data: { businessId: business.id, fromBranchId: branchId, toBranchId: to, productId, qty: Number(qty), note: "" },
      }).then((result) => {
        if (!result.ok) toast.error(result.error);
        else {
          toast.success("Traslado hecho");
          void qc.invalidateQueries();
        }
      })}>
        Trasladar
      </Button>
    </div>
  );
}

function Audit() {
  const { business } = useNexo();
  const query = useQuery({ queryKey: ["audit", business.id], queryFn: () => auditFn({ data: { businessId: business.id } }) });
  return (
    <div className="space-y-2">
      <h1 className="font-display text-3xl">Auditoría</h1>
      {(query.data ?? []).map((row, index) => (
        <p key={`${row.createdAt}-${index}`} className="text-sm">
          {new Date(row.createdAt).toLocaleString("es-NI")} · {row.actor} · {row.action} {row.entity} {row.detail}
        </p>
      ))}
    </div>
  );
}

function Settings() {
  const { business, selectBusiness } = useNexo();
  const qc = useQueryClient();
  const [name, setName] = useState(business.name);
  const [address, setAddress] = useState(business.address);
  const [phone, setPhone] = useState(business.phone);
  const [taxId, setTaxId] = useState(business.taxId);
  const [type, setType] = useState(business.businessType);
  const [currency, setCurrency] = useState(business.currency);
  const [prefix, setPrefix] = useState(business.invoicePrefix);
  const [tax, setTax] = useState((business.taxRateBps / 100).toString());
  const [days, setDays] = useState(String(business.creditDays));
  const [negative, setNegative] = useState(business.allowNegativeStock);
  const [logo, setLogo] = useState<string | null>(business.logo);
  const [useColors, setUseColors] = useState(business.useLogoColors);
  const [accent, setAccent] = useState(business.accentColor);
  const [confirm, setConfirm] = useState("");
  const [dark, setDark] = useState(typeof document !== "undefined" && document.documentElement.classList.contains("dark"));
  useEffect(() => {
    if (!logo || !useColors) {
      setAccent("");
      return;
    }
    let live = true;
    void accentFromDataUrl(logo).then((color) => {
      if (live) setAccent(color);
    }).catch(() => {
      if (live) setAccent("");
    });
    return () => {
      live = false;
    };
  }, [logo, useColors]);
  return (
    <div className="space-y-3">
      <h1 className="font-display text-3xl">Configuración</h1>
      <UserButton />
      <button type="button" className="card min-h-11 w-full px-3 text-left" onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle("dark", next);
        localStorage.setItem("nexo-theme", next ? "dark" : "light");
      }}>
        {dark ? "Usar modo claro" : "Usar modo oscuro"}
      </button>
      <div>
        <p className="mb-1 text-sm text-muted">Logotipo</p>
        <PhotoPicker value={logo} onChange={setLogo} />
      </div>
      <label className="flex min-h-11 items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={useColors} onChange={(event) => setUseColors(event.target.checked)} />
        <span>
          Usar los colores del logotipo
          <span className="mt-1 block text-muted">Si no lo marca, se quedan el modo claro y el modo oscuro.</span>
        </span>
      </label>
      {useColors && accent && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <span className="inline-block h-6 w-6 rounded-full" style={{ background: accent }} />
          Este color queda en los botones. El claro y el oscuro siguen ahí.
        </p>
      )}
      <TextInput value={name} onChange={(event) => setName(event.target.value)} />
      <TextInput value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Dirección" />
      <TextInput value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Teléfono" />
      <TextInput value={taxId} onChange={(event) => setTaxId(event.target.value)} placeholder="Identificación fiscal" />
      <Select value={type} onChange={(event) => setType(event.target.value)}>
        {BUSINESS_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </Select>
      <Select value={currency} onChange={(event) => setCurrency(event.target.value)}>
        <option value="NIO">Córdoba (C$)</option>
        <option value="USD">Dólar (US$)</option>
      </Select>
      <TextInput value={prefix} onChange={(event) => setPrefix(event.target.value)} placeholder="Prefijo de factura" />
      <Field label="Impuesto % (no se asume IVA; configúrelo si aplica)">
        <TextInput value={tax} onChange={(event) => setTax(event.target.value)} />
      </Field>
      <Field label="Días de crédito"><TextInput value={days} onChange={(event) => setDays(event.target.value)} /></Field>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={negative} onChange={(event) => setNegative(event.target.checked)} />
        Permitir existencias negativas
      </label>
      <Button type="button" onClick={() => void updateBusinessFn({
        data: {
          businessId: business.id, name, address, phone, taxId, businessType: type, currency,
          timezone: business.timezone, invoicePrefix: prefix, taxRateBps: Math.round(Number(tax || 0) * 100),
          creditDays: Number(days || 0), allowNegativeStock: negative, logo,
          useLogoColors: Boolean(useColors && accent), accentColor: accent,
        },
      }).then((result) => {
        if (!result.ok) toast.error(result.error);
        else {
          toast.success("Configuración guardada");
          void qc.invalidateQueries();
        }
      })}>
        Guardar
      </Button>
      <Field label="Escriba el nombre del negocio para eliminarlo">
        <TextInput value={confirm} onChange={(event) => setConfirm(event.target.value)} />
      </Field>
      <Button type="button" tone="clay" onClick={() => void deleteBusinessFn({ data: { businessId: business.id, confirmName: confirm } }).then((result) => {
        if (!result.ok) toast.error(result.error);
        else {
          toast.success("Negocio eliminado");
          selectBusiness("");
          void qc.invalidateQueries();
        }
      })}>
        Eliminar negocio
      </Button>
    </div>
  );
}

function Integrations() {
  return (
    <div className="space-y-3 text-sm">
      <h1 className="font-display text-3xl">Integraciones</h1>
      <p className="card p-3"><strong>Google</strong> — El inicio de sesión con Google está activo. NEXO no guarda la contraseña.</p>
      <p className="card p-3"><strong>Base de datos</strong> — Los datos viven en Postgres, aislados por negocio. No hay un proyecto de Firebase conectado y no se simula.</p>
      <p className="card p-3"><strong>Hojas, Drive, Calendar y Contactos</strong> — No conectados. Hace falta autorización de Google Cloud. La exportación disponible hoy es CSV y PDF dentro de la app.</p>
      <p className="card p-3"><strong>Impresora Bluetooth</strong> — El navegador no habla ESC/POS de forma fiable. Use el PDF del ticket, compartir o el cuadro de impresión del teléfono.</p>
      <p className="card p-3"><strong>Sin internet</strong> — Puede consultar productos ya cargados y, si se corta la red al cobrar, la venta queda en cola en este teléfono. No hay consistencia automática entre varios teléfonos desconectados.</p>
      <p className="card p-3"><strong>Factura fiscal</strong> — El comprobante es interno. La factura electrónica de la DGI no está integrada.</p>
    </div>
  );
}

function Help() {
  return (
    <div className="space-y-3 text-sm">
      <h1 className="font-display text-3xl">Ayuda</h1>
      <p>1. Cree el negocio y registre un producto con precio, costo y existencia.</p>
      <p>2. En Inventario, genere el QR. Ese código identifica el producto; el precio se consulta al vender.</p>
      <p>3. Abra la caja si va a cobrar en efectivo.</p>
      <p>4. En Venta, escanee o toque el producto, cobre y descargue el comprobante.</p>
      <p>5. La existencia baja al confirmar. El asiento contable se crea solo.</p>
      <p>Para fiado, el cliente necesita límite de crédito mayor que cero. Un saldo vencido bloquea un fiado nuevo hasta el abono.</p>
    </div>
  );
}

function Quotes() {
  const { business, branchId } = useNexo();
  const qc = useQueryClient();
  const products = useQuery({ queryKey: ["products", business.id, branchId, ""], queryFn: () => listProductsFn({ data: { businessId: business.id, branchId, query: "" } }) });
  const quotes = useQuery({ queryKey: ["quotes", business.id], queryFn: () => listQuotesFn({ data: { businessId: business.id } }) });
  const [productId, setProductId] = useState("");
  const [note, setNote] = useState("");
  return (
    <div className="space-y-3">
      <h1 className="font-display text-3xl">Cotizaciones</h1>
      <p className="text-sm text-muted">No mueve inventario ni contabilidad hasta que la pase a una venta.</p>
      <Select value={productId} onChange={(event) => setProductId(event.target.value)}>
        <option value="">Producto</option>
        {(products.data ?? []).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
      </Select>
      <TextInput placeholder="Nota" value={note} onChange={(event) => setNote(event.target.value)} />
      <Button type="button" onClick={() => {
        const product = products.data?.find((row) => row.id === productId);
        if (!product) return;
        void saveQuoteFn({
          data: {
            businessId: business.id, customerId: null, note, totalCents: product.priceCents,
            cart: { lines: [{ productId: product.id, name: product.name, qty: 1, unitPriceCents: product.priceCents, discountCents: 0, note: "", priceTouched: true, taxExempt: product.taxExempt, regulated: product.regulated }] },
          },
        }).then((result) => {
          if (!result.ok) toast.error(result.error);
          else {
            toast.success(result.data.number);
            void qc.invalidateQueries();
          }
        });
      }}>
        Guardar cotización
      </Button>
      {(quotes.data ?? []).map((quote) => (
        <div key={quote.id} className="card px-3 py-2 text-sm">
          <p>{quote.number} · {money(quote.totalCents, business.currency)} · {quote.status}</p>
          <button type="button" className="min-h-11 text-teal" onClick={() => void voidQuoteFn({ data: { businessId: business.id, quoteId: quote.id } }).then(() => qc.invalidateQueries())}>Anular</button>
        </div>
      ))}
    </div>
  );
}

function SalesHistory() {
  const { business } = useNexo();
  const qc = useQueryClient();
  const sales = useQuery({ queryKey: ["sales", business.id], queryFn: () => listSalesFn({ data: { businessId: business.id } }) });
  return (
    <div className="space-y-2">
      <h1 className="font-display text-3xl">Ventas</h1>
      {(sales.data ?? []).map((sale) => (
        <div key={sale.id} className="card px-3 py-2 text-sm">
          <p className="font-medium">{sale.number} · {sale.kind === "return" ? "Devolución" : "Venta"} · {money(sale.totalCents, business.currency)}</p>
          <p className="text-muted">{sale.customerName}</p>
          <div className="mt-1 flex gap-3">
            <button type="button" className="min-h-11 text-teal" onClick={() => void getSaleFn({ data: { businessId: business.id, saleId: sale.id } }).then((doc) => downloadPdf(() => invoiceBlob(doc, "80"), `${doc.number}.pdf`))}>PDF</button>
            {sale.kind === "sale" && (
              <button type="button" className="min-h-11 text-clay" onClick={() => void getSaleFn({ data: { businessId: business.id, saleId: sale.id } }).then((doc) => returnSaleFn({
                data: {
                  businessId: business.id,
                  saleId: sale.id,
                  clientId: crypto.randomUUID(),
                  refundMethod: "cash",
                  lines: doc.items.filter((item) => item.qty > item.returnedQty).map((item) => ({ saleItemId: item.id, qty: item.qty - item.returnedQty })),
                },
              })).then((result) => {
                if (!result.ok) toast.error(result.error);
                else {
                  toast.success(result.data.number);
                  void qc.invalidateQueries();
                }
              })}>
                Devolver todo
              </button>
            )}
          </div>
        </div>
      ))}
      <PendingPayments />
    </div>
  );
}

function PendingPayments() {
  const { business } = useNexo();
  const qc = useQueryClient();
  const pending = useQuery({
    queryKey: ["pending", business.id],
    queryFn: () => listPendingFn({ data: { businessId: business.id } }),
  });
  const rows = pending.data ?? [];
  return (
    <div className="space-y-2 pt-2">
      <h2 className="font-display text-xl">Pagos por confirmar</h2>
      {pending.isPending && <p className="text-sm text-muted">Buscando transferencias y tarjetas…</p>}
      {!pending.isPending && rows.length === 0 && (
        <p className="text-sm text-muted">No hay pagos electrónicos esperando confirmación.</p>
      )}
      {rows.map((row) => (
        <div key={row.id} className="card px-3 py-2 text-sm">
          <p className="font-medium">
            {row.number} · {row.method === "card" ? "Tarjeta" : "Transferencia"} · {money(row.amountCents, business.currency)}
          </p>
          <p className="text-muted">{row.reference || "Sin referencia"} · fondos en tránsito</p>
          <button
            type="button"
            className="min-h-11 text-teal"
            onClick={() =>
              void confirmPaymentFn({ data: { businessId: business.id, paymentId: row.id } }).then((result) => {
                if (!result.ok) toast.error(result.error);
                else {
                  toast.success("Pago confirmado. Pasó de tránsito a bancos.");
                  void qc.invalidateQueries();
                }
              })
            }
          >
            Confirmar recibido
          </button>
        </div>
      ))}
    </div>
  );
}

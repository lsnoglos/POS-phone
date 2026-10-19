import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Package, Receipt, ShoppingCart, Tags, Truck, Users, Wallet, FileBarChart } from "lucide-react";
import { dashboardFn } from "@/lib/nexo/fns";
import { money } from "@/lib/nexo/money";
import { useNexo } from "./context";

const ACTIONS = [
  { label: "Nueva venta", hint: "Cobrar en el mostrador", area: "venta", screen: "", icon: ShoppingCart, tone: "bg-teal text-on-teal" },
  { label: "Nueva compra", hint: "Entrar mercancía", area: "finanzas", screen: "compras", icon: Truck, tone: "bg-clay text-on-clay" },
  { label: "Inventario", hint: "Productos y existencias", area: "inventario", screen: "lista", icon: Package, tone: "bg-ink text-paper" },
  { label: "Caja", hint: "Turno y efectivo", area: "finanzas", screen: "caja", icon: Wallet, tone: "bg-teal-soft text-ink" },
] as const;

const MORE = [
  { label: "Clientes", area: "mas", screen: "clientes", icon: Users },
  { label: "Fiados", area: "mas", screen: "fiados", icon: Receipt },
  { label: "Reportes", area: "mas", screen: "reportes", icon: FileBarChart },
  { label: "Etiquetas", area: "mas", screen: "etiquetas", icon: Tags },
] as const;

export function Dashboard() {
  const { business, branchId, go } = useNexo();
  const query = useQuery({
    queryKey: ["dash", business.id, branchId],
    queryFn: () => dashboardFn({ data: { businessId: business.id, branchId } }),
  });
  const data = query.data;
  const currency = business.currency;
  const cards = data
    ? [
        ["Hoy", data.salesToday, "bg-teal-soft"],
        ["Ayer", data.salesYesterday, "bg-surface"],
        ["Semana", data.salesWeek, "bg-clay-soft"],
        ["Mes", data.salesMonth, "bg-surface"],
        ["Ganancia bruta", data.grossMonth, "bg-teal-soft"],
        ["Utilidad neta", data.netMonth, "bg-clay-soft"],
        ["Caja contable", data.cajaCents, "bg-surface"],
        ["Por cobrar", data.arCents, "bg-teal-soft"],
        ["Por pagar", data.apCents, "bg-clay-soft"],
        ["Gastos del mes", data.expensesMonth, "bg-surface"],
      ]
    : [];
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-3xl bg-teal text-on-teal">
        <div className="flex items-start justify-between gap-3 p-5">
          <div>
            <p className="text-sm opacity-80">Ventas de hoy</p>
            <p className="font-display text-4xl tabular-nums">{data ? money(data.salesToday, currency) : "—"}</p>
            <p className="mt-1 text-sm opacity-80">
              {data ? `Ayer ${money(data.salesYesterday, currency)} · semana ${money(data.salesWeek, currency)}` : "Cargando…"}
            </p>
          </div>
          {business.logo ? <img src={business.logo} alt="" className="h-14 w-14 rounded-2xl object-cover" /> : null}
        </div>
        <p className="bg-ink/15 px-5 py-2 text-xs">Guardado en su cuenta. Al entrar otra vez con el mismo Google, el negocio sigue aquí.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {ACTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              className={`min-h-24 rounded-3xl px-4 py-3 text-left ${item.tone}`}
              onClick={() => go(item.area, item.screen)}
            >
              <Icon size={22} />
              <span className="mt-2 block font-semibold">{item.label}</span>
              <span className="block text-xs opacity-80">{item.hint}</span>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {MORE.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.label} type="button" className="card flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-xs font-semibold" onClick={() => go(item.area, item.screen)}>
              <Icon size={18} className="text-teal" />
              {item.label}
            </button>
          );
        })}
      </div>
      {query.isError && <p className="text-clay">No se pudo cargar el panel.</p>}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {cards.map(([label, value, tone]) => (
              <div key={String(label)} className={`rounded-3xl px-3 py-3 ${tone}`}>
                <p className="text-xs text-muted">{label}</p>
                <p className="font-display text-xl tabular-nums">{money(Number(value), currency)}</p>
              </div>
            ))}
          </div>
          <div className="card p-3">
            <p className="mb-2 text-sm font-semibold">Últimos siete días</p>
            {data.series.every((row) => row.totalCents === 0) ? (
              <p className="text-sm text-muted">Aún no hay ventas en esta semana.</p>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.series}>
                    <XAxis dataKey="day" tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip formatter={(value) => money(Number(value), currency)} cursor={{ fill: "var(--teal-soft)" }} />
                    <Bar dataKey="totalCents" fill="var(--teal)" radius={8} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="card space-y-2 p-3">
            <p className="text-sm font-semibold">Alertas</p>
            <p className="text-sm text-muted">
              Agotados {data.outOfStock} · bajos {data.lowStock} · por vencer {data.expiring} · vencidos {data.expired}
              {data.pendingCount > 0 ? ` · pagos por confirmar ${data.pendingCount}` : ""}
            </p>
            {data.pendingCount > 0 && (
              <button type="button" className="min-h-11 text-sm font-semibold text-teal" onClick={() => go("mas", "ventas")}>
                Confirmar pagos electrónicos
              </button>
            )}
            {data.alerts.length === 0 && <p className="text-sm text-muted">No hay avisos con los datos actuales.</p>}
            {data.alerts.map((alert) => (
              <p key={alert.text} className="rounded-xl bg-clay-soft px-3 py-2 text-sm text-ink">
                {alert.text}
              </p>
            ))}
          </div>
          <div className="card p-3">
            <p className="mb-2 text-sm font-semibold">Más vendidos del mes</p>
            {data.top.length === 0 && <p className="text-sm text-muted">Todavía no hay productos vendidos este mes.</p>}
            {data.top.map((row) => (
              <div key={row.name} className="flex items-center justify-between gap-3 border-t border-line py-2 text-sm">
                <span>{row.name}</span>
                <span className="tabular-nums text-muted">
                  {row.qty} · {money(row.totalCents, currency)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

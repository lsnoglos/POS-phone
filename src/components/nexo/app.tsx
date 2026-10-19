import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, LayoutDashboard, Menu, Package, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import type { AppUser } from "@/lib/auth/use-current-user";
import { createBusinessFn, createDemoFn, listBusinessesFn } from "@/lib/nexo/fns";
import { BUSINESS_TYPES } from "@/lib/nexo/money";
import { Dashboard } from "./dashboard";
import { Finance } from "./finance";
import { Inventory } from "./inventory";
import { More } from "./more";
import { Pos } from "./pos";
import { NexoCtx, type Area } from "./context";
import { Button, Field, PhotoPicker, Select, TextInput, BrandTheme, accentFromDataUrl } from "./ui";

const AREAS: { id: Area; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "inicio", label: "Inicio", icon: LayoutDashboard },
  { id: "venta", label: "Ventas", icon: ShoppingCart },
  { id: "inventario", label: "Inventario", icon: Package },
  { id: "finanzas", label: "Finanzas", icon: Landmark },
  { id: "mas", label: "Más", icon: Menu },
];

export function NexoApp({ user }: { user: AppUser }) {
  const qc = useQueryClient();
  const businesses = useQuery({ queryKey: ["businesses"], queryFn: () => listBusinessesFn() });
  const [businessId, setBusinessId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [area, setArea] = useState<Area>("inicio");
  const [screen, setScreen] = useState("menu");
  const displayName = user.displayName || user.primaryEmail || "Propietario";
  useEffect(() => {
    try {
      if (sessionStorage.getItem("nexo-product-draft")) { setArea("inventario"); setScreen("lista"); }
    } catch {
      /* session storage can be blocked */
    }
  }, []);

  useEffect(() => {
    if (!businesses.data?.length) return;
    const stored = localStorage.getItem(`nexo-biz:${user.id}`);
    const found = businesses.data.find((row) => row.id === stored) ?? businesses.data[0];
    setBusinessId((current) => current && businesses.data?.some((row) => row.id === current) ? current : found.id);
  }, [businesses.data, user.id]);

  const business = businesses.data?.find((row) => row.id === businessId) ?? null;
  useEffect(() => {
    if (!business) return;
    const stored = localStorage.getItem(`nexo-branch:${business.id}`);
    const found = business.branches.find((row) => row.id === stored) ?? business.branches[0];
    if (found) setBranchId(found.id);
  }, [business]);

  const value = useMemo(() => {
    if (!business) return null;
    return {
      displayName,
      businesses: businesses.data ?? [],
      business,
      branchId: branchId || business.branches[0]?.id || "",
      setBranch: (id: string) => {
        setBranchId(id);
        localStorage.setItem(`nexo-branch:${business.id}`, id);
      },
      selectBusiness: (id: string) => {
        setBusinessId(id);
        if (id) localStorage.setItem(`nexo-biz:${user.id}`, id);
        setArea("inicio");
      },
      area,
      screen,
      go: (next: Area, nextScreen = "menu") => {
        setArea(next);
        setScreen(next === "inventario" && nextScreen === "menu" ? "lista" : nextScreen || "menu");
      },
    };
  }, [business, businesses.data, branchId, displayName, area, screen, user.id]);

  if (businesses.isLoading) return <p className="p-6 text-muted">Cargando sus negocios…</p>;
  if (businesses.isError) return <p className="p-6 text-clay">No se pudieron leer los negocios. Intente de nuevo.</p>;
  if (!business || !value) {
    return <Onboarding displayName={displayName} onCreated={() => void qc.invalidateQueries()} />;
  }

  return (
    <NexoCtx.Provider value={value}>
      <BrandTheme accent={business.accentColor} enabled={business.useLogoColors} />
      <div className="min-h-dvh lg:pl-60">
        <aside className="nav-pad fixed inset-y-0 left-0 z-30 hidden w-60 flex-col gap-1 border-r border-line bg-surface p-3 lg:flex">
          <div className="flex items-center gap-2 px-2">
            {business.logo ? (
              <img src={business.logo} alt="" className="h-9 w-9 rounded-lg object-cover" />
            ) : null}
            <p className="font-display text-2xl">NEXO</p>
          </div>
          {AREAS.map((item) => (
            <button key={item.id} type="button" className={`min-h-11 rounded-xl px-3 text-left ${area === item.id ? "bg-teal text-on-teal" : ""}`} onClick={() => value.go(item.id)}>
              {item.label}
            </button>
          ))}
        </aside>
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 bg-paper/90 px-4 py-3 backdrop-blur">
          <div className="flex min-w-0 items-center gap-2">
            {business.logo ? (
              <img src={business.logo} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
            ) : (
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal text-sm font-semibold text-on-teal">
                {business.name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{business.name}</p>
              {business.branches.length > 1 && (
                <select className="max-w-full bg-transparent text-xs text-muted" value={value.branchId} onChange={(event) => value.setBranch(event.target.value)}>
                  {business.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
              )}
            </div>
          </div>
          {businesses.data && businesses.data.length > 1 && (
            <select className="max-w-40 rounded-xl bg-surface px-2 py-1 text-sm" value={business.id} onChange={(event) => value.selectBusiness(event.target.value)}>
              {businesses.data.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          )}
        </header>
        {business.isDemo && (
          <p className="mx-4 rounded-xl bg-clay-soft px-3 py-2 text-sm">
            Negocio de demostración. Las ventas y los saldos son de ejemplo y puede borrarlo en Configuración.
          </p>
        )}
        <main className="page-pad px-4 py-3 lg:pb-8">
          {area === "inicio" && <Dashboard />}
          {area === "venta" && <Pos key={`${business.id}:${value.branchId}`} />}
          {area === "inventario" && <Inventory />}
          {area === "finanzas" && <Finance />}
          {area === "mas" && <More />}
        </main>
        <nav className="nav-pad fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface lg:hidden">
          {AREAS.map((item) => {
            const Icon = item.icon;
            const active = area === item.id;
            return (
              <button key={item.id} type="button" className={`flex min-h-14 flex-col items-center justify-center text-xs ${active ? "text-teal" : "text-muted"}`} onClick={() => value.go(item.id)}>
                <Icon size={20} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </NexoCtx.Provider>
  );
}

function Onboarding({ displayName, onCreated }: { displayName: string; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("pulperia");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [useColors, setUseColors] = useState(false);
  const [accent, setAccent] = useState("");
  const [busy, setBusy] = useState(false);

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
    <main className="mx-auto max-w-lg space-y-4 px-4 py-8">
      <BrandTheme accent={accent} enabled={useColors && Boolean(accent)} />
      <p className="font-display text-4xl">Cree su negocio</p>
      <p className="text-sm text-pretty text-muted">Empieza vacío. Si quiere ver el flujo con datos marcados, cargue la pulpería de demostración.</p>
      <Field label="Nombre comercial"><TextInput value={name} onChange={(event) => setName(event.target.value)} /></Field>
      <Field label="Tipo">
        <Select value={type} onChange={(event) => setType(event.target.value)}>
          {BUSINESS_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </Select>
      </Field>
      <Field label="Dirección"><TextInput value={address} onChange={(event) => setAddress(event.target.value)} /></Field>
      <Field label="Teléfono"><TextInput value={phone} onChange={(event) => setPhone(event.target.value)} /></Field>
      <div>
        <p className="mb-1 text-sm text-muted">Logotipo, opcional</p>
        <PhotoPicker value={logo} onChange={setLogo} />
      </div>
      <label className="flex min-h-11 items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={useColors} onChange={(event) => setUseColors(event.target.checked)} />
        <span>
          Usar los colores del logotipo
          <span className="mt-1 block text-muted">Si no lo marca, la aplicación se queda en modo claro y modo oscuro.</span>
        </span>
      </label>
      {useColors && accent && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <span className="inline-block h-6 w-6 rounded-full" style={{ background: accent }} />
          Los botones tomarán este color. El claro y el oscuro siguen disponibles.
        </p>
      )}
      {useColors && logo && !accent && <p className="text-sm text-muted">No se distinguió un color en el logotipo. Se mantiene el tema claro y oscuro.</p>}
      <Button type="button" disabled={busy} onClick={() => {
        setBusy(true);
        void createBusinessFn({
          data: {
            name, address, phone, taxId: "", businessType: type, currency: "NIO", timezone: "America/Managua", displayName,
            logo, useLogoColors: Boolean(useColors && accent), accentColor: accent,
          },
        }).then((result) => {
          setBusy(false);
          if (!result.ok) toast.error(result.error);
          else onCreated();
        });
      }}>
        Crear negocio
      </Button>
      <Button type="button" tone="ghost" disabled={busy} onClick={() => {
        setBusy(true);
        void createDemoFn({ data: { displayName } }).then((result) => {
          setBusy(false);
          if (!result.ok) toast.error(result.error);
          else {
            toast.success("Demostración lista");
            onCreated();
          }
        });
      }}>
        Cargar pulpería de demostración
      </Button>
    </main>
  );
}

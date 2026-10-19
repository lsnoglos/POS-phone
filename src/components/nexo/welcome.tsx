import { GROK_PROVIDERS, signIn } from "@/lib/auth/client";

export function Splash() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="text-center">
        <p className="font-display text-5xl">NEXO</p>
        <p className="mt-2 text-sm tracking-widest text-teal">POS</p>
        <p className="mt-4 text-muted">Preparando el mostrador…</p>
      </div>
    </main>
  );
}

export function Welcome() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-between px-6 py-10">
      <div>
        <p className="text-sm font-semibold tracking-widest text-teal">NEXO POS</p>
        <h1 className="font-display mt-3 text-5xl leading-none">El mostrador en el teléfono.</h1>
        <p className="mt-4 text-pretty text-muted">
          Registre productos, imprima el QR del estante y cobre sin perder el inventario ni el asiento contable.
        </p>
        <div className="card mt-6 space-y-2 p-4 text-sm">
          <p className="text-xs uppercase tracking-wide text-muted">Ejemplo visual, no es una venta</p>
          <div className="flex justify-between"><span>Arroz 2 lb</span><span className="tabular-nums">C$34.00</span></div>
          <div className="flex justify-between font-semibold"><span>Total</span><span className="tabular-nums">C$34.00</span></div>
        </div>
      </div>
      <div className="mt-8 space-y-3">
        {GROK_PROVIDERS.filter((provider) => provider.idp === "google").map((provider) => (
          <button
            key={provider.providerId}
            type="button"
            className="min-h-12 w-full rounded-2xl bg-ink px-4 font-semibold text-paper"
            onClick={() => void signIn(provider.providerId, { callbackURL: "/" })}
          >
            Continuar con Google
          </button>
        ))}
        <p className="text-center text-xs text-muted">Nicaragua · Córdoba · Español</p>
      </div>
    </main>
  );
}

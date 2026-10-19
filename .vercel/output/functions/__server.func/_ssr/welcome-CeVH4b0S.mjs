import { i as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { r as signIn } from "./client-1vAx-gM_.mjs";
import { t as GROK_PROVIDERS } from "./server-Cmv9tx2Y.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/welcome-CeVH4b0S.js
var import_jsx_runtime = require_jsx_runtime();
function Splash() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "grid min-h-dvh place-items-center px-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display text-5xl",
					children: "NEXO"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm tracking-widest text-teal",
					children: "POS"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-4 text-muted",
					children: "Preparando el mostrador…"
				})
			]
		})
	});
}
function Welcome() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto flex min-h-dvh max-w-lg flex-col justify-between px-6 py-10",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm font-semibold tracking-widest text-teal",
				children: "NEXO POS"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display mt-3 text-5xl leading-none",
				children: "El mostrador en el teléfono."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-pretty text-muted",
				children: "Registre productos, imprima el QR del estante y cobre sin perder el inventario ni el asiento contable."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "card mt-6 space-y-2 p-4 text-sm",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs uppercase tracking-wide text-muted",
						children: "Ejemplo visual, no es una venta"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Arroz 2 lb" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "tabular-nums",
							children: "C$34.00"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex justify-between font-semibold",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Total" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "tabular-nums",
							children: "C$34.00"
						})]
					})
				]
			})
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-8 space-y-3",
			children: [GROK_PROVIDERS.map((provider) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "min-h-12 w-full rounded-2xl bg-ink px-4 font-semibold text-paper",
				onClick: () => void signIn(provider.providerId, { callbackURL: "/" }),
				children: ["Continuar con ", provider.label === "X" ? "X" : "Google"]
			}, provider.providerId)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-center text-xs text-muted",
				children: "Nicaragua · Córdoba · Español"
			})]
		})]
	});
}
//#endregion
export { Welcome as n, Splash as t };

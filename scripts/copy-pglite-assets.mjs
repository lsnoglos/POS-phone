import { copyFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const libs = join(root, ".vercel/output/functions/__server.func/_libs");
const src = join(root, "node_modules/@electric-sql/pglite/dist");
if (!existsSync(libs)) {
  console.log("[pglite] no server bundle yet");
  process.exit(0);
}
const bundled = readdirSync(libs).some((name) => name.includes("pglite") && name.endsWith(".mjs"));
if (!bundled) {
  console.log("[pglite] bundle does not include pglite");
  process.exit(0);
}
for (const name of ["pglite.data", "pglite.wasm", "initdb.wasm"]) {
  copyFileSync(join(src, name), join(libs, name));
}
console.log("[pglite] copied wasm assets next to the server bundle");

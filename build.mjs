// Kopieert alleen de bestanden die de website nodig heeft naar dist/.
// Geen framework, geen bundler: index.html + support.js + images/ worden 1-op-1 overgenomen.
import { cpSync, mkdirSync, rmSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist");
for (const entry of ["index.html", "support.js", "images"]) {
  cpSync(entry, `dist/${entry}`, { recursive: true });
}
console.log("dist/ klaar");

// Lokale ontwikkelserver: bouwt de site, serveert dist/ en bouwt opnieuw
// zodra er iets in src/ of images/ verandert. Ververs de pagina in de browser
// om de wijziging te zien.
//
//   npm run dev        -> http://localhost:5173
//   npm run dev -- 8080 (andere poort)
//
// Deze server is alleen voor lokaal bekijken. Hij deployt niets.

import { createServer } from "node:http";
import { existsSync, readFileSync, statSync, watch } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const POORT = Number(process.argv[2]) || 5173;
const UIT = resolve("dist");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
};

function bouw() {
  try {
    execFileSync(process.execPath, ["build.mjs"], { stdio: "inherit" });
    return true;
  } catch {
    console.error("Bouwen mislukt — de vorige versie blijft staan.");
    return false;
  }
}

bouw();

// Meerdere schrijfacties vlak na elkaar (een editor die opslaat) samenvoegen.
let wachtend = null;
function planBouw(pad) {
  clearTimeout(wachtend);
  wachtend = setTimeout(() => {
    console.log(`\nwijziging: ${pad} — opnieuw bouwen`);
    bouw();
  }, 120);
}

for (const map of ["src", "images"]) {
  watch(map, { recursive: true }, (_, bestand) => planBouw(join(map, bestand ?? "")));
}

createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pad = decodeURIComponent(url.pathname);
  if (pad.endsWith("/")) pad += "index.html";

  // Buiten dist/ mag niets geserveerd worden.
  const bestand = join(UIT, normalize(pad).replace(/^([/\\])+/, ""));
  if (!bestand.startsWith(UIT)) {
    res.writeHead(403).end("Verboden");
    return;
  }

  // /contact werkt net als /contact.html, zoals op Cloudflare Pages.
  const doel = existsSync(bestand) && statSync(bestand).isFile()
    ? bestand
    : existsSync(`${bestand}.html`)
      ? `${bestand}.html`
      : null;

  if (!doel) {
    const nietGevonden = join(UIT, "404.html");
    res.writeHead(404, { "Content-Type": TYPES[".html"] });
    res.end(existsSync(nietGevonden) ? readFileSync(nietGevonden) : "Niet gevonden");
    return;
  }

  res.writeHead(200, {
    "Content-Type": TYPES[extname(doel).toLowerCase()] ?? "application/octet-stream",
    "Cache-Control": "no-store",
  });
  res.end(readFileSync(doel));
}).listen(POORT, () => {
  console.log(`\nCafé Tijdloos draait op http://localhost:${POORT}`);
  console.log("Wijzig iets in src/ en ververs de pagina. Stoppen: Ctrl+C.\n");
});

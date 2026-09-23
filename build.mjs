// Bouwt de site: src/pages/*.html + src/layout.html -> dist/
//
// Elke pagina in src/pages/ bestaat uit een kopje met metagegevens, dan `---`,
// dan twee blokken: <!--desktop--> en <!--mobile-->. Dat zijn de twee ontwerpen
// uit de design-export. De layout eromheen (head, menu, footer) staat één keer
// in src/layout.html, zodat het menu op zes pagina's niet uit elkaar kan lopen.
//
// Geen bundler, geen afhankelijkheden: de uitvoer is gewone statische HTML.

import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SRC = "src";
const UIT = "dist";

function leesPagina(bestand) {
  const ruw = readFileSync(join(SRC, "pages", bestand), "utf8");
  const scheiding = ruw.indexOf("\n---\n");
  if (scheiding === -1) {
    throw new Error(`${bestand}: geen "---" gevonden tussen metagegevens en inhoud`);
  }

  const meta = {};
  for (const regel of ruw.slice(0, scheiding).split("\n")) {
    if (!regel.trim()) continue;
    const dubbelepunt = regel.indexOf(":");
    if (dubbelepunt === -1) throw new Error(`${bestand}: regel zonder ":" in de metagegevens: ${regel}`);
    meta[regel.slice(0, dubbelepunt).trim()] = regel.slice(dubbelepunt + 1).trim();
  }

  const inhoud = ruw.slice(scheiding + 5);
  const start = inhoud.indexOf("<!--desktop-->");
  const grens = inhoud.indexOf("<!--mobile-->");
  if (start === -1 || grens === -1) {
    throw new Error(`${bestand}: <!--desktop--> en/of <!--mobile--> ontbreekt`);
  }

  return {
    meta,
    desktop: inhoud.slice(start + "<!--desktop-->".length, grens).replace(/^\n|\n$/g, ""),
    mobile: inhoud.slice(grens + "<!--mobile-->".length).replace(/^\n|\n$/g, ""),
  };
}

// Voor gebruik binnen een attribuut: alleen aanhalingstekens zijn hier gevaarlijk,
// & en < staan al als entiteit in de bron.
const attr = (tekst) => tekst.replace(/"/g, "&quot;");

function bouwPagina(layout, pagina) {
  const { meta, desktop, mobile } = pagina;
  for (const sleutel of ["title", "description", "nav"]) {
    if (!meta[sleutel]) throw new Error(`pagina mist "${sleutel}" in de metagegevens`);
  }

  let html = layout
    .replaceAll("{{title}}", attr(meta.title))
    .replaceAll("{{description}}", attr(meta.description))
    .replace("{{head_extra}}", meta.noindex ? '<meta name="robots" content="noindex" />' : "")
    .replace("{{desktop}}", desktop)
    .replace("{{mobile}}", mobile);

  // De actieve pagina markeren in het menu (kopmenu, mobiel menu en footer).
  if (meta.nav !== "geen") {
    html = html.replaceAll(`data-nav="${meta.nav}"`, `data-nav="${meta.nav}" aria-current="page"`);
  }

  // {{title}} staat ook in <title>, waar &quot; niet hoort.
  html = html.replace(/<title>(.*?)<\/title>/s, (_, t) => `<title>${t.replaceAll("&quot;", '"')}</title>`);

  return html;
}

rmSync(UIT, { recursive: true, force: true });
mkdirSync(UIT, { recursive: true });

const layout = readFileSync(join(SRC, "layout.html"), "utf8");
const paginas = readdirSync(join(SRC, "pages")).filter((n) => n.endsWith(".html"));

for (const bestand of paginas) {
  writeFileSync(join(UIT, bestand), bouwPagina(layout, leesPagina(bestand)));
}

for (const bestand of readdirSync(join(SRC, "assets"))) {
  cpSync(join(SRC, "assets", bestand), join(UIT, bestand));
}
cpSync("images", join(UIT, "images"), { recursive: true });

console.log(`dist/ klaar — ${paginas.length} pagina's: ${paginas.join(", ")}`);

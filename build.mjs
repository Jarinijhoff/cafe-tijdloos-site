// Bouwt de site: src/pages/*.html + src/layout.html -> dist/
//
// Elke pagina in src/pages/ bestaat uit een kopje met metagegevens, dan `---`,
// dan twee blokken: <!--desktop--> en <!--mobile-->. Dat zijn de twee ontwerpen
// uit de design-export. De layout eromheen (head, menu, footer) staat één keer
// in src/layout.html, zodat het menu op zes pagina's niet uit elkaar kan lopen.
//
// Instellingen die per omgeving verschillen (domein, wel/niet indexeren,
// formulier) staan in src/site.json.
//
// De uitvoer is gewone statische HTML. De enige afhankelijkheid is sharp, voor
// het omzetten van de afbeeldingen naar WebP.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { extname, join, parse } from "node:path";
import sharp from "sharp";

const SRC = "src";
const UIT = "dist";
const CACHE = ".cache/images";

const site = JSON.parse(readFileSync(join(SRC, "site.json"), "utf8"));

// Op GitHub Pages staat de site in een submap (/cafe-tijdloos-site/). De
// workflow geeft die mee; lokaal en op een eigen domein is het "/".
const BASIS = process.env.BASIS || "/";

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
    bestand,
    meta,
    desktop: inhoud.slice(start + "<!--desktop-->".length, grens).replace(/^\n|\n$/g, ""),
    mobile: inhoud.slice(grens + "<!--mobile-->".length).replace(/^\n|\n$/g, ""),
  };
}

// Voor gebruik binnen een attribuut: alleen aanhalingstekens zijn hier gevaarlijk,
// & en < staan al als entiteit in de bron.
const attr = (tekst) => tekst.replace(/"/g, "&quot;");

function headExtra(pagina) {
  const regels = [];
  if (!site.indexeren || pagina.meta.noindex) {
    regels.push('<meta name="robots" content="noindex, nofollow" />');
  }
  // De 404-pagina wordt op elk onbekend adres getoond, ook op /a/b/c. Relatieve
  // paden zouden dan naar /a/b/images/... wijzen; <base> zet ze terug op de root.
  if (pagina.bestand === "404.html") {
    regels.push(`<base href="${BASIS}" />`);
  }
  if (pagina.meta.preload) {
    regels.push(`<link rel="preload" as="image" href="${pagina.meta.preload}" fetchpriority="high" />`);
  }
  return regels.join("\n");
}

function bouwPagina(layout, pagina) {
  const { meta, desktop, mobile } = pagina;
  for (const sleutel of ["title", "description", "nav"]) {
    if (!meta[sleutel]) throw new Error(`${pagina.bestand}: mist "${sleutel}" in de metagegevens`);
  }

  let html = layout
    .replaceAll("{{title}}", attr(meta.title))
    .replaceAll("{{description}}", attr(meta.description))
    .replace("{{head_extra}}", headExtra(pagina))
    .replace("{{desktop}}", desktop)
    .replace("{{mobile}}", mobile)
    .replaceAll("{{jaar}}", String(new Date().getFullYear()))
    .replaceAll("{{web3forms_key}}", attr(site.web3formsKey || ""));

  // De actieve pagina markeren in het menu (kopmenu, mobiel menu en footer).
  if (meta.nav !== "geen") {
    html = html.replaceAll(`data-nav="${meta.nav}"`, `data-nav="${meta.nav}" aria-current="page"`);
  }

  // {{title}} staat ook in <title>, waar &quot; niet hoort.
  html = html.replace(/<title>(.*?)<\/title>/s, (_, t) => `<title>${t.replaceAll("&quot;", '"')}</title>`);

  const over = html.match(/\{\{\w+\}\}/);
  if (over) throw new Error(`${pagina.bestand}: onbekende plaatshouder ${over[0]}`);

  return naarWebp(html);
}

/* ------------------------------------------------------------------
   Afbeeldingen
   In images/ staan de originelen (PNG/JPG). De build zet ze om naar WebP,
   veel kleiner bij gelijk beeld, en past de verwijzingen in de HTML aan.
   Wil je een foto vervangen: zet het nieuwe bestand met dezelfde naam in
   images/ en bouw opnieuw.
   ------------------------------------------------------------------ */
const RASTER = new Set([".png", ".jpg", ".jpeg"]);
const MAX_BREEDTE = 1600;
// Het logo staat hooguit 56px hoog in beeld; 3x voor scherpe schermen.
const LOGO_HOOGTE = 168;

const naarWebp = (tekst) =>
  tekst.replace(/images\/([\w-]+)\.(png|jpe?g)\b/g, "images/$1.webp");

async function zetAfbeeldingOm(bron, doel, naam) {
  // Alleen opnieuw omzetten als het origineel veranderd is: dev.mjs bouwt bij
  // elke wijziging en sharp kost dan onnodig tijd.
  const { mtimeMs, size } = statSync(bron);
  const sleutel = `${naam}-${size}-${Math.round(mtimeMs)}.webp`;
  const cache = join(CACHE, sleutel);
  if (!existsSync(cache)) {
    let beeld = sharp(bron);
    beeld = naam === "logo"
      ? beeld.resize({ height: LOGO_HOOGTE })
      : beeld.resize({ width: MAX_BREEDTE, withoutEnlargement: true });
    await beeld.webp({ quality: 82, effort: 5 }).toFile(cache);
  }
  cpSync(cache, doel);
}

// Favicon en app-icoon: de klok uit het logo met het woord "Café" eronder (in
// het logo staat daar "loos"). Beide stukken komen rechtstreeks uit logo.png.
async function maakIconen(logo) {
  const cafe = await sharp(logo).extract({ left: 30, top: 80, width: 960, height: 372 }).toBuffer();
  const klok = await sharp(logo).extract({ left: 1005, top: 0, width: 720, height: 520 }).toBuffer();

  async function icoon(maat, doel) {
    const woord = await sharp(cafe).resize({ width: Math.round(maat * 0.94) }).toBuffer();
    const woordMaat = await sharp(woord).metadata();
    const wijzer = await sharp(klok)
      .resize({ width: Math.round(maat * 0.96), height: Math.round(maat * 0.74), fit: "inside" })
      .toBuffer();
    const wijzerMaat = await sharp(wijzer).metadata();
    await sharp({ create: { width: maat, height: maat, channels: 4, background: "#1E1409" } })
      .composite([
        { input: wijzer, left: Math.round((maat - wijzerMaat.width) / 2), top: Math.round(maat * 0.03) },
        { input: woord, left: Math.round((maat - woordMaat.width) / 2), top: maat - woordMaat.height - Math.round(maat * 0.06) },
      ])
      .png({ compressionLevel: 9, palette: true })
      .toFile(join(UIT, doel));
  }
  await icoon(32, "favicon-32.png");
  await icoon(180, "apple-touch-icon.png");
  await icoon(512, "icon-512.png");
}

async function bouwAfbeeldingen() {
  const maten = new Map();
  mkdirSync(CACHE, { recursive: true });
  mkdirSync(join(UIT, "images"), { recursive: true });
  for (const bestand of readdirSync("images")) {
    const { name, ext } = parse(bestand);
    const bron = join("images", bestand);
    if (RASTER.has(ext.toLowerCase())) {
      const doel = join(UIT, "images", `${name}.webp`);
      await zetAfbeeldingOm(bron, doel, name);
      const { width, height } = await sharp(doel).metadata();
      maten.set(`images/${name}.webp`, { width, height });
    } else if (!bestand.startsWith(".")) {
      cpSync(bron, join(UIT, "images", bestand));
    }
  }
  await maakIconen(join("images", "logo.png"));
  return maten;
}

// width/height op elke <img>, zodat de browser de ruimte vooraf kent en de
// pagina niet verspringt tijdens het laden. De inline-stijl bepaalt nog steeds
// de weergavemaat; deze attributen geven alleen de verhouding door.
function metMaten(html, maten) {
  return html.replace(/<img\b[^>]*>/g, (tag) => {
    if (/\swidth=/.test(tag)) return tag;
    const src = tag.match(/\ssrc="([^"]+)"/)?.[1];
    const maat = maten.get(src);
    if (!maat) return tag;
    return tag.replace("<img", `<img width="${maat.width}" height="${maat.height}"`);
  });
}

/* ------------------------------------------------------------------
   Bestanden voor de hosting
   ------------------------------------------------------------------ */

// Cloudflare Pages leest _headers. GitHub Pages negeert het; daar staan de
// belangrijkste regels als <meta> in de layout.
function headers() {
  const regels = [
    "/*",
    "  X-Content-Type-Options: nosniff",
    "  X-Frame-Options: DENY",
    "  Referrer-Policy: strict-origin-when-cross-origin",
    "  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "  Strict-Transport-Security: max-age=31536000",
    "  Content-Security-Policy: " + CSP + "; frame-ancestors 'none'",
  ];
  if (!site.indexeren) regels.push("  X-Robots-Tag: noindex, nofollow");
  regels.push(
    "",
    "/fonts/*",
    "  Cache-Control: public, max-age=31536000, immutable",
    "",
    "/images/*",
    "  Cache-Control: public, max-age=604800",
    "",
  );
  return regels.join("\n");
}

// Zolang de site niet geïndexeerd mag worden, staat dat in elke pagina
// (noindex). robots.txt sluit dan bewust níets uit: een zoekmachine die een
// pagina niet mag ophalen, ziet ook de noindex niet.
function robots() {
  const regels = ["User-agent: *", "Allow: /"];
  if (site.indexeren && site.url) regels.push("", `Sitemap: ${site.url.replace(/\/$/, "")}/sitemap.xml`);
  return regels.join("\n") + "\n";
}

const CSP = [
  "default-src 'self'",
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "script-src 'self'",
  "connect-src 'self' https://api.web3forms.com",
  "form-action 'self' https://api.web3forms.com",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

/* ------------------------------------------------------------------ */

rmSync(UIT, { recursive: true, force: true });
mkdirSync(UIT, { recursive: true });

const maten = await bouwAfbeeldingen();

for (const bestand of readdirSync(join(SRC, "assets"))) {
  if (extname(bestand) !== ".css") cpSync(join(SRC, "assets", bestand), join(UIT, bestand), { recursive: true });
}

// De stylesheets (samen zo'n 13 kB) komen inline in de <head>: dan hoeft de
// browser niet eerst op een los bestand te wachten voordat hij iets tekent.
const css = ["fonts.css", "styles.css"]
  .map((naam) => naarWebp(readFileSync(join(SRC, "assets", naam), "utf8")))
  .join("\n");
const layout = readFileSync(join(SRC, "layout.html"), "utf8")
  .replace("{{csp}}", CSP)
  .replace('<link rel="stylesheet" href="fonts.css" />\n<link rel="stylesheet" href="styles.css" />', () => `<style>\n${css}</style>`);
if (layout.includes('href="styles.css"')) throw new Error("layout.html: stylesheet-links niet gevonden om inline te zetten");

const paginas = readdirSync(join(SRC, "pages")).filter((n) => n.endsWith(".html"));
for (const bestand of paginas) {
  writeFileSync(join(UIT, bestand), metMaten(bouwPagina(layout, leesPagina(bestand)), maten));
}

writeFileSync(join(UIT, "_headers"), headers());
writeFileSync(join(UIT, "robots.txt"), robots());

console.log(`dist/ klaar — ${paginas.length} pagina's: ${paginas.join(", ")}${site.indexeren ? "" : " (noindex)"}`);

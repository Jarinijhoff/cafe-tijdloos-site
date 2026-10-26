// Bouwt de site: src/pages/*.html + src/layout.html -> dist/
//
// Elke pagina in src/pages/ bestaat uit een kopje met metagegevens, dan `---`,
// dan twee blokken: <!--desktop--> en <!--mobile-->. Dat zijn de twee ontwerpen
// uit de design-export. De layout eromheen (head, menu, footer) staat één keer
// in src/layout.html, zodat het menu op zes pagina's niet uit elkaar kan lopen.
// Lange tekst die in beide ontwerpen hetzelfde is (privacyverklaring e.d.) kan
// één keer in een <!--tekst-->-blok vóór <!--desktop--> staan; {{tekst}} zet
// hem dan op beide plekken neer.
//
// Instellingen die per omgeving verschillen (domein, wel/niet indexeren,
// formulier) staan in src/site.json. Bedrijfsgegevens, openingstijden en de
// kaart staan in src/data/; zie lib/inhoud.mjs voor hoe die in de pagina's komen.
//
// De uitvoer is gewone statische HTML. De enige afhankelijkheid is sharp, voor
// het omzetten van de afbeeldingen naar WebP.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { extname, join, parse } from "node:path";
import sharp from "sharp";
import { badgeData, leesInhoud, vulIn } from "./lib/inhoud.mjs";
import { manifest, OG_BEELD, schoneLinks, seoHead, sitemap } from "./lib/seo.mjs";
import { KLOK_DEFS, klokLogo } from "./lib/klok.mjs";

const SRC = "src";
const UIT = process.env.UIT || "dist";
const CACHE = ".cache/images";

const site = JSON.parse(readFileSync(join(SRC, "site.json"), "utf8"));
// Testen kan met een ander domein of andere inhoud zonder de bronbestanden te wijzigen.
if (process.env.SITE_URL) site.url = process.env.SITE_URL;
if (process.env.INDEXEREN) site.indexeren = process.env.INDEXEREN === "1";
const inhoud = leesInhoud(process.env.INHOUD || SRC, site);

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

  const tekstStart = inhoud.indexOf("<!--tekst-->");
  const tekst = tekstStart === -1 ? "" : inhoud.slice(tekstStart + "<!--tekst-->".length, start).trim();
  const metTekst = (blok) => blok.replace(/^\n|\n$/g, "").replace("{{tekst}}", () => tekst);

  return {
    bestand,
    meta,
    desktop: metTekst(inhoud.slice(start + "<!--desktop-->".length, grens)),
    mobile: metTekst(inhoud.slice(grens + "<!--mobile-->".length)),
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
  regels.push(seoHead(pagina, inhoud));
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
    .replaceAll("{{web3forms_key}}", attr(site.web3formsKey || ""))
    .replaceAll("data-badge", "data-badge" + badgeData(inhoud));

  // De actieve pagina markeren in het menu (kopmenu, mobiel menu en footer).
  if (meta.nav !== "geen") {
    html = html.replaceAll(`data-nav="${meta.nav}"`, `data-nav="${meta.nav}" aria-current="page"`);
  }

  // {{title}} staat ook in <title>, waar &quot; niet hoort.
  html = html.replace(/<title>(.*?)<\/title>/s, (_, t) => `<title>${t.replaceAll("&quot;", '"')}</title>`);

  html = vulIn(html, inhoud, pagina.bestand);

  // Ontbrekende gegevens staan zichtbaar als [[AANLEVEREN: ...]] in de pagina.
  // Dat mag op de preview, maar niet op een site die Google mag indexeren.
  if (site.indexeren && html.includes("[[AANLEVEREN")) {
    const wat = [...new Set(html.match(/\[\[AANLEVEREN: [^\]]+\]\]/g))].join(", ");
    throw new Error(`${pagina.bestand}: nog niet aangeleverd: ${wat}. Vul src/data/ aan voordat "indexeren" aan gaat.`);
  }

  return schoneLinks(naarWebp(html));
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
const KLEIN_BREEDTE = 800;
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
    // rotate(): telefoonfoto's staan soms alleen via EXIF rechtop, en WebP neemt die niet mee.
    let beeld = sharp(bron).rotate();
    beeld = naam.startsWith("logo")
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
  // foto.jpg en foto.png worden allebei foto.webp: dan overschrijft de een de ander.
  const namen = readdirSync("images").filter((b) => RASTER.has(extname(b).toLowerCase())).map((b) => parse(b).name);
  const dubbel = namen.filter((n, i) => namen.indexOf(n) !== i);
  if (dubbel.length) throw new Error(`images/: dezelfde naam met een andere extensie: ${dubbel.join(", ")}`);
  for (const bestand of readdirSync("images")) {
    const { name, ext } = parse(bestand);
    const bron = join("images", bestand);
    if (RASTER.has(ext.toLowerCase())) {
      const doel = join(UIT, "images", `${name}.webp`);
      await zetAfbeeldingOm(bron, doel, name);
      const { width, height } = await sharp(doel).metadata();
      // Telefoons hebben genoeg aan een kleinere versie; die kiezen ze zelf via srcset.
      let klein = null;
      if (width > KLEIN_BREEDTE * 1.15 && !name.startsWith("logo")) {
        klein = `images/${name}-${KLEIN_BREEDTE}.webp`;
        const cache = join(CACHE, `${name}-${KLEIN_BREEDTE}-${statSync(bron).size}-${Math.round(statSync(bron).mtimeMs)}.webp`);
        if (!existsSync(cache)) {
          await sharp(bron).rotate().resize({ width: KLEIN_BREEDTE }).webp({ quality: 78, effort: 5 }).toFile(cache);
        }
        cpSync(cache, join(UIT, klein));
      }
      maten.set(`images/${name}.webp`, { width, height, klein });
    } else if (!bestand.startsWith(".")) {
      cpSync(bron, join(UIT, "images", bestand));
    }
  }
  await maakIconen(join("images", "logo.png"));
  // Deelafbeelding voor WhatsApp, Facebook e.d. (1200x630, JPG wordt overal ondersteund).
  await sharp(join("images", "rick-tap-wide.jpg"))
    .resize({ width: OG_BEELD.breedte, height: OG_BEELD.hoogte, fit: "cover", position: "attention" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(join(UIT, OG_BEELD.pad));
  return maten;
}

// width/height op elke <img>, zodat de browser de ruimte vooraf kent en de
// pagina niet verspringt tijdens het laden. De inline-stijl bepaalt nog steeds
// de weergavemaat; deze attributen geven alleen de verhouding door.
function metMaten(html, maten) {
  // De voorlaad-hint moet dezelfde keuze maken als de <img>, anders laadt een
  // telefoon de grote foto voor niets.
  html = html.replace(/<link rel="preload" as="image" href="([^"]+)"/g, (tag, src) => {
    const maat = maten.get(src);
    return maat?.klein ? `${tag} imagesrcset="${maat.klein} ${KLEIN_BREEDTE}w, ${src} ${maat.width}w" imagesizes="100vw"` : tag;
  });
  return html.replace(/<img\b[^>]*>/g, (tag) => {
    if (/\swidth=/.test(tag)) return tag;
    const src = tag.match(/\ssrc="([^"]+)"/)?.[1];
    const maat = maten.get(src);
    if (!maat) return tag;
    // Foto's in een .fotorij worden even hoog en vullen samen de breedte, zonder
    // bijsnijden: elke foto krijgt een aandeel naar zijn eigen verhouding.
    if (/\sdata-rij\b/.test(tag)) {
      const r = maat.width / maat.height;
      tag = tag.replace(/\sdata-rij\b/, "").replace(/\sstyle="/, ` style="flex:${r.toFixed(4)} 1 0;aspect-ratio:${maat.width}/${maat.height};`);
      if (!/\sstyle="/.test(tag)) tag = tag.replace("<img", `<img style="flex:${r.toFixed(4)} 1 0;aspect-ratio:${maat.width}/${maat.height}"`);
    }
    const srcset = maat.klein && !/\ssrcset=/.test(tag) ? ` srcset="${maat.klein} ${KLEIN_BREEDTE}w, ${src} ${maat.width}w" sizes="100vw"` : "";
    return tag.replace("<img", `<img width="${maat.width}" height="${maat.height}"${srcset}`);
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
// Elk logo krijgt een klok met wijzers die de echte tijd aanwijzen (lib/klok.mjs).
const layoutMetKlok = layout
  .replace(/<img src="images\/logo\.png" alt="Café Tijdloos" style="([^"]*)" \/>/g, (_, stijl) => klokLogo(stijl))
  .replace("<body>", () => `<body>\n${KLOK_DEFS}`);
if (layoutMetKlok === layout) throw new Error("layout.html: geen logo gevonden voor de klok");
if (layout.includes('href="styles.css"')) throw new Error("layout.html: stylesheet-links niet gevonden om inline te zetten");

// Een pagina met "alleen-met: kaart" bestaat alleen als die inhoud er is.
const paginas = [];
for (const bestand of readdirSync(join(SRC, "pages")).filter((n) => n.endsWith(".html"))) {
  const pagina = leesPagina(bestand);
  if (pagina.meta["alleen-met"] && !inhoud[pagina.meta["alleen-met"]]) continue;
  writeFileSync(join(UIT, bestand), metMaten(bouwPagina(layoutMetKlok, pagina), maten));
  paginas.push(bestand);
}

const sitemapXml = sitemap(paginas.filter((p) => p !== "404.html"), site);
if (sitemapXml) writeFileSync(join(UIT, "sitemap.xml"), sitemapXml);
writeFileSync(join(UIT, "site.webmanifest"), manifest(inhoud.bedrijf));

writeFileSync(join(UIT, "_headers"), headers());
writeFileSync(join(UIT, "robots.txt"), robots());

console.log(`${UIT}/ klaar: ${paginas.length} pagina's (${paginas.join(", ")})${site.indexeren ? "" : ", noindex"}`);

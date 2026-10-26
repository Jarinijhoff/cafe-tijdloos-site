// Controleert de gebouwde site in een echte browser (Playwright/Chromium).
//
//   npm run dev                      (in een ander venster)
//   npm test                         -> test http://localhost:5173/
//   npm test -- https://.../         -> test een andere omgeving, bijv. de preview
//
// Wat er gecontroleerd wordt, per pagina en per schermbreedte:
//   - geen JavaScript-fouten, geen mislukte verzoeken, geen CSP-meldingen
//   - geen verzoeken naar andere domeinen (privacy: geen Google Fonts e.d.)
//   - geen horizontaal scrollen, precies één zichtbare h1
//   - alle afbeeldingen geladen, alle interne links bereikbaar
//   - noindex aanwezig zolang src/site.json "indexeren": false heeft
//   - kopniveaus zonder gaten (h1 -> h2 -> h3), geldige JSON-LD
//   - niets opgeslagen in de browser (cookies, localStorage) zonder toestemming
//   - links naar privacy- en cookieverklaring in de footer
// Daarnaast: het mobiele menu, het contactformulier (validatie, niet-gekoppeld,
// gelukt, mislukt) en de 404-pagina op een diep pad.
//
// Tot slot bouwt de controle een tweede versie met de nep-inhoud uit
// tests/voorbeeld/ (openingstijden, telefoon, e-mail, kaart, eigen domein) en
// test daarmee wat met de echte, nog lege gegevens niet zichtbaar is.
//
// Screenshots komen in shots/ (staat in .gitignore).

import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { extname, join } from "node:path";

const BASIS = (process.argv[2] || "http://localhost:5173/").replace(/\/?$/, "/");
const site = JSON.parse(readFileSync(new URL("../src/site.json", import.meta.url), "utf8"));
const PAGINAS = ["index.html", "onze-kroeg.html", "biljart-darten.html", "zaal.html", "fotos.html", "contact.html", "privacyverklaring.html", "cookieverklaring.html", "404.html"];
const BREEDTES = [
  { naam: "desktop", width: 1440, height: 900 },
  { naam: "mobiel", width: 390, height: 844 },
  { naam: "klein", width: 320, height: 640 },
];

mkdirSync("shots", { recursive: true });
const fouten = [];
const fout = (waar, wat) => fouten.push(`${waar}: ${wat}`);
const host = new URL(BASIS).host;

const browser = await chromium.launch();

async function nieuwePagina(breedte) {
  const context = await browser.newContext({ viewport: { width: breedte.width, height: breedte.height } });
  const pagina = await context.newPage();
  const log = { console: [], mislukt: [], extern: [] };
  pagina.on("console", (m) => { if (m.type() === "error" || /Content Security Policy/i.test(m.text())) log.console.push(m.text()); });
  pagina.on("pageerror", (e) => log.console.push(String(e)));
  pagina.on("requestfailed", (r) => log.mislukt.push(`${r.url()} (${r.failure()?.errorText})`));
  pagina.on("response", (r) => { if (r.status() >= 400 && !r.url().endsWith("/404.html")) log.mislukt.push(`${r.url()} (${r.status()})`); });
  pagina.on("request", (r) => { const u = new URL(r.url()); if (u.protocol.startsWith("http") && u.host !== host) log.extern.push(r.url()); });
  return { context, pagina, log };
}

const gecontroleerdeLinks = new Map();

for (const breedte of BREEDTES) {
  for (const bestand of PAGINAS) {
    const waar = `${bestand} @${breedte.width}`;
    const { context, pagina, log } = await nieuwePagina(breedte);
    await pagina.goto(BASIS + bestand, { waitUntil: "networkidle" });

    // Langzaam naar beneden scrollen, zodat lazy-loading afbeeldingen laden.
    await pagina.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
      window.scrollTo(0, 0);
    });
    await pagina.waitForLoadState("networkidle");

    const staat = await pagina.evaluate(() => {
      const zichtbaar = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      return {
        overloop: document.documentElement.scrollWidth - window.innerWidth,
        h1: [...document.querySelectorAll("h1")].filter(zichtbaar).length,
        kapotteBeelden: [...document.images].filter((i) => zichtbaar(i) && (!i.complete || i.naturalWidth === 0)).map((i) => i.getAttribute("src")),
        robots: document.querySelector('meta[name="robots"]')?.content || "",
        links: [...document.querySelectorAll("a[href]")].map((a) => a.href).filter((h) => h.startsWith(location.origin)),
        titel: document.title,
        fonts: document.fonts.status,
        kopGat: (() => {
          const niveaus = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(zichtbaar).map((h) => Number(h.tagName[1]));
          for (let i = 1; i < niveaus.length; i++) if (niveaus[i] > niveaus[i - 1] + 1) return `h${niveaus[i - 1]} -> h${niveaus[i]}`;
          return "";
        })(),
        jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent),
        lettertypen: [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family),
        opslag: document.cookie.length + localStorage.length + sessionStorage.length,
        juridischeLinks: ["privacyverklaring", "cookieverklaring"].filter((l) =>
          [...document.querySelectorAll(`[data-view]:not([hidden]) footer a[href="${l}"]`)].some(zichtbaar)).length,
        streepjes: (document.querySelector("[data-view]:not([hidden])").innerText.match(/\u2014/g) || []).length,
      };
    });
    const cookies = await context.cookies();

    if (staat.overloop > 0) fout(waar, `horizontaal scrollen (${staat.overloop}px te breed)`);
    if (staat.h1 !== 1) fout(waar, `${staat.h1} zichtbare h1's (moet 1 zijn)`);
    if (staat.kapotteBeelden.length) fout(waar, `afbeelding niet geladen: ${staat.kapotteBeelden.join(", ")}`);
    if (!site.indexeren && !staat.robots.includes("noindex")) fout(waar, "noindex ontbreekt");
    if (!staat.lettertypen.length) fout(waar, "geen lettertypen geladen");
    if (staat.kopGat) fout(waar, `kopniveau overgeslagen: ${staat.kopGat}`);
    if (staat.opslag || cookies.length) fout(waar, "er wordt iets in de browser opgeslagen (cookie of storage) zonder toestemming");
    if (staat.juridischeLinks !== 2) fout(waar, "links naar privacy- en cookieverklaring ontbreken in de footer");
    if (staat.streepjes) fout(waar, `${staat.streepjes} lange streepjes (—) in de zichtbare tekst`);
    for (const blok of staat.jsonLd) {
      try { JSON.parse(blok); } catch { fout(waar, "JSON-LD is geen geldige JSON"); }
    }
    for (const r of log.console) fout(waar, `console: ${r}`);
    for (const r of log.mislukt) fout(waar, `mislukt: ${r}`);
    for (const r of new Set(log.extern)) fout(waar, `extern verzoek: ${r}`);
    for (const l of staat.links) gecontroleerdeLinks.set(l.split("#")[0], waar);

    await pagina.screenshot({ path: `shots/${bestand.replace(".html", "")}-${breedte.width}.png`, fullPage: true });
    await context.close();
  }
}

// Interne links
for (const [link, waar] of gecontroleerdeLinks) {
  const res = await fetch(link);
  if (!res.ok) fout(waar, `link werkt niet: ${link} (${res.status})`);
}

// Mobiel menu
{
  const { context, pagina } = await nieuwePagina(BREEDTES[1]);
  await pagina.goto(BASIS + "index.html");
  const menu = pagina.locator("#mobiel-menu");
  await pagina.click("#menu-knop");
  if (!(await menu.isVisible())) fout("mobiel menu", "gaat niet open");
  if ((await pagina.getAttribute("#menu-knop", "aria-expanded")) !== "true") fout("mobiel menu", "aria-expanded klopt niet");
  await pagina.keyboard.press("Escape");
  if (await menu.isVisible()) fout("mobiel menu", "sluit niet met Escape");
  await pagina.click("#menu-knop");
  await menu.getByText("Contact").click();
  await pagina.waitForURL(/contact/);
  await context.close();
}

// Contactformulier, op beide weergaven
for (const breedte of BREEDTES.slice(0, 2)) {
  const formSel = `.contactformulier[data-formulier="${breedte.naam}"]`;
  const waar = `formulier @${breedte.width}`;

  async function open(sleutel, antwoord) {
    const { context, pagina, log } = await nieuwePagina(breedte);
    let verzonden = null;
    await pagina.route("https://api.web3forms.com/**", (route) => {
      verzonden = route.request().postData() || "";
      return route.fulfill(antwoord);
    });
    await pagina.goto(BASIS + "contact.html?onderwerp=spel");
    if (sleutel !== undefined) {
      await pagina.evaluate(([sel, s]) => { document.querySelector(`${sel} [name="access_key"]`).value = s; }, [formSel, sleutel]);
    }
    return { context, pagina, log, form: pagina.locator(formSel), verzonden: () => verzonden };
  }

  async function vulIn(form) {
    await form.locator('[name="naam"]').fill("Test Persoon");
    await form.locator('[name="contact"]').fill("test@voorbeeld.nl");
    await form.locator('[name="bericht"]').fill("Dit is een testbericht van de controle.");
  }

  // 1. Leeg versturen: drie foutmeldingen, focus op het eerste veld
  {
    const { context, pagina, form } = await open();
    if ((await form.locator('[name="onderwerp"]').inputValue()) !== "spel") fout(waar, "?onderwerp=spel vult het onderwerp niet in");
    await form.locator('button[type="submit"]').click();
    const meldingen = await form.locator(".veld-fout:not([hidden])").count();
    if (meldingen !== 3) fout(waar, `leeg versturen gaf ${meldingen} foutmeldingen (verwacht 3)`);
    const focus = await pagina.evaluate(() => document.activeElement?.getAttribute("name"));
    if (focus !== "naam") fout(waar, `focus na fout staat op "${focus}" (verwacht naam)`);
    if (!(await form.locator('.form-privacy a[href="privacyverklaring"]').isVisible())) fout(waar, "privacyzin met link onder het formulier ontbreekt");
    await context.close();
  }

  // 2. Geen sleutel: eerlijke melding, bericht blijft staan
  {
    const { context, form, verzonden } = await open("");
    await vulIn(form);
    await form.locator('button[type="submit"]').click();
    const status = form.locator("[data-bevestiging]");
    const tekst = (await status.textContent()) || "";
    if (!/niet gekoppeld/.test(tekst)) fout(waar, `zonder sleutel geen eerlijke melding: "${tekst}"`);
    if ((await form.locator('[name="bericht"]').inputValue()) === "") fout(waar, "zonder sleutel is het bericht gewist");
    if (verzonden() !== null) fout(waar, "zonder sleutel toch verzonden");
    await context.close();
  }

  // 3. Met sleutel, server zegt ok: bevestiging, formulier leeg, juiste velden verstuurd
  {
    const { context, form, verzonden } = await open("test-sleutel", { status: 200, contentType: "application/json", body: '{"success":true}' });
    await vulIn(form);
    await form.locator('button[type="submit"]').click();
    await form.locator("[data-bevestiging]:not([hidden])").waitFor();
    const tekst = (await form.locator("[data-bevestiging]").textContent()) || "";
    if (!/verstuurd/.test(tekst)) fout(waar, `geen bevestiging na verzenden: "${tekst}"`);
    if ((await form.locator('[name="naam"]').inputValue()) !== "") fout(waar, "formulier niet leeggemaakt na verzenden");
    const body = verzonden() || "";
    for (const veld of ["access_key", "naam", "contact", "bericht", "subject", "email"]) {
      if (!body.includes(`name="${veld}"`)) fout(waar, `veld ${veld} niet meegestuurd`);
    }
    await context.close();
  }

  // 4. Met sleutel, server geeft een fout: foutmelding, bericht blijft staan, knop weer bruikbaar
  {
    const { context, form } = await open("test-sleutel", { status: 500, contentType: "application/json", body: '{"success":false}' });
    await vulIn(form);
    await form.locator('button[type="submit"]').click();
    await form.locator("[data-bevestiging].is-fout:not([hidden])").waitFor();
    if ((await form.locator('[name="bericht"]').inputValue()) === "") fout(waar, "na serverfout is het bericht gewist");
    if (await form.locator('button[type="submit"]').isDisabled()) fout(waar, "knop blijft uitgeschakeld na fout");
    await context.close();
  }

  // 5. Honeypot aangevinkt: niets versturen
  {
    const { context, form, verzonden } = await open("test-sleutel", { status: 200, contentType: "application/json", body: '{"success":true}' });
    await vulIn(form);
    await form.locator('[name="botcheck"]').evaluate((el) => { el.checked = true; });
    await form.locator('button[type="submit"]').click();
    if (verzonden() !== null) fout(waar, "honeypot aangevinkt maar toch verzonden");
    await context.close();
  }
}

// 404 op een diep pad: opmaak en afbeeldingen moeten blijven werken
{
  const { context, pagina, log } = await nieuwePagina(BREEDTES[0]);
  const res = await pagina.goto(BASIS + "bestaat/niet/echt", { waitUntil: "networkidle" });
  if (res.status() !== 404) fout("404", `statuscode ${res.status()} (verwacht 404)`);
  const opgemaakt = await pagina.evaluate(() => getComputedStyle(document.body).backgroundColor);
  if (opgemaakt === "rgba(0, 0, 0, 0)") fout("404", "stylesheet niet geladen op diep pad");
  for (const r of log.mislukt.filter((u) => !u.includes("/bestaat/niet/echt"))) fout("404 diep pad", `mislukt: ${r}`);
  await context.close();
}

// Zonder cookiecategorieën: geen melding, geen instellingenknop, wel markeringen
// voor wat nog aangeleverd moet worden.
{
  const { context, pagina } = await nieuwePagina(BREEDTES[0]);
  await pagina.goto(BASIS + "privacyverklaring.html");
  if (await pagina.locator("#cookiemelding").count()) fout("cookies", "cookiemelding staat erin terwijl er geen cookies zijn");
  if (await pagina.locator("[data-cookie-instellingen]").count()) fout("cookies", "knop Cookie-instellingen staat erin terwijl er niets te kiezen is");
  if (!site.indexeren) {
    const markeringen = await pagina.locator("[data-view]:not([hidden]) mark.aanleveren").count();
    if (!markeringen) fout("privacyverklaring", "geen [[AANLEVEREN]]-markeringen, terwijl gegevens nog ontbreken");
  }
  await context.close();
}

/* ------------------------------------------------------------------
   Voorbeeldinhoud: bouwen naar .cache/voorbeeld en serveren via route()
   ------------------------------------------------------------------ */
{
  const map = ".cache/voorbeeld";
  execFileSync(process.execPath, ["build.mjs"], {
    env: { ...process.env, INHOUD: "tests/voorbeeld", UIT: map, SITE_URL: "https://www.voorbeeld.invalid", INDEXEREN: "1", VANDAAG: "2026-10-01" },
    stdio: "ignore",
  });
  const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".xml": "application/xml", ".txt": "text/plain", ".webmanifest": "application/manifest+json" };
  const VB = "http://voorbeeld.test/";

  async function open(pad, breedte, tijd) {
    const context = await browser.newContext({ viewport: { width: breedte.width, height: breedte.height } });
    await context.route(`${VB}**`, (route) => {
      let p = decodeURIComponent(new URL(route.request().url()).pathname);
      if (p.endsWith("/")) p += "index.html";
      let bestand = join(map, p);
      if (!existsSync(bestand) || !statSync(bestand).isFile()) bestand += ".html";
      if (!existsSync(bestand)) return route.fulfill({ status: 404, body: "" });
      return route.fulfill({ status: 200, contentType: TYPES[extname(bestand)] || "application/octet-stream", body: readFileSync(bestand) });
    });
    const pagina = await context.newPage();
    const log = [];
    pagina.on("console", (m) => { if (m.type() === "error" || /Content Security Policy/i.test(m.text())) log.push(m.text()); });
    pagina.on("pageerror", (e) => log.push(String(e)));
    if (tijd) await pagina.clock.setFixedTime(new Date(tijd));
    await pagina.goto(VB + pad, { waitUntil: "networkidle" });
    return { context, pagina, log };
  }

  // Kaart, links in het menu, telefoon en e-mail, SEO met domein
  for (const breedte of BREEDTES.slice(0, 2)) {
    const waar = `voorbeeld @${breedte.width}`;
    const { context, pagina, log } = await open("kaart", breedte);
    const staat = await pagina.evaluate(() => {
      const zichtbaar = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      return {
        h1: [...document.querySelectorAll("h1")].filter(zichtbaar).map((h) => h.textContent),
        categorieen: [...document.querySelectorAll("main h2, #inhoud-mobiel h2")].filter(zichtbaar).map((h) => h.textContent),
        tekst: document.body.innerText,
        // In de actieve weergave: kopmenu (of mobiel menu, ook dichtgeklapt) plus footer.
        kaartLinks: document.querySelector("[data-view]:not([hidden])").querySelectorAll('a[href="kaart"]').length,
        actief: !!document.querySelector('a[data-nav="kaart"][aria-current="page"]'),
        tel: [...document.querySelectorAll('a[href^="tel:"]')].filter(zichtbaar).map((a) => a.getAttribute("href")),
        mail: [...document.querySelectorAll('a[href^="mailto:"]')].filter(zichtbaar).length,
        overloop: document.documentElement.scrollWidth - innerWidth,
      };
    });
    if (staat.h1.join() !== "Wat schenken we") fout(waar, `kaart-h1 is "${staat.h1}"`);
    if (staat.categorieen.join("|") !== "Van de tap|Fris") fout(waar, `kaartcategorieën: ${staat.categorieen.join("|")} (lege categorie hoort weg te zijn)`);
    if (!staat.tekst.includes("€ 1,00") || !staat.tekst.includes("€ 2,50")) fout(waar, "prijzen niet als € 1,00 / € 2,50 getoond");
    if (staat.kaartLinks < 2) fout(waar, `maar ${staat.kaartLinks} zichtbare links naar de kaart`);
    if (!staat.actief) fout(waar, "Kaart niet gemarkeerd als actieve pagina");
    if (!staat.tel.length || staat.tel.some((t) => t !== "tel:+31165000000")) fout(waar, `telefoonlink: ${staat.tel.join(", ") || "geen"}`);
    if (!staat.mail) fout(waar, "geen mailto-link in de footer");
    if (staat.overloop > 0) fout(waar, `horizontaal scrollen (${staat.overloop}px)`);
    for (const r of log) fout(waar, `console: ${r}`);
    await pagina.screenshot({ path: `shots/voorbeeld-kaart-${breedte.width}.png`, fullPage: true });
    await context.close();
  }

  {
    const { context, pagina } = await open("contact", BREEDTES[0]);
    const seo = await pagina.evaluate(() => ({
      canonical: document.querySelector('link[rel="canonical"]')?.href,
      robots: document.querySelector('meta[name="robots"]')?.content || "",
      ogImage: document.querySelector('meta[property="og:image"]')?.content,
      rijen: [...document.querySelectorAll(".tijd-rij")].map((r) => r.innerText.replace(/\s+/g, " ")),
    }));
    if (seo.canonical !== "https://www.voorbeeld.invalid/contact") fout("voorbeeld seo", `canonical is ${seo.canonical}`);
    if (seo.robots.includes("noindex")) fout("voorbeeld seo", "noindex staat er nog bij indexeren=true");
    if (seo.ogImage !== "https://www.voorbeeld.invalid/og-image.jpg") fout("voorbeeld seo", `og:image is ${seo.ogImage}`);
    if (seo.rijen.join(" | ") !== "Ma Gesloten | Di t/m do 14:00 – 01:00 | Vr t/m za 14:00 – 02:00 | Zo 12:00 – 22:00") fout("voorbeeld tijden", `rijen: ${seo.rijen.join(" | ")}`);
    await pagina.screenshot({ path: "shots/voorbeeld-contact-1440.png", fullPage: true });
    await context.close();
  }

  {
    const sitemap = readFileSync(join(map, "sitemap.xml"), "utf8");
    const locs = sitemap.match(/<loc>/g)?.length || 0;
    if (locs !== 9 || sitemap.includes("404")) fout("voorbeeld sitemap", `${locs} adressen (verwacht 9, zonder 404)`);
    if (!readFileSync(join(map, "robots.txt"), "utf8").includes("Sitemap: https://www.voorbeeld.invalid/sitemap.xml")) fout("voorbeeld robots", "sitemapregel ontbreekt");
    const index = readFileSync(join(map, "index.html"), "utf8");
    const ld = JSON.parse(index.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
    if (ld.telephone !== "0165 000000" || ld.openingHoursSpecification?.length !== 6 || ld.url !== "https://www.voorbeeld.invalid/") fout("voorbeeld json-ld", JSON.stringify(ld).slice(0, 200));
  }

  // Juridisch met alle gegevens ingevuld: geen markeringen meer
  {
    const privacy = readFileSync(join(map, "privacyverklaring.html"), "utf8");
    if (privacy.includes("AANLEVEREN")) fout("voorbeeld privacy", "nog [[AANLEVEREN]] terwijl alles is ingevuld");
    for (const tekst of ["Voorbeeld Horeca (testgegevens)", "00000000", "tot een jaar na het laatste contact", "26 oktober 2026"]) {
      if (!privacy.includes(tekst)) fout("voorbeeld privacy", `"${tekst}" ontbreekt`);
    }
    // Met "indexeren" aan en ontbrekende gegevens moet de build weigeren.
    let geweigerd = false;
    try {
      execFileSync(process.execPath, ["build.mjs"], { env: { ...process.env, UIT: ".cache/weiger", INDEXEREN: "1" }, stdio: "pipe" });
    } catch (e) {
      geweigerd = /AANLEVEREN/.test(String(e.stderr));
    }
    if (!geweigerd) fout("build", "bouwt met indexeren aan terwijl er nog [[AANLEVEREN]] in staat");
  }

  // Cookiemelding en voorkeurenbeheer, op beide weergaven
  for (const breedte of BREEDTES.slice(0, 2)) {
    const waar = `cookies @${breedte.width}`;
    const { context, pagina, log } = await open("cookieverklaring", breedte);
    const melding = pagina.locator("#cookiemelding");
    const opgeslagen = () => pagina.evaluate(() => JSON.parse(localStorage.getItem("tijdloos-toestemming") || "null"));
    // Een template dat pas na toestemming actief mag worden.
    await pagina.evaluate(() => {
      const t = document.createElement("template");
      t.setAttribute("data-toestemming", "statistieken");
      t.innerHTML = '<span id="na-toestemming"></span>';
      document.body.appendChild(t);
    });

    if (!(await melding.isVisible())) fout(waar, "melding verschijnt niet bij eerste bezoek");
    if (await opgeslagen()) fout(waar, "keuze al opgeslagen voordat er gekozen is");
    const knoppen = await pagina.evaluate(() => {
      const r = (s) => document.querySelector(`[data-cookie="${s}"]`).getBoundingClientRect();
      const w = getComputedStyle(document.querySelector('[data-cookie="weigeren"]'));
      const a = getComputedStyle(document.querySelector('[data-cookie="accepteren"]'));
      return { gelijk: Math.abs(r("weigeren").width - r("accepteren").width) < 2 && w.backgroundColor === a.backgroundColor, overloop: document.documentElement.scrollWidth - innerWidth };
    });
    if (!knoppen.gelijk) fout(waar, "weigeren en accepteren zijn niet even groot en opvallend");
    if (knoppen.overloop > 0) fout(waar, `horizontaal scrollen met melding (${knoppen.overloop}px)`);
    await pagina.screenshot({ path: `shots/cookiemelding-${breedte.width}.png` });

    // Weigeren: alles uit, melding weg, niets actief, blijft weg na herladen
    await pagina.click('[data-cookie="weigeren"]');
    let keuze = await opgeslagen();
    if (!keuze || keuze.keuzes.statistieken !== false || keuze.keuzes.media !== false) fout(waar, `weigeren slaat op: ${JSON.stringify(keuze)}`);
    if (await melding.isVisible()) fout(waar, "melding blijft staan na weigeren");
    if (await pagina.locator("#na-toestemming").count()) fout(waar, "template actief na weigeren");
    await pagina.reload();
    if (await melding.isVisible()) fout(waar, "melding komt terug na herladen, terwijl er al gekozen is");

    // Zelf kiezen via de knop op de pagina: alleen statistieken
    await pagina.evaluate(() => {
      const t = document.createElement("template");
      t.setAttribute("data-toestemming", "statistieken");
      t.innerHTML = '<span id="na-toestemming"></span>';
      document.body.appendChild(t);
    });
    await pagina.locator("[data-view]:not([hidden]) main [data-cookie-instellingen], [data-view]:not([hidden]) #inhoud-mobiel [data-cookie-instellingen]").first().click();
    if (!(await melding.isVisible())) fout(waar, "Cookie-instellingen opent de melding niet");
    await pagina.locator('.cookie-keuze input[value="statistieken"]').check();
    await pagina.click('[data-cookie="opslaan"]');
    keuze = await opgeslagen();
    if (keuze?.keuzes.statistieken !== true || keuze?.keuzes.media !== false) fout(waar, `zelf kiezen slaat op: ${JSON.stringify(keuze)}`);
    if (!(await pagina.locator("#na-toestemming").count())) fout(waar, "template niet actief na toestemming");
    const attr = await pagina.getAttribute("html", "data-toestemming");
    if (attr !== "statistieken") fout(waar, `data-toestemming is "${attr}"`);

    // Intrekken via de footer: pagina herlaadt, keuze is weer uit
    await pagina.locator("[data-view]:not([hidden]) footer [data-cookie-instellingen]").click();
    if (!(await pagina.locator('.cookie-keuze input[value="statistieken"]').isChecked())) fout(waar, "instellingen tonen de huidige keuze niet");
    await pagina.locator('.cookie-keuze input[value="statistieken"]').uncheck();
    await Promise.all([pagina.waitForEvent("load"), pagina.click('[data-cookie="opslaan"]')]);
    keuze = await opgeslagen();
    if (keuze?.keuzes.statistieken !== false) fout(waar, "intrekken niet opgeslagen");

    // Andere lijst categorieën: opnieuw vragen
    await pagina.evaluate(() => localStorage.setItem("tijdloos-toestemming", JSON.stringify({ versie: "oud", keuzes: { oud: true } })));
    await pagina.reload();
    if (!(await melding.isVisible())) fout(waar, "vraagt niet opnieuw als de categorieën veranderd zijn");

    for (const r of log) fout(waar, `console: ${r}`);
    await context.close();
  }

  // Badge en evenement op vaste tijdstippen (tijden in Nederland)
  const momenten = [
    ["2026-10-27T22:00:00+01:00", "Nu open", true, "dinsdagavond"],
    ["2026-10-28T00:30:00+01:00", "Nu open", true, "na middernacht, nog open van dinsdag"],
    ["2026-10-28T10:00:00+01:00", "Nu gesloten", true, "woensdagochtend"],
    ["2026-10-26T20:00:00+01:00", "Nu gesloten", true, "maandag (gesloten)"],
    ["2026-10-02T15:00:00+02:00", "Nu open", false, "vóór het evenement"],
    ["2026-10-04T15:00:00+02:00", "Nu open", true, "na het evenement"],
  ];
  for (const [tijd, badge, evenementWeg, wat] of momenten) {
    const { context, pagina } = await open("", BREEDTES[0], tijd);
    const staat = await pagina.evaluate(() => ({
      badge: document.querySelector("[data-openingstijden]")?.textContent,
      evenement: [...document.querySelectorAll("[data-tonen-tot]")].some((b) => !b.hidden),
    }));
    if (staat.badge !== badge) fout(`badge ${wat}`, `"${staat.badge}" (verwacht "${badge}")`);
    if (staat.evenement === evenementWeg) fout(`evenement ${wat}`, evenementWeg ? "nog zichtbaar" : "verborgen");
    await context.close();
  }
}

await browser.close();

if (fouten.length) {
  console.log(`\n${fouten.length} probleem/problemen:\n`);
  for (const f of fouten) console.log(" - " + f);
  process.exit(1);
}
console.log(`\nAlles in orde: ${PAGINAS.length} pagina's x ${BREEDTES.length} breedtes, ${gecontroleerdeLinks.size} interne links, menu, formulier, 404, cookies en de voorbeeldinhoud (kaart, tijden, badge, SEO, juridisch, cookiemelding). Screenshots in shots/.`);

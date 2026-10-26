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
// Daarnaast: het mobiele menu, het contactformulier (validatie, niet-gekoppeld,
// gelukt, mislukt) en de 404-pagina op een diep pad.
//
// Screenshots komen in shots/ (staat in .gitignore).

import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";

const BASIS = (process.argv[2] || "http://localhost:5173/").replace(/\/?$/, "/");
const site = JSON.parse(readFileSync(new URL("../src/site.json", import.meta.url), "utf8"));
const PAGINAS = ["index.html", "onze-kroeg.html", "biljart-darten.html", "zaal.html", "fotos.html", "contact.html", "404.html"];
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
        lettertypen: [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family),
      };
    });

    if (staat.overloop > 0) fout(waar, `horizontaal scrollen (${staat.overloop}px te breed)`);
    if (staat.h1 !== 1) fout(waar, `${staat.h1} zichtbare h1's (moet 1 zijn)`);
    if (staat.kapotteBeelden.length) fout(waar, `afbeelding niet geladen: ${staat.kapotteBeelden.join(", ")}`);
    if (!site.indexeren && !staat.robots.includes("noindex")) fout(waar, "noindex ontbreekt");
    if (!staat.lettertypen.length) fout(waar, "geen lettertypen geladen");
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

await browser.close();

if (fouten.length) {
  console.log(`\n${fouten.length} probleem/problemen:\n`);
  for (const f of fouten) console.log(" - " + f);
  process.exit(1);
}
console.log(`\nAlles in orde: ${PAGINAS.length} pagina's x ${BREEDTES.length} breedtes, ${gecontroleerdeLinks.size} interne links, menu, formulier en 404. Screenshots in shots/.`);

// Inhoud uit src/data/ in de pagina's zetten.
//
// In de HTML staan drie soorten markeringen:
//
//   {{bedrijf.adres.straat}}            een waarde uit bedrijf.json (of een afgeleide
//                                       waarde zoals {{route}}, {{tel}}, {{tijden.tekst}})
//   <!--als X-->...<!--/als-->          alleen tonen als X ingevuld is
//   <!--zonder X-->...<!--/zonder-->    alleen tonen als X leeg is
//   <!--tot 2026-10-03-->...<!--/tot--> tonen tot en met die datum, daarna weg
//
// X is een pad in de inhoud (bijv. bedrijf.telefoon) of "tijden" / "kaart" / "cookies".

import { readFileSync } from "node:fs";
import { join } from "node:path";

export const DAGEN = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"];
const KORT = { maandag: "Ma", dinsdag: "Di", woensdag: "Wo", donderdag: "Do", vrijdag: "Vr", zaterdag: "Za", zondag: "Zo" };
const TIJD = /^([01]\d|2[0-3]):[0-5]\d$/;

export const html = (tekst) =>
  String(tekst).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ------------------------------------------------------------------
   Openingstijden
   Per dag: "" (onbekend), "gesloten", of "14:00-01:00". Een sluittijd
   vóór de openingstijd betekent: na middernacht.
   ------------------------------------------------------------------ */
export function leesTijden(bedrijf) {
  const ruw = bedrijf.openingstijden || {};
  const tijden = {};
  for (const dag of DAGEN) {
    const waarde = String(ruw[dag] ?? "").trim().toLowerCase();
    if (!waarde) tijden[dag] = null;
    else if (waarde === "gesloten") tijden[dag] = "gesloten";
    else {
      const [open, dicht] = waarde.split(/\s*-\s*/);
      if (!TIJD.test(open || "") || !TIJD.test(dicht || "")) {
        throw new Error(`bedrijf.json: openingstijd ${dag} "${ruw[dag]}" moet "gesloten" of bijv. "14:00-01:00" zijn`);
      }
      tijden[dag] = { open, dicht };
    }
  }
  return tijden;
}

// Pas tonen als álle dagen ingevuld zijn: een half schema is misleidender dan
// de algemene tekst "zeven dagen per week open".
export const heeftTijden = (tijden) => DAGEN.every((dag) => tijden[dag] !== null);

// Opeenvolgende dagen met dezelfde tijden samenvoegen: "Ma t/m do".
function groepeer(tijden) {
  const groepen = [];
  for (const dag of DAGEN) {
    const tekst = tijden[dag] === "gesloten" ? "Gesloten" : `${tijden[dag].open} – ${tijden[dag].dicht}`;
    const vorige = groepen[groepen.length - 1];
    if (vorige && vorige.tekst === tekst) vorige.tot = dag;
    else groepen.push({ van: dag, tot: dag, tekst });
  }
  return groepen.map((g) => ({
    label: g.van === g.tot ? KORT[g.van] : `${KORT[g.van]} t/m ${KORT[g.tot].toLowerCase()}`,
    tekst: g.tekst,
  }));
}

/* ------------------------------------------------------------------
   Kaart
   ------------------------------------------------------------------ */
function leesKaart(kaart) {
  const categorieen = (kaart.categorieen || []).filter((c) => c.items && c.items.length);
  return { ...kaart, categorieen };
}

const prijs = (p) => (p ? `€ ${String(p).replace(".", ",")}` : "");

function kaartHtml(kaart, mobiel) {
  const label = mobiel
    ? "font-family:Archivo,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.26em;text-transform:uppercase;color:#E0B33F"
    : "font-family:Archivo,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#E0B33F";
  const rij = mobiel
    ? "display:flex;justify-content:space-between;gap:14px;padding:13px 0;border-top:1px solid #3B2612;font-family:Archivo,sans-serif;font-size:15px;font-weight:600;line-height:1.4;color:#F1E8D6"
    : "display:flex;justify-content:space-between;gap:16px;padding:16px 0;border-top:1px solid #3B2612;font-family:Archivo,sans-serif;font-size:16px;font-weight:600;line-height:1.4;color:#F1E8D6";
  const uitleg = `display:block;margin-top:4px;font-weight:500;font-size:${mobiel ? 13 : 14}px;color:#A8977B`;
  const inspring = "          ";

  return kaart.categorieen
    .map((cat) => {
      const items = cat.items
        .map((item, i) => {
          const laatste = i === cat.items.length - 1 ? ";border-bottom:1px solid #3B2612" : "";
          const omschrijving = item.omschrijving ? `<span style="${uitleg}">${html(item.omschrijving)}</span>` : "";
          return `${inspring}    <div style="${rij}${laatste}"><span>${html(item.naam)}${omschrijving}</span><span style="color:#E0B33F;white-space:nowrap">${html(prijs(item.prijs))}</span></div>`;
        })
        .join("\n");
      return `${inspring}<div style="display:flex;flex-direction:column;gap:14px">\n${inspring}  <h2 style="margin:0;${label}">${html(cat.naam)}</h2>\n${inspring}  <div style="display:flex;flex-direction:column">\n${items}\n${inspring}  </div>\n${inspring}</div>`;
    })
    .join("\n");
}

/* ------------------------------------------------------------------
   Juridisch en cookies
   ------------------------------------------------------------------ */
const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

function datumTekst(datum) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datum || "");
  if (!m || !MAANDEN[m[2] - 1]) throw new Error(`juridisch.json: "bijgewerkt" moet een datum zijn zoals "2026-10-26"`);
  return `${Number(m[3])} ${MAANDEN[m[2] - 1]} ${m[1]}`;
}

// Alleen categorieën waar toestemming voor nodig is (statistieken, ingesloten
// video's e.d.). Staat er niets in, dan verschijnt er geen cookiemelding.
function leesCookies(cookies) {
  const categorieen = (cookies.categorieen || []).filter((c) => c.id && c.naam);
  for (const c of categorieen) {
    if (!/^[a-z][a-z0-9-]*$/.test(c.id)) throw new Error(`cookies.json: id "${c.id}" mag alleen kleine letters, cijfers en - bevatten`);
  }
  if (!categorieen.length) return null;
  return {
    categorieen,
    // Verandert de lijst, dan vraagt de site opnieuw om toestemming.
    versie: categorieen.map((c) => c.id).join("+"),
    keuzes: categorieen
      .map((c) => `<label class="cookie-keuze"><input type="checkbox" value="${html(c.id)}" /><span><strong>${html(c.naam)}</strong> ${html(c.uitleg || "")}</span></label>`)
      .join(""),
    lijst: categorieen
      .map((c) => {
        const items = (c.cookies || [])
          .map((k) => `<li><strong>${html(k.naam)}</strong> (${html(k.aanbieder)}): ${html(k.doel)} Bewaartermijn: ${html(k.bewaartermijn)}.</li>`)
          .join("");
        return `<h3>${html(c.naam)}</h3><p>${html(c.uitleg || "")}</p>${items ? `<ul>${items}</ul>` : ""}`;
      })
      .join(""),
  };
}

/* ------------------------------------------------------------------
   Alles bij elkaar
   ------------------------------------------------------------------ */
export function leesInhoud(src, site) {
  const bedrijf = JSON.parse(readFileSync(join(src, "data", "bedrijf.json"), "utf8"));
  const kaart = leesKaart(JSON.parse(readFileSync(join(src, "data", "kaart.json"), "utf8")));
  const juridisch = JSON.parse(readFileSync(join(src, "data", "juridisch.json"), "utf8"));
  const cookies = leesCookies(JSON.parse(readFileSync(join(src, "data", "cookies.json"), "utf8")));
  const tijden = leesTijden(bedrijf);
  const { straat, postcode, plaats } = bedrijf.adres;

  const telCijfers = (bedrijf.telefoon || "").replace(/[^\d+]/g, "");
  const tel = telCijfers ? `tel:${telCijfers.startsWith("+") ? telCijfers : "+31" + telCijfers.replace(/^0/, "")}` : "";

  const groepen = heeftTijden(tijden) ? groepeer(tijden) : [];

  return {
    site,
    bedrijf,
    juridisch: { ...juridisch, bijgewerktTekst: datumTekst(juridisch.bijgewerkt) },
    cookies,
    tijdenPerDag: tijden,
    jaar: String(new Date().getFullYear()),
    route: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${straat}, ${postcode} ${plaats}`)}`,
    tel,
    mailto: bedrijf.email ? `mailto:${bedrijf.email}` : "",
    tijden: heeftTijden(tijden)
      ? {
          tekst: groepen.map((g) => `${g.label} ${html(g.tekst)}`).join("<br />"),
          rijen: groepen.map((g) => `<div class="tijd-rij"><span>${g.label}</span><span>${html(g.tekst)}</span></div>`).join(""),
        }
      : null,
    kaart: kaart.categorieen.length
      ? { ...kaart, desktop: kaartHtml(kaart, false), mobiel: kaartHtml(kaart, true) }
      : null,
  };
}

// Deze waarden zijn zelf al HTML en worden dus niet ge-escaped.
const RUWE_HTML = new Set(["tijden.tekst", "tijden.rijen", "kaart.desktop", "kaart.mobiel", "cookies.keuzes", "cookies.lijst"]);

function zoek(inhoud, pad) {
  return pad.split(".").reduce((obj, sleutel) => (obj == null ? undefined : obj[sleutel]), inhoud);
}

const ingevuld = (waarde) => (Array.isArray(waarde) ? waarde.length > 0 : !!waarde);

// Vandaag in Nederland, als "2026-10-26", ook als de build in een andere tijdzone draait.
// VANDAAG=2026-10-01 in de omgeving doet alsof het die dag is (voor de tests).
export const vandaag = () =>
  process.env.VANDAAG || new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Amsterdam" }).format(new Date());

export function vulIn(tekst, inhoud, bestand) {
  let uit = tekst.replace(/<!--(als|zonder) ([\w.]+)-->([\s\S]*?)<!--\/\1-->/g, (_, soort, pad, blok) =>
    ingevuld(zoek(inhoud, pad)) === (soort === "als") ? blok : "",
  );

  // Verlopen blokken verdwijnen bij het bouwen. Wat nog komt, krijgt de datum
  // mee zodat site.js het op de dag zelf verbergt, ook zonder nieuwe build.
  uit = uit.replace(/<!--tot (\d{4}-\d{2}-\d{2})-->([\s\S]*?)<!--\/tot-->/g, (_, datum, blok) =>
    datum < vandaag() ? "" : `<div data-tonen-tot="${datum}" style="display:contents">${blok}</div>`,
  );

  return uit.replace(/\{\{([\w.]+)\}\}/g, (_, pad) => {
    const waarde = zoek(inhoud, pad);
    if (waarde === undefined || waarde === null || typeof waarde === "object") {
      throw new Error(`${bestand}: {{${pad}}} heeft geen waarde`);
    }
    return RUWE_HTML.has(pad) ? waarde : html(waarde);
  });
}

// Voor site.js: de tijden per dag, zodat de badge "Nu open" of "Nu gesloten" kan zeggen.
export function badgeData(inhoud) {
  if (!inhoud.tijden) return "";
  return ` data-openingstijden="${html(JSON.stringify(inhoud.tijdenPerDag))}"`;
}

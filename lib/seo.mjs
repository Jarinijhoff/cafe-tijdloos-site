// Vindbaarheid: canonical, Open Graph, sitemap en gestructureerde gegevens.
//
// Alles wat een absoluut adres nodig heeft (canonical, og:image, sitemap)
// verschijnt pas zodra "url" in src/site.json is ingevuld. Tot dan zou het naar
// een tijdelijk adres wijzen, en dat wil je niet in Google of in WhatsApp-previews.

import { DAGEN, html } from "./inhoud.mjs";

const SCHEMA_DAG = {
  maandag: "Monday", dinsdag: "Tuesday", woensdag: "Wednesday", donderdag: "Thursday",
  vrijdag: "Friday", zaterdag: "Saturday", zondag: "Sunday",
};

export const OG_BEELD = { pad: "og-image.jpg", breedte: 1200, hoogte: 630 };

const basisUrl = (site) => (site.url || "").replace(/\/+$/, "");

// index.html -> "/", contact.html -> "/contact" (zo serveert Cloudflare Pages ze).
export const schoonPad = (bestand) => (bestand === "index.html" ? "/" : `/${bestand.replace(/\.html$/, "")}`);

// Interne links zonder .html, zodat ze overeenkomen met de canonical en er geen
// omleiding tussen zit. GitHub Pages, Cloudflare Pages en dev.mjs serveren
// /contact allemaal als contact.html.
export const schoneLinks = (tekst) =>
  tekst.replace(/href="([a-z0-9-]+)\.html([?#][^"]*)?"/g, (_, naam, rest = "") =>
    `href="${naam === "index" ? "./" : naam}${rest}"`,
  );

export function seoHead(pagina, inhoud) {
  const url = basisUrl(inhoud.site);
  const regels = ['<meta name="twitter:card" content="summary_large_image" />'];
  if (url && !pagina.meta.noindex) {
    const adres = url + schoonPad(pagina.bestand);
    regels.push(
      `<link rel="canonical" href="${adres}" />`,
      `<meta property="og:url" content="${adres}" />`,
    );
  }
  if (url) {
    regels.push(
      `<meta property="og:image" content="${url}/${OG_BEELD.pad}" />`,
      `<meta property="og:image:width" content="${OG_BEELD.breedte}" />`,
      `<meta property="og:image:height" content="${OG_BEELD.hoogte}" />`,
      `<meta property="og:image:alt" content="${html(`Rick achter de tap van ${inhoud.bedrijf.naam}`)}" />`,
    );
  }
  if (pagina.bestand === "index.html") regels.push(jsonLd(inhoud));
  return regels.join("\n");
}

// Gestructureerde gegevens voor Google: alleen wat echt bekend is.
function jsonLd(inhoud) {
  const { bedrijf, site } = inhoud;
  const url = basisUrl(site);
  const data = {
    "@context": "https://schema.org",
    "@type": "BarOrPub",
    name: bedrijf.naam,
    address: {
      "@type": "PostalAddress",
      streetAddress: bedrijf.adres.straat,
      postalCode: bedrijf.adres.postcode,
      addressLocality: bedrijf.adres.plaats,
      addressCountry: "NL",
    },
    sameAs: [bedrijf.social.instagram, bedrijf.social.facebook].filter(Boolean),
  };
  if (url) {
    data.url = url + "/";
    data.image = `${url}/${OG_BEELD.pad}`;
  }
  if (bedrijf.telefoon) data.telephone = bedrijf.telefoon;
  if (bedrijf.email) data.email = bedrijf.email;
  if (inhoud.tijden) {
    data.openingHoursSpecification = DAGEN.filter((dag) => typeof inhoud.tijdenPerDag[dag] === "object").map((dag) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: `https://schema.org/${SCHEMA_DAG[dag]}`,
      opens: inhoud.tijdenPerDag[dag].open,
      closes: inhoud.tijdenPerDag[dag].dicht,
    }));
  }
  // "</" mag niet in een script-blok voorkomen.
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}

export function sitemap(paginas, site) {
  const url = basisUrl(site);
  if (!url || !site.indexeren) return null;
  const regels = paginas.map((p) => `  <url><loc>${url}${schoonPad(p)}</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${regels.join("\n")}\n</urlset>\n`;
}

export function manifest(bedrijf) {
  return JSON.stringify(
    {
      name: bedrijf.naam,
      short_name: "Tijdloos",
      lang: "nl",
      start_url: "./",
      display: "browser",
      background_color: "#14100C",
      theme_color: "#1E1409",
      icons: [
        { src: "apple-touch-icon.png", sizes: "180x180", type: "image/png" },
        { src: "icon-512.png", sizes: "512x512", type: "image/png" },
      ],
    },
    null,
    2,
  );
}

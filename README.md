# Café Tijdloos – website mockup

Klantmockup van de nieuwe website van Café Tijdloos (Oudenbosch).
Statische HTML-export uit Claude Design: `index.html` + `support.js` + `images/`. Geen framework.

- **Preview:** https://cafe-tijdloos-preview.pages.dev
- **Hosting:** Cloudflare Pages, project `cafe-tijdloos-preview`, production branch `main`
- **Build command:** `node build.mjs` (kopieert alleen de site-bestanden naar `dist/`)
- **Output directory:** `dist`

## Bestanden

| Bestand | Wat |
|---|---|
| `index.html` | De mockup die online staat (= `Cafe Tijdloos v2.dc.html`, met externe links uitgeschakeld) |
| `Cafe Tijdloos v2.dc.html` | Origineel ontwerp v2 (ongewijzigd, met werkende externe links) |
| `Cafe Tijdloos.dc.html` | Ouder ontwerp v1 (ongewijzigd) |
| `support.js` | Runtime van de design-export (rendert de pagina) |
| `images/` | Alle afbeeldingen |

## Externe links weer aanzetten

In `index.html` staan alle externe links (Instagram, Facebook, BN DeStem, Google Maps) als
`<a data-href="https://…">` in plaats van `<a href="https://…">`. Zoek-en-vervang
`<a data-href="https://` → `<a href="https://` en verwijder de regel `a[data-href] { cursor: pointer; }`.

## Deployen

Elke push naar `main` deployt automatisch via GitHub Actions (`.github/workflows/deploy.yml`).
Handmatig: `npm run deploy` (vereist `npx wrangler login`).

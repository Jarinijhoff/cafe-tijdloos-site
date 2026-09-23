# Café Tijdloos – website

Website van Café Tijdloos (Oudenbosch). Statische HTML, geen framework, geen afhankelijkheden.
Het ontwerp komt uit de Claude Design-export en is ongewijzigd overgenomen.

- **Preview (huidige, oude versie):** https://cafe-tijdloos-preview.pages.dev
- **Hosting:** Cloudflare Pages, project `cafe-tijdloos-preview`, production branch `main`
- **Build command:** `node build.mjs` · **Output directory:** `dist`

## Lokaal bekijken

```
npm run dev
```

Draait op http://localhost:5173 en bouwt opnieuw zodra je iets in `src/` of `images/`
wijzigt — ververs de pagina in de browser. Andere poort: `npm run dev -- 8080`.

De dev-server deployt niets.

## Hoe het in elkaar zit

De design-export was één bestand met een eigen runtime (`support.js`), waarin de
"pagina's" alleen JavaScript-state waren en de menuknoppen dus nergens heen gingen.
Die runtime is eruit; de opmaak is letterlijk overgenomen.

| Pad | Wat |
|---|---|
| `src/layout.html` | De schil om elke pagina: `<head>`, kopmenu, mobiel menu en footer. Eén keer, zodat het menu op zes pagina's niet uit elkaar loopt. |
| `src/pages/*.html` | Per pagina de metagegevens (titel, description) en de inhoud. |
| `src/assets/styles.css` | Hover, focus, de desktop/mobiel-wissel, het menu en de formuliermeldingen. |
| `src/assets/site.js` | Mobiel menu, formuliervalidatie, weergavewissel. |
| `images/` | Alle afbeeldingen. |
| `build.mjs` | Zet `src/` om naar `dist/`. |
| `dev.mjs` | Lokale server met herbouwen bij wijzigingen. |
| `mockup/` | De originele design-export, ongewijzigd bewaard als referentie. |

### Twee ontwerpen naast elkaar

De export bevat een compleet desktopontwerp én een compleet mobiel ontwerp — geen
responsive versie van één ontwerp. Beide staan in elke pagina; CSS bepaalt welke je
ziet (omslagpunt 768px) en `site.js` verbergt de andere voor schermlezers. Daarom
staat elke paginabron in twee blokken: `<!--desktop-->` en `<!--mobile-->`.

### Een pagina wijzigen

Pas `src/pages/<pagina>.html` aan — let op: meestal in beide blokken. Het kopje
bovenaan bevat `title`, `description` en `nav` (welk menu-item goud oplicht).

### Een pagina toevoegen

1. Nieuw bestand in `src/pages/`, met hetzelfde kopje en de twee blokken.
2. De link opnemen in de drie menu's in `src/layout.html`, met een eigen `data-nav`.

## Deployen

Gebeurt **niet** automatisch vanuit deze map. `npm run deploy` bouwt en zet de site
op Cloudflare Pages (vereist `npx wrangler login`).

> **Let op:** `.github/workflows/deploy.yml` deployt bij elke push naar `main` zodra
> deze map aan een GitHub-repo hangt. Zolang er geen remote is, gebeurt er niets.
> Wil je dat de live site pas verandert wanneer jij dat zegt, haal dan de `push`-trigger
> uit dat bestand; `workflow_dispatch` blijft dan over als handmatige knop.

## Nog aan te leveren

Zie de lijst in `ONTBREEKT.md`.

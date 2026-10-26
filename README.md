# Café Tijdloos – website

Website van Café Tijdloos (Oudenbosch). Statische HTML, geen framework. Alleen `sharp`
(afbeeldingen omzetten) en `playwright` (testen) als ontwikkelafhankelijkheid.
Het ontwerp komt uit de Claude Design-export en is ongewijzigd overgenomen.

- **Preview (huidige, oude versie):** https://cafe-tijdloos-preview.pages.dev
- **Hosting:** Cloudflare Pages, project `cafe-tijdloos-preview`, production branch `main`
- **Build command:** `node build.mjs` · **Output directory:** `dist`

## Lokaal bekijken

```
npm install
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
| `src/site.json` | Instellingen per omgeving: `url` (definitief domein), `indexeren` (zoekmachines toelaten) en `web3formsKey` (contactformulier). |
| `src/layout.html` | De schil om elke pagina: `<head>`, kopmenu, mobiel menu en footer. Eén keer, zodat het menu op zes pagina's niet uit elkaar loopt. |
| `src/pages/*.html` | Per pagina de metagegevens (titel, description) en de inhoud. |
| `src/assets/styles.css` | Hover, focus, de desktop/mobiel-wissel, het menu en de formuliermeldingen. Komt bij het bouwen inline in de pagina. |
| `src/assets/fonts.css`, `fonts/` | De lettertypen, lokaal gehost (geen verbinding met Google). |
| `src/assets/site.js` | Mobiel menu, formuliervalidatie en verzenden, weergavewissel. |
| `images/` | De originele afbeeldingen. De build maakt er WebP van. |
| `build.mjs` | Zet `src/` om naar `dist/`: pagina's, WebP, favicon, `robots.txt`, `_headers`. |
| `dev.mjs` | Lokale server met herbouwen bij wijzigingen. |
| `tests/controle.mjs` | Browsertest van de hele site (`npm test`). |
| `mockup/` | De originele design-export, ongewijzigd bewaard als referentie. |
| `fotos-aangeleverd/` | Foto's van de klant, alleen lokaal (niet in git). |

### Twee ontwerpen naast elkaar

De export bevat een compleet desktopontwerp én een compleet mobiel ontwerp — geen
responsive versie van één ontwerp. Beide staan in elke pagina; CSS bepaalt welke je
ziet (omslagpunt 768px) en `site.js` verbergt de andere voor schermlezers. Daarom
staat elke paginabron in twee blokken: `<!--desktop-->` en `<!--mobile-->`.

### Een pagina wijzigen

Pas `src/pages/<pagina>.html` aan — let op: meestal in beide blokken. Het kopje
bovenaan bevat `title`, `description` en `nav` (welk menu-item goud oplicht).

### Een foto vervangen

Zet het nieuwe bestand met dezelfde naam in `images/` (PNG of JPG) en bouw opnieuw.
De build maakt er een WebP van (max. 1600px breed) en past alle verwijzingen aan.
In de HTML blijf je gewoon naar `images/naam.png` verwijzen.

### Een pagina toevoegen

1. Nieuw bestand in `src/pages/`, met hetzelfde kopje en de twee blokken.
2. De link opnemen in de drie menu's in `src/layout.html`, met een eigen `data-nav`.

## Indexering, beveiliging, formulier

- **Zoekmachines:** zolang `"indexeren": false` in `src/site.json` staat, krijgt elke
  pagina `noindex, nofollow` en stuurt Cloudflare de header `X-Robots-Tag` mee.
  `robots.txt` blokkeert bewust niets, anders ziet Google de noindex niet. Pas bij
  livegang op het definitieve domein: `url` invullen en `indexeren` op `true`.
- **Beveiliging:** een Content-Security-Policy staat als `<meta>` in elke pagina
  (werkt overal). Op Cloudflare komen daar via `_headers` HSTS, X-Frame-Options,
  Referrer-Policy en Permissions-Policy bij. GitHub Pages ondersteunt geen eigen headers.
- **Contactformulier:** verstuurt via [Web3Forms](https://web3forms.com). Maak daar
  een access key aan met het e-mailadres van het café en zet die in `web3formsKey`.
  Zonder sleutel meldt het formulier eerlijk dat er niets verstuurd is. Er zit een
  honeypot tegen spam in.

## Testen

```
npm run dev          # in een ander venster
npm test             # of: npm test -- https://jarinijhoff.github.io/cafe-tijdloos-site/
```

Controleert alle pagina's op 1440, 390 en 320 breed: JavaScript-fouten, kapotte
links en afbeeldingen, verzoeken naar andere domeinen, horizontaal scrollen, één h1,
noindex, het mobiele menu, het formulier (leeg, zonder sleutel, gelukt, mislukt,
spam) en de 404-pagina. Screenshots komen in `shots/`.

## Twee adressen

| Waar | Wat | Werkt bij |
|---|---|---|
| https://cafe-tijdloos-preview.pages.dev | **De klant-URL.** Hier kijkt de klant mee. | Alleen wanneer jij het zelf start. |
| https://jarinijhoff.github.io/cafe-tijdloos-site/ | **Je werk-URL.** Hier bekijk je aanpassingen. | Elke push naar `main`, binnen ongeveer een minuut. |

De klant-URL verandert dus niet vanzelf. Dat is met opzet: in
`.github/workflows/deploy.yml` staat de `push`-trigger uitgecommentarieerd, er
blijft `workflow_dispatch` over. Wil je de klant-URL bijwerken, dan doe je dat
bewust — via Actions op GitHub ("Run workflow") of lokaal met `npm run deploy`
(vereist `npx wrangler login`).

De werk-URL komt uit `.github/workflows/github-pages.yml`. Pages staat al ingesteld
op bron "GitHub Actions", dus je hoeft daar niets meer te doen: pushen volstaat.

Repo: https://github.com/Jarinijhoff/cafe-tijdloos-site

De site gebruikt alleen relatieve paden en werkt daarom net zo goed op een
submap-URL (`gebruiker.github.io/reponaam/`) als op een eigen domein. Alleen de
404-pagina heeft het pad nodig (`BASIS` in de workflow), omdat die op elk adres kan
verschijnen.

**Let op:** het Cloudflare-project `cafe-tijdloos-preview` staat op een ander
Cloudflare-account (`e2af251b…`) dan waar wrangler op deze laptop mee is ingelogd,
en de GitHub-secret `CLOUDFLARE_API_TOKEN` ontbreekt. De klant-URL toont daardoor
nog de oude design-export. Zie `ONTBREEKT.md`.

## Nog aan te leveren

Zie de lijst in `ONTBREEKT.md`.

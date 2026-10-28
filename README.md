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

## Inhoud aanpassen (zonder in de HTML te duiken)

Na elke wijziging: opslaan, committen en pushen naar `main`. De preview is binnen
een paar minuten bijgewerkt.

| Wat | Waar | Hoe |
|---|---|---|
| Adres, telefoon, e-mail, KvK, Instagram, Facebook | `src/data/bedrijf.json` | Waarde invullen. Telefoon en e-mail verschijnen vanzelf als knop op de contactpagina en in de footer zodra ze ingevuld zijn. De routelink naar Google Maps volgt het adres. |
| Openingstijden | `src/data/bedrijf.json` → `openingstijden` | Per dag `"14:00-01:00"` of `"gesloten"`. Na middernacht sluiten mag (`"14:00-02:00"`). Pas als **alle zeven dagen** ingevuld zijn, verschijnt het schema op de contactpagina en in de footer, en zegt de badge bovenin "Nu open" of "Nu gesloten". Tot dan blijft de tekst "Zeven dagen per week open" staan. |
| Kaart / prijzen | `src/data/kaart.json` | Categorieën met items (`naam`, `prijs` zoals `"4,20"`, optioneel `omschrijving`). Zodra er één item in staat, verschijnt de pagina **Kaart** met een link in alle menu's. Leeg = geen pagina. |
| Feesten | `src/data/feesten.json` | `vast`: feesten die elk jaar terugkomen (`naam`, optioneel `wanneer` zoals `"27 december"`). `los`: eenmalige feesten met `naam`, `datum` (`"2026-12-27"`) en optioneel `tekst`; die staan onder "Binnenkort" op de feestenpagina en verdwijnen na die dag vanzelf. |
| Een evenement dat vanzelf verdwijnt | `src/pages/index.html` | Zet het blok tussen `<!--tot 2026-10-03-->` en `<!--/tot-->`. Na die datum verdwijnt het vanzelf, ook zonder nieuwe build. |
| Privacyverklaring: juridische naam, bewaartermijn, hostingpartij, datum | `src/data/juridisch.json` (KvK en e-mail komen uit `bedrijf.json`) | Waarde invullen. Wat leeg is, staat als gele `[[AANLEVEREN: ...]]` op de pagina. Pas `bijgewerkt` aan (`"2026-10-26"`) als de tekst verandert. |
| Cookies waarvoor toestemming nodig is | `src/data/cookies.json` | Zie "Cookies en toestemming" hieronder. Leeg = geen cookiemelding. |
| Foto's | `images/` | Nieuw bestand met dezelfde naam erin zetten (PNG of JPG). |
| Teksten | `src/pages/<pagina>.html` | Let op: meestal in het desktop- én het mobiele blok. |
| Titel en omschrijving in Google | bovenaan `src/pages/<pagina>.html` | `title:` en `description:` |

Een fout in de gegevens (bijv. `"14.00-01.00"`) laat de build stoppen met een
melding die zegt wat er mis is, zodat er nooit iets kapots online komt.

## Hoe het in elkaar zit

De design-export was één bestand met een eigen runtime (`support.js`), waarin de
"pagina's" alleen JavaScript-state waren en de menuknoppen dus nergens heen gingen.
Die runtime is eruit; de opmaak is letterlijk overgenomen.

| Pad | Wat |
|---|---|
| `src/site.json` | Instellingen per omgeving: `url` (definitief domein), `indexeren` (zoekmachines toelaten) en `web3formsKey` (contactformulier). |
| `src/data/` | Bedrijfsgegevens, openingstijden, de kaart, juridische gegevens en cookies (zie hierboven). |
| `lib/inhoud.mjs` | Zet de gegevens uit `src/data/` in de pagina's: `{{...}}`, `<!--als-->`, `<!--zonder-->`, `<!--tot-->`. |
| `lib/seo.mjs` | Canonical, Open Graph, sitemap, JSON-LD, webmanifest, schone links. |
| `src/layout.html` | De schil om elke pagina: `<head>`, kopmenu, mobiel menu en footer. Eén keer, zodat het menu op zes pagina's niet uit elkaar loopt. |
| `src/pages/*.html` | Per pagina de metagegevens (titel, description) en de inhoud. |
| `src/assets/styles.css` | Hover, focus, de desktop/mobiel-wissel, het menu en de formuliermeldingen. Komt bij het bouwen inline in de pagina. |
| `src/assets/fonts.css`, `fonts/` | De lettertypen, lokaal gehost (geen verbinding met Google). |
| `src/assets/site.js` | Mobiel menu, formuliervalidatie en verzenden, weergavewissel, openingsbadge, cookietoestemming. |
| `images/` | De originele afbeeldingen. De build maakt er WebP van. |
| `build.mjs` | Zet `src/` om naar `dist/`: pagina's, WebP, favicon, deelafbeelding, `robots.txt`, `sitemap.xml`, `_headers`. |
| `dev.mjs` | Lokale server met herbouwen bij wijzigingen. |
| `tests/controle.mjs` | Browsertest van de hele site (`npm test`). |
| `tests/voorbeeld/` | Nep-gegevens waarmee de test de kaart, openingstijden en SEO met domein controleert. Komt nooit online. |
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

## Vindbaarheid (SEO)

- Elke pagina heeft een eigen `<title>`, description, Open Graph-titel en precies één h1.
- Interne links zijn "schoon" (`contact` in plaats van `contact.html`).
- De homepage bevat gestructureerde gegevens (JSON-LD, type `BarOrPub`) met adres
  en socials, en telefoon, e-mail en openingstijden zodra die bekend zijn.
- **Bij livegang op het eigen domein:** zet in `src/site.json` `"url": "https://www.domein.nl"`
  en `"indexeren": true`. Dan komen er automatisch bij: canonical, `og:url`,
  `og:image` (de deelafbeelding `og-image.jpg`, 1200×630), `sitemap.xml` en de
  sitemapregel in `robots.txt`. Meld daarna de sitemap aan in Google Search Console.

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

## Privacy, cookies en toestemming

- **Privacyverklaring** (`/privacyverklaring`) en **cookieverklaring**
  (`/cookieverklaring`) staan gelinkt in de footer van elke pagina, en onder het
  contactformulier staat een korte privacyzin. De tekst staat één keer in het
  `<!--tekst-->`-blok van de pagina en verschijnt in beide ontwerpen.
- **Ontbrekende gegevens** staan als gele `[[AANLEVEREN: ...]]` in de pagina. De build
  weigert te bouwen met `"indexeren": true` zolang er nog zo'n markering in staat,
  zodat er geen halve privacyverklaring live gaat.
- **Algemene voorwaarden:** niet toegevoegd. De site verkoopt niets en sluit online
  geen overeenkomsten, dus ze zijn niet verplicht. Heeft het café voorwaarden voor
  zaalverhuur, dan kunnen die als eigen pagina erbij; die tekst moet van het café komen.
- **Cookies:** de site plaatst nu niets (geen cookies, geen localStorage, geen
  externe verzoeken; de test controleert dat). Daarom is er geen cookiemelding: die
  is alleen verplicht als er iets geplaatst wordt waarvoor toestemming nodig is.
- **Komt er iets bij** (statistieken, een YouTube-video, een Google Maps-kaart):
  1. Zet een categorie in `src/data/cookies.json`:
     ```json
     { "categorieen": [ { "id": "statistieken", "naam": "Statistieken",
       "uitleg": "Helpt ons zien welke pagina's bezocht worden.",
       "cookies": [ { "naam": "_ga", "aanbieder": "Google", "doel": "Telt bezoeken.", "bewaartermijn": "2 jaar" } ] } ] }
     ```
     De cookiemelding (weigeren en accepteren even groot, zelf kiezen per categorie)
     en de knop "Cookie-instellingen" in de footer verschijnen dan vanzelf, en de
     cookieverklaring toont de lijst.
  2. Zet de code die toestemming nodig heeft in de HTML binnen
     `<template data-toestemming="statistieken">...</template>`. Die wordt pas actief
     na een ja. Trekt iemand toestemming in, dan herlaadt de pagina zonder.
  3. Sta het domein van die dienst toe in de CSP in `build.mjs`, en vermeld de dienst
     in de privacyverklaring.
  De keuze staat in localStorage (`tijdloos-toestemming`). Verandert de lijst
  categorieën, dan vraagt de site opnieuw.

## Testen

```
npm run dev          # in een ander venster
npm test             # of: npm test -- https://jarinijhoff.github.io/cafe-tijdloos-site/
BROWSER=webkit npm test    # in Safari's engine; ook: firefox (eenmalig: npx playwright install webkit firefox)
```

Controleert alle pagina's op 1440, 1024, 768, 390 en 320 breed: JavaScript-fouten, kapotte
links en afbeeldingen, verzoeken naar andere domeinen, horizontaal scrollen, één h1,
kopniveaus, JSON-LD, noindex, "Naar de inhoud", lange streepjes in de tekst, opslag
in de browser zonder toestemming, de links naar privacy- en cookieverklaring, het mobiele menu, het formulier (leeg, zonder sleutel,
gelukt, mislukt, spam) en de 404-pagina. Daarna bouwt hij een tweede versie met de
nep-gegevens uit `tests/voorbeeld/` en test de kaartpagina, het openingsschema, de
badge op vaste tijdstippen (ook na middernacht), het verlopen evenement, telefoon- en
mailknoppen, canonical, sitemap, JSON-LD, de ingevulde privacyverklaring, de
cookiemelding (weigeren, zelf kiezen, intrekken, opnieuw vragen) en dat de build
weigert te indexeren met `[[AANLEVEREN]]` erin. Screenshots komen in `shots/`.

## Adressen

| Waar | Wat | Bijwerken |
|---|---|---|
| https://cafe-tijdloos.nextupsolutions.nl | **De preview voor de klant.** Cloudflare Pages-project `cafe-tijdloos` op het NextUp-account, net als `voorstel.nextupsolutions.nl`. | `npm run deploy` (bouwt en uploadt; wrangler moet ingelogd zijn op het NextUp-account) |
| https://jarinijhoff.github.io/cafe-tijdloos-site/ | Werk-URL op GitHub Pages. | Elke push naar `main`, vanzelf. |

Op Cloudflare komen ook de headers uit `_headers` mee (beveiliging en
`X-Robots-Tag: noindex`); GitHub Pages negeert die. Beide adressen staan op
noindex zolang `indexeren` in `src/site.json` uit staat.

`.github/workflows/deploy.yml` kan de Cloudflare-deploy ook vanuit GitHub doen, maar
heeft daarvoor de secret `CLOUDFLARE_API_TOKEN` (Cloudflare Pages: Edit) nodig. Die is
er nog niet; tot dan deploy je lokaal.

Repo: https://github.com/Jarinijhoff/cafe-tijdloos-site

De site gebruikt alleen relatieve paden en werkt daarom op een submap-URL
(`gebruiker.github.io/reponaam/`) en op een eigen domein. Alleen de 404-pagina heeft
het pad nodig (`BASIS` in de GitHub-workflow), omdat die op elk adres kan verschijnen.

Het oude project `cafe-tijdloos-preview.pages.dev` staat op een ander
Cloudflare-account en wordt niet meer gebruikt.

## Nog aan te leveren

Zie de lijst in `ONTBREEKT.md`.

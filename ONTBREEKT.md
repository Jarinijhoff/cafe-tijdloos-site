# Nog aan te leveren

Alles hieronder ontbrak in de mockup. Er is niets verzonnen: waar gegevens misten,
staat de huidige tekst er nog onveranderd. Zodra je iets aanlevert, kan het erin.

## 1. Telefoonnummer — blokkeert een `tel:`-link

Er staat nergens een telefoonnummer. Zodra het in `src/data/bedrijf.json` staat,
verschijnt er een belknop op de contactpagina en een `tel:`-link in de footer.

## 2. E-mailadres: blokkeert een `mailto:`-link én het contactformulier

Er staat nergens een e-mailadres. Gevolg:

- Geen `mailto:`-link.
- **Het contactformulier verstuurt nog niets.** De techniek is klaar (Web3Forms,
  met foutafhandeling en spamfilter), maar er is een access key nodig die aan het
  e-mailadres van het café hangt. Zodra die in `src/site.json` staat
  (`web3formsKey`), werkt het. Tot dan zegt het formulier eerlijk dat het bericht
  niet verstuurd is, in plaats van een nepbevestiging te tonen.

Dit is het belangrijkste punt van de lijst: nu kan een bezoeker die de zaal wil
boeken je alleen bereiken via Instagram, Facebook of door binnen te lopen.

## 3. Openingstijden

De site zegt nu "Zeven dagen per week open" en "Actuele tijden op Facebook". De
techniek is klaar: vul de tijden per dag in `src/data/bedrijf.json` in, dan
verschijnt het schema op de contactpagina en in de footer, en zegt de badge bovenin
live "Nu open" of "Nu gesloten" (ook na middernacht correct).

## 4. Adres controleren

Gebruikt: **Molenstraat 92, 4731 HH Oudenbosch**. De Google Maps-link wijst naar
dat adres. Even bevestigen dat postcode en huisnummer kloppen.

## 5. Social media bevestigen

Nu gelinkt (openen in een nieuw tabblad):

- Instagram: https://www.instagram.com/cafetijdloos/
- Facebook: https://www.facebook.com/p/Caf%C3%A9-Tijdloos-61582500281916/

De vier Instagramfoto's op de homepage zijn vaste afbeeldingen die naar vier
specifieke posts linken. Ze verversen niet vanzelf. Wil je dat wel, dan is daar een
koppeling voor nodig.

Ontbreekt er een kanaal (TikTok, WhatsApp)? Geef het door.

## 6. Evenement op de homepage

"Dag van de bruine kroeg, zaterdag 3 oktober" was in 2026 op 3 oktober en is dus
voorbij. Het blok staat nog in de bron, maar verdwijnt nu automatisch na die
datum en is daarom van de homepage af. Een nieuw evenement: zie README, kopje
"Inhoud aanpassen". Komt er vaker iets, dan is een agenda-pagina het overwegen
waard.

## 7. Menukaart / prijzen

Er staat nog niets over wat er te drinken of te eten is. De pagina **Kaart** is
klaar en verschijnt (met menulink) zodra er items in `src/data/kaart.json` staan.

## 8. Zaal huren: de praktische gegevens

De zaalpagina vertelt het verhaal maar noemt geen aantallen: hoeveel mensen passen
erin, wat kost het, wat is inbegrepen, hoe ver vooruit boeken. Dat is precies wat
iemand wil weten die de zaal overweegt.

## 9. Afbeeldingen: klein en laag van resolutie

Opgelost qua gewicht: de build zet alles om naar WebP, van 11 MB naar 0,95 MB.
De originelen in `images/` zijn niet aangeraakt.

Wat blijft: de meeste foto's zijn maar 450 tot 820 pixels breed (schermafbeeldingen
uit de design-tool). Op een groot scherm is dat zacht. De nieuwe aanlevering staat in
`fotos-aangeleverd/` (maximaal 1600px breed, de WhatsApp-foto's zijn door WhatsApp
verkleind). Voor de scherpste beelden: vraag de originele bestanden op.

## 10. Definitief webadres

De techniek staat klaar: `url` en `indexeren` in `src/site.json` zetten canonical,
`og:image`, sitemap en robots.txt aan. Daarna Google Search Console koppelen en de
sitemap aanmelden. Het Google Bedrijfsprofiel moet naar hetzelfde domein wijzen.

## 11. Juridisch

Geen privacyverklaring en geen cookiemelding. Google Fonts is vervangen door lokaal
gehoste lettertypen, dus de site maakt geen verbinding meer met Google en plaatst
geen cookies. Zodra het formulier echt verstuurt, is een privacyverklaring
verplicht (naam, contactgegevens en bericht gaan via Web3Forms naar het café).
Daarvoor nodig: de juridische naam van de onderneming, KvK-nummer, e-mailadres en
hoe lang berichten bewaard worden.

## 12. Hosting: de klant-URL kan niet bijgewerkt worden

`cafe-tijdloos-preview.pages.dev` staat op een ander Cloudflare-account
(`e2af251b…`) dan het account waarmee wrangler op deze laptop is ingelogd
(`jari.nijhoff@icloud.com`), en de GitHub-secret `CLOUDFLARE_API_TOKEN` is niet
ingesteld. Die URL toont daardoor nog de oude design-export, en is niet afgeschermd
voor zoekmachines. Oplossen: inloggen op dat account (`npx wrangler login`), of een
API-token van dat account als secret toevoegen. Tot die tijd is de werk-URL op
GitHub Pages de preview.

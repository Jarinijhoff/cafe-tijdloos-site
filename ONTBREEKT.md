# Nog aan te leveren

Alles hieronder ontbrak in de mockup. Er is niets verzonnen: waar gegevens misten,
staat de huidige tekst er nog onveranderd. Zodra je iets aanlevert, kan het erin.

## 1. Telefoonnummer — blokkeert een `tel:`-link

Er staat nergens een telefoonnummer. Zodra het in `src/data/bedrijf.json` staat,
verschijnt er een belknop op de contactpagina en een `tel:`-link in de footer.

## 2. Contactformulier: access key nodig

E-mailadres staat erin (ricksuijkerbuijk@icloud.com): mailknop op de contactpagina,
link in de footer en contactadres in de privacyverklaring.

**Het formulier verstuurt nog niets.** Ga naar https://web3forms.com, vul
ricksuijkerbuijk@icloud.com in en klik op "Create Access Key". De sleutel komt per
mail. Zet die in `src/site.json` bij `web3formsKey` (of stuur hem door). Lees eerst
punt 11 over Web3Forms en de AVG.

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

De privacyverklaring en cookieverklaring staan online en gelinkt in de footer.
Bewaartermijn van berichten: tot een jaar na het laatste contact (ingevuld).
Op de preview staan nog gele `[[AANLEVEREN]]`-markeringen voor:


Te bevestigen: de hostingpartij staat als **Cloudflare** in de verklaring (zo staat
de deploy ingesteld). Wordt het iets anders, pas dan `src/data/juridisch.json` aan.

**Let op, Web3Forms:** volgens hun eigen FAQ bewaren ze geen inzendingen en wissen
ze serverlogs elke twee maanden, maar het bedrijf zit in India en de servers staan
in de VS. Berichten gaan dus buiten de EU. Een verwerkersovereenkomst noemen ze in
hun FAQ niet; hun privacypagina was niet op te halen. Dat staat eerlijk in de privacyverklaring, maar voor
een strikt AVG-proof oplossing is een Europese formulierdienst met
verwerkersovereenkomst beter. Beslissing voor het café, vóór livegang.

Algemene voorwaarden: niet nodig voor deze site (er wordt niets online verkocht).
Heeft het café voorwaarden voor zaalverhuur, lever die dan aan.

## 12. Hosting

Opgelost: de preview staat nu op https://cafe-tijdloos.nextupsolutions.nl
(Cloudflare Pages-project `cafe-tijdloos` op het NextUp-account).

Nog open: het oude project `cafe-tijdloos-preview.pages.dev` staat op een ander
Cloudflare-account en toont de oude design-export, zonder noindex. Wie bij dat
account kan, verwijdert het project of zet er een doorverwijzing op.

# Nog aan te leveren

Alles hieronder ontbrak in de mockup. Er is niets verzonnen: waar gegevens misten,
staat de huidige tekst er nog onveranderd. Zodra je iets aanlevert, kan het erin.

## 1. Telefoonnummer — blokkeert een `tel:`-link

Er staat nergens een telefoonnummer. Daardoor is er geen `tel:`-link op de site.
Zodra het nummer er is, komt het in het kopmenu (mobiel), op de contactpagina en in
de footer.

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
badge in het kopmenu zei altijd "Open", ook midden in de nacht; die zegt nu
"7 dagen open". Lever je echte openingstijden per dag aan, dan kan er een normale
tijdentabel komen en kan de badge kloppen met de klok.

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

"Dag van de bruine kroeg — zaterdag 3 oktober" staat vast in de homepage. Er staat
geen jaartal bij. Is dit eenmalig, dan moet het na afloop weg; komt er vaker iets,
dan is een simpele agenda handiger dan losse secties.

## 7. Menukaart / prijzen

Er staat niets over wat er te drinken of te eten is. Als dat op de site moet, is er
tekst nodig (en eventueel een pagina "Kaart").

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

Nodig voor het laatste stukje vindbaarheid: `og:image` (de afbeelding bij het delen
van een link in WhatsApp of Facebook), `canonical` en een sitemap. Die drie hebben
een vast domein nodig en staan er daarom nog niet in.

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

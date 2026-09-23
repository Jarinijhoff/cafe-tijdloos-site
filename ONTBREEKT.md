# Nog aan te leveren

Alles hieronder ontbrak in de mockup. Er is niets verzonnen: waar gegevens misten,
staat de huidige tekst er nog onveranderd. Zodra je iets aanlevert, kan het erin.

## 1. Telefoonnummer — blokkeert een `tel:`-link

Er staat nergens een telefoonnummer. Daardoor is er geen `tel:`-link op de site.
Zodra het nummer er is, komt het in het kopmenu (mobiel), op de contactpagina en in
de footer.

## 2. E-mailadres — blokkeert een `mailto:`-link én het contactformulier

Er staat nergens een e-mailadres. Gevolg:

- Geen `mailto:`-link.
- **Het contactformulier verstuurt nog niets.** Het controleert de invoer en toont
  de bevestiging, maar er gaat geen bericht de deur uit. Dat is met opzet zichtbaar
  gemaakt in `src/assets/site.js`: zet `FORMULIER_ENDPOINT` op het adres van een
  formulierdienst (Formspree, Cloudflare Pages Function, of wat de hosting biedt)
  en het werkt meteen.

Dit is het belangrijkste punt van de lijst: nu kan een bezoeker die de zaal wil
boeken je alleen bereiken via Instagram, Facebook of door binnen te lopen.

## 3. Openingstijden

De site zegt nu "Zeven dagen per week open" en "Actuele tijden op Facebook". De
badge "Open" in het kopmenu staat er altijd, ongeacht het tijdstip. Lever je echte
openingstijden per dag aan, dan kan er een normale tijdentabel komen — en kan die
badge kloppen met de klok.

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

## 9. Afbeeldingen zijn zwaar

Samen ruim 11 MB; `gevel.png` is 2,5 MB en `logo.png` 1,5 MB. Ze zijn bewust niet
aangeraakt, want dat verandert het beeldmateriaal. Op een mobiele verbinding is dat
merkbaar traag. Aanbevolen: dezelfde foto's als geoptimaliseerde JPEG/WebP, en een
klein logo (bijv. 200px breed) voor het menu en als favicon.

## 10. Definitief webadres

Nodig voor het laatste stukje vindbaarheid: `og:image` (de afbeelding bij het delen
van een link in WhatsApp of Facebook), `canonical` en een sitemap. Die drie hebben
een vast domein nodig en staan er daarom nog niet in.

## 11. Juridisch

Geen privacyverklaring en geen cookiemelding. De site zet zelf geen cookies en meet
niets, dus een melding is nu niet nodig — maar zodra het formulier echt gegevens
verstuurt of er statistieken bij komen, is een privacyverklaring verplicht.

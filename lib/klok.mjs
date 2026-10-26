// De klok in het logo wijst de echte tijd aan.
//
// images/logo-zonder-wijzers.png is het logo met de getekende wijzers
// weggepoetst (gemaakt uit logo.png). Daaroverheen ligt een SVG met drie
// wijzers. site.js zet ze bij het laden één keer op de tijd in Nederland;
// daarna laat CSS-animatie ze lopen (styles.css, .logo-klok). Zonder
// JavaScript staan ze stil op dezelfde tijd als in het originele logo.
//
// De wijzerplaat staat in perspectief. De wijzers worden getekend op een
// cirkel met straal 1 (12 uur = omhoog) en met een matrix naar de scheve
// wijzerplaat gezet. De matrix is gemeten aan de acht grote streepjes van de
// wijzerplaat: hoeken kloppen tot op 1,6 graad.

const AS = [1323, 351]; // het asgaatje, in pixels van logo.png (1774 x 887)
const MATRIX = [275.32, -32.29, -41.84, 274.45]; // a b c d van SVG matrix()

// Het zichtbare deel van de wijzerplaat: binnen de ring, zonder de letters
// "l" en "oos" die ervoor staan. Daarbuiten worden de wijzers afgeknipt, zodat
// een wijzer die naar beneden wijst achter de letters verdwijnt, net als in
// het echte logo. Uitgerekend uit logo-zonder-wijzers.png.
const ZICHTBAAR = "M1396 82L1456 86L1502 100L1542 124L1574 156L1600 200L1614 248L1616 318L1610 354L1590 414L1562 466L1524 516L1480 558L1442 556L1394 572L1366 596L1350 626L1338 630L1334 630L1320 598L1298 576L1280 566L1240 556L1204 558L1162 574L1140 594L1130 586L1106 558L1106 416L1100 408L1094 408L1068 428L1072 374L1088 320L1112 270L1148 218L1192 172L1246 132L1296 106L1344 90L1394 84Z";

// Hoeken (graden vanaf 12 uur) van de wijzers in het originele logo: 4:09:00.
export const STANDAARD = { uur: 124.5, minuut: 54, seconde: 0 };

// Eén keer per pagina, bovenaan de body. Niet in een verborgen weergave
// zetten: dan tekent de browser de verwijzingen ernaar ook niet.
export const KLOK_DEFS =
  `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>` +
  `<linearGradient id="klok-goud" x1="0" x2="1" y1="0" y2="0">` +
  `<stop offset="0" stop-color="#FBE59A" /><stop offset="0.5" stop-color="#E2B544" /><stop offset="1" stop-color="#A9781F" />` +
  `</linearGradient>` +
  `<clipPath id="klok-vlak" clipPathUnits="userSpaceOnUse"><path d="${ZICHTBAAR}" /></clipPath>` +
  `</defs></svg>`;

// groot: voor een logo dat groot in beeld staat (de 404); de build maakt
// daar een scherpere versie van, die alleen op die pagina geladen wordt.
export function klokLogo(stijl, groot = false) {
  const g = (soort, vorm) =>
    `<g class="klok-${soort}" transform="rotate(${STANDAARD[soort]})">${vorm}</g>`;
  return `<span class="logo-klok" style="${stijl}">` +
    `<img src="images/logo-zonder-wijzers${groot ? "-groot" : ""}.png" alt="Café Tijdloos" style="height:100%;width:auto;display:block" />` +
    `<svg viewBox="0 0 1774 887" aria-hidden="true" focusable="false"><g clip-path="url(#klok-vlak)">` +
    `<g transform="translate(${AS[0]} ${AS[1]}) matrix(${MATRIX.join(" ")} 0 0)" fill="url(#klok-goud)">` +
    g("uur", `<polygon points="-0.04,0.09 -0.026,-0.3 0,-0.5 0.026,-0.3 0.04,0.09" /><circle cy="0.14" r="0.05" />`) +
    g("minuut", `<polygon points="-0.03,0.15 -0.018,-0.45 0,-0.79 0.018,-0.45 0.03,0.15" />`) +
    g("seconde", `<rect x="-0.009" y="-0.8" width="0.018" height="1" /><circle cy="0.17" r="0.03" />`) +
    `<circle r="0.055" /><circle r="0.02" fill="#1A120A" />` +
    `</g></g></svg></span>`;
}

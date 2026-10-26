/* Café Tijdloos — gedrag van de site.
   Weergavewissel, mobiel menu, contactformulier, openingsbadge, verlopen evenementen
   en cookietoestemming. */
(function () {
  'use strict';

  /* Het formulier verstuurt via Web3Forms (de mail gaat naar het adres dat bij de
     sleutel hoort). De sleutel staat in src/site.json en komt bij het bouwen in
     een verborgen veld. Zonder sleutel zegt het formulier eerlijk dat er niets
     verstuurd is, in plaats van een bevestiging te tonen. */
  var FORMULIER_ENDPOINT = 'https://api.web3forms.com/submit';
  var TIJDSLIMIET_MS = 15000;

  var MOBIEL_QUERY = '(max-width: 767px)';

  /* ------------------------------------------------------------------
     Weergave: de CSS bepaalt wat je ziet, hier zetten we `hidden` op de
     weergave die niet aan de beurt is. Anders leest een schermlezer beide
     versies voor en staan er twee keer dezelfde koppen in de pagina.
     ------------------------------------------------------------------ */
  var menuKnop = document.getElementById('menu-knop');
  var menu = document.getElementById('mobiel-menu');
  var desktopView = document.querySelector('[data-view="desktop"]');
  var mobielView = document.querySelector('[data-view="mobile"]');
  var mq = window.matchMedia(MOBIEL_QUERY);

  var overslaan = document.querySelector('.skip-link');

  function pasWeergaveAan() {
    var mobiel = mq.matches;
    if (desktopView) desktopView.hidden = mobiel;
    if (mobielView) mobielView.hidden = !mobiel;
    // "Naar de inhoud" moet naar de inhoud van de zichtbare weergave springen.
    if (overslaan) overslaan.setAttribute('href', mobiel ? '#inhoud-mobiel' : '#inhoud');
    if (!mobiel) sluitMenu();
  }

  if (mq.addEventListener) mq.addEventListener('change', pasWeergaveAan);
  else if (mq.addListener) mq.addListener(pasWeergaveAan);
  pasWeergaveAan();

  /* ------------------------------------------------------------------
     Mobiel menu
     ------------------------------------------------------------------ */
  function sluitMenu() {
    if (!menu || !menuKnop) return;
    menu.hidden = true;
    menuKnop.setAttribute('aria-expanded', 'false');
  }

  function openMenu() {
    if (!menu || !menuKnop) return;
    menu.hidden = false;
    menuKnop.setAttribute('aria-expanded', 'true');
  }

  if (menuKnop && menu) {
    menuKnop.addEventListener('click', function (e) {
      e.stopPropagation();
      if (menu.hidden) openMenu();
      else sluitMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) {
        sluitMenu();
        menuKnop.focus();
      }
    });

    document.addEventListener('click', function (e) {
      if (menu.hidden) return;
      if (menu.contains(e.target) || menuKnop.contains(e.target)) return;
      sluitMenu();
    });
  }

  /* ------------------------------------------------------------------
     Contactformulier: validatie en bevestiging
     ------------------------------------------------------------------ */
  var EMAIL = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

  function isTelefoon(waarde) {
    var cijfers = waarde.replace(/[\s\-().]/g, '');
    return /^\+?[0-9]{9,15}$/.test(cijfers);
  }

  function controleer(veld) {
    var waarde = veld.value.trim();
    var naam = veld.getAttribute('name');

    if (!waarde) {
      if (naam === 'naam') return 'Vul je naam in.';
      if (naam === 'contact') return 'Vul een e-mailadres of telefoonnummer in.';
      if (naam === 'bericht') return 'Laat even weten waar het over gaat.';
      return 'Dit veld is verplicht.';
    }
    if (naam === 'naam' && waarde.length < 2) {
      return 'Vul je naam in.';
    }
    if (naam === 'contact' && !EMAIL.test(waarde) && !isTelefoon(waarde)) {
      return 'Dit lijkt geen geldig e-mailadres of telefoonnummer.';
    }
    if (naam === 'bericht' && waarde.length < 10) {
      return 'Schrijf iets meer, dan kan Rick je beter helpen.';
    }
    return '';
  }

  function toonFout(veld, tekst) {
    var doel = veld.getAttribute('aria-describedby');
    var melding = doel ? document.getElementById(doel) : null;
    if (tekst) {
      veld.classList.add('is-fout');
      veld.setAttribute('aria-invalid', 'true');
      if (melding) {
        melding.textContent = tekst;
        melding.hidden = false;
      }
    } else {
      veld.classList.remove('is-fout');
      veld.removeAttribute('aria-invalid');
      if (melding) {
        melding.textContent = '';
        melding.hidden = true;
      }
    }
  }

  function koppelFormulier(formulier) {
    // De browser laat zijn eigen meldingen achterwege zodra JavaScript het overneemt.
    // Staat JavaScript uit, dan blijft de ingebouwde controle van required gewoon werken.
    formulier.noValidate = true;

    var velden = [].slice.call(formulier.querySelectorAll('[required]'));
    var status = formulier.querySelector('[data-bevestiging]');
    if (status) status.setAttribute('data-bevestiging', status.textContent.trim());

    velden.forEach(function (veld) {
      veld.addEventListener('blur', function () {
        toonFout(veld, controleer(veld));
      });
      veld.addEventListener('input', function () {
        if (veld.classList.contains('is-fout')) toonFout(veld, controleer(veld));
      });
    });

    formulier.addEventListener('submit', function (e) {
      e.preventDefault();
      if (status) status.hidden = true;
      if (formulier.getAttribute('aria-busy') === 'true') return;

      var eersteFout = null;
      velden.forEach(function (veld) {
        var fout = controleer(veld);
        toonFout(veld, fout);
        if (fout && !eersteFout) eersteFout = veld;
      });

      if (eersteFout) {
        eersteFout.focus();
        return;
      }

      // Honeypot aangevinkt: vrijwel zeker een bot. Doe alsof het gelukt is.
      var honeypot = formulier.querySelector('[name="botcheck"]');
      if (honeypot && honeypot.checked) {
        formulier.reset();
        meld(status, status.getAttribute('data-bevestiging'), 'ok');
        return;
      }

      var sleutelVeld = formulier.querySelector('[name="access_key"]');
      if (!sleutelVeld || !sleutelVeld.value.trim()) {
        meld(status, 'Dit formulier is nog niet gekoppeld, dus je bericht is niet verstuurd. Loop gerust binnen of stuur een bericht via Instagram of Facebook.', 'fout');
        return;
      }

      if (navigator.onLine === false) {
        meld(status, 'Je bent offline. Controleer je verbinding en probeer het opnieuw.', 'fout');
        return;
      }

      verstuur(formulier, status);
    });
  }

  function verstuur(formulier, status) {
    var knop = formulier.querySelector('button[type="submit"]');
    var knopTekst = knop ? knop.textContent : '';
    if (knop) {
      knop.disabled = true;
      knop.textContent = 'Bezig met versturen…';
    }
    formulier.setAttribute('aria-busy', 'true');

    var gegevens = new FormData(formulier);
    var onderwerp = formulier.querySelector('[name="onderwerp"]');
    var label = onderwerp && onderwerp.selectedIndex > -1 ? onderwerp.options[onderwerp.selectedIndex].text : 'Bericht';
    gegevens.append('subject', 'Website: ' + label);
    // Is het contactveld een e-mailadres, dan kan Rick direct op de mail antwoorden.
    var contact = String(gegevens.get('contact') || '').trim();
    if (EMAIL.test(contact)) gegevens.append('email', contact);

    var stop = typeof AbortController === 'function' ? new AbortController() : null;
    var wekker = stop ? setTimeout(function () { stop.abort(); }, TIJDSLIMIET_MS) : null;

    fetch(FORMULIER_ENDPOINT, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: gegevens,
      signal: stop ? stop.signal : undefined
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (!res.ok || !data.success) throw new Error(data.message || 'Verzenden mislukt');
        });
      })
      .then(function () {
        formulier.reset();
        meld(status, status.getAttribute('data-bevestiging'), 'ok');
      })
      .catch(function () {
        meld(status, 'Versturen is niet gelukt. Probeer het later nog eens of loop even binnen.', 'fout');
      })
      .then(function () {
        if (wekker) clearTimeout(wekker);
        formulier.removeAttribute('aria-busy');
        if (knop) {
          knop.disabled = false;
          knop.textContent = knopTekst;
        }
      });
  }

  function meld(status, tekst, soort) {
    if (!status) return;
    status.textContent = tekst;
    status.classList.toggle('is-fout', soort === 'fout');
    status.hidden = false;
    status.focus();
  }

  [].slice.call(document.querySelectorAll('.contactformulier')).forEach(koppelFormulier);

  /* ------------------------------------------------------------------
     Tijd in Nederland, los van de tijdzone van de bezoeker
     ------------------------------------------------------------------ */
  var DAGEN = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];

  function nuInNederland() {
    var delen = {};
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short'
    }).formatToParts(new Date()).forEach(function (d) { delen[d.type] = d.value; });
    var dagIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(delen.weekday);
    return {
      datum: delen.year + '-' + delen.month + '-' + delen.day,
      dag: dagIndex,
      minuten: Number(delen.hour) * 60 + Number(delen.minute)
    };
  }

  function minuten(tijd) {
    var d = tijd.split(':');
    return Number(d[0]) * 60 + Number(d[1]);
  }

  /* ------------------------------------------------------------------
     Badge "Nu open" / "Nu gesloten"
     Alleen als de openingstijden in src/data/bedrijf.json staan; anders blijft
     de vaste tekst staan. Een sluittijd vóór de openingstijd loopt door na
     middernacht, dus ook de avond van gisteren telt mee.
     ------------------------------------------------------------------ */
  function isOpen(tijden, nu) {
    var vandaag = tijden[DAGEN[nu.dag]];
    var gisteren = tijden[DAGEN[(nu.dag + 6) % 7]];
    if (vandaag && typeof vandaag === 'object') {
      var open = minuten(vandaag.open), dicht = minuten(vandaag.dicht);
      if (dicht > open ? nu.minuten >= open && nu.minuten < dicht : nu.minuten >= open) return true;
    }
    if (gisteren && typeof gisteren === 'object') {
      var gOpen = minuten(gisteren.open), gDicht = minuten(gisteren.dicht);
      if (gDicht <= gOpen && nu.minuten < gDicht) return true;
    }
    return false;
  }

  function werkBadgesBij() {
    var nu = nuInNederland();
    [].slice.call(document.querySelectorAll('[data-openingstijden]')).forEach(function (badge) {
      try {
        badge.textContent = isOpen(JSON.parse(badge.getAttribute('data-openingstijden')), nu) ? 'Nu open' : 'Nu gesloten';
      } catch (e) { /* vaste tekst laten staan */ }
    });
  }
  werkBadgesBij();
  setInterval(werkBadgesBij, 60000);

  /* ------------------------------------------------------------------
     Klok in het logo: één keer de tijd van nu instellen, CSS doet de rest.
     Een negatieve animation-delay laat de animatie "al zo lang" lopen, dus
     de wijzer begint precies op de juiste plek.
     ------------------------------------------------------------------ */
  var klokken = [].slice.call(document.querySelectorAll('.logo-klok'));
  if (klokken.length) {
    var nu = nuInNederland();
    var sec = new Date().getSeconds() + new Date().getMilliseconds() / 1000;
    var minSec = (nu.minuten % 60) * 60 + sec;
    var uurSec = (Math.floor(nu.minuten / 60) % 12) * 3600 + minSec;
    klokken.forEach(function (klok) {
      klok.style.setProperty('--klok-seconde', -sec + 's');
      klok.style.setProperty('--klok-minuut', -minSec + 's');
      klok.style.setProperty('--klok-uur', -uurSec + 's');
      klok.classList.add('loopt');
    });
  }

  /* ------------------------------------------------------------------
     Evenementen verbergen na hun datum (<!--tot JJJJ-MM-DD--> in de bron)
     ------------------------------------------------------------------ */
  var vandaagNL = nuInNederland().datum;
  [].slice.call(document.querySelectorAll('[data-tonen-tot]')).forEach(function (blok) {
    if (blok.getAttribute('data-tonen-tot') < vandaagNL) blok.hidden = true;
  });

  /* ------------------------------------------------------------------
     Onderwerp vooraf invullen: contact.html?onderwerp=zaal
     ------------------------------------------------------------------ */
  var onderwerp = new URLSearchParams(window.location.search).get('onderwerp');
  if (onderwerp) {
    [].slice.call(document.querySelectorAll('select[name="onderwerp"]')).forEach(function (select) {
      var bestaat = [].slice.call(select.options).some(function (o) { return o.value === onderwerp; });
      if (bestaat) select.value = onderwerp;
    });
  }
  /* ------------------------------------------------------------------
     Cookietoestemming
     De melding staat alleen in de pagina als src/data/cookies.json
     categorieën bevat. Wat toestemming nodig heeft, zet je in de HTML in
     <template data-toestemming="statistieken">...</template>: dat wordt pas
     actief na een ja. De keuze staat in localStorage; verandert de lijst
     categorieën, dan vragen we opnieuw.
     ------------------------------------------------------------------ */
  var SLEUTEL = 'tijdloos-toestemming';
  var melding = document.getElementById('cookiemelding');

  function leesKeuze(versie) {
    try {
      var keuze = JSON.parse(localStorage.getItem(SLEUTEL));
      return keuze && keuze.versie === versie && keuze.keuzes ? keuze.keuzes : null;
    } catch (e) {
      return null;
    }
  }

  // Een <script> uit een template voert de browser niet uit; daarom maken we
  // er een nieuwe van.
  function activeer(template) {
    var inhoud = template.content.cloneNode(true);
    [].slice.call(inhoud.querySelectorAll('script')).forEach(function (oud) {
      var nieuw = document.createElement('script');
      [].slice.call(oud.attributes).forEach(function (a) { nieuw.setAttribute(a.name, a.value); });
      nieuw.textContent = oud.textContent;
      oud.parentNode.replaceChild(nieuw, oud);
    });
    template.parentNode.insertBefore(inhoud, template.nextSibling);
    template.setAttribute('data-actief', '');
  }

  function pasToe(keuzes) {
    var aan = Object.keys(keuzes).filter(function (k) { return keuzes[k] === true; });
    document.documentElement.setAttribute('data-toestemming', aan.join(' '));
    [].slice.call(document.querySelectorAll('template[data-toestemming]:not([data-actief])')).forEach(function (t) {
      if (keuzes[t.getAttribute('data-toestemming')] === true) activeer(t);
    });
  }

  if (melding) {
    var versie = melding.getAttribute('data-versie');
    var vakjes = [].slice.call(melding.querySelectorAll('.cookie-keuze input'));
    var keuzeVak = melding.querySelector('.cookiemelding-keuzes');
    var knop = function (naam) { return melding.querySelector('[data-cookie="' + naam + '"]'); };
    var huidig = leesKeuze(versie);

    var toonKeuzes = function (zichtbaar) {
      keuzeVak.hidden = !zichtbaar;
      knop('kiezen').hidden = zichtbaar;
      knop('opslaan').hidden = !zichtbaar;
    };

    var openMelding = function (metKeuzes) {
      vakjes.forEach(function (v) { v.checked = !!(huidig && huidig[v.value]); });
      toonKeuzes(metKeuzes);
      melding.hidden = false;
      if (metKeuzes && vakjes[0]) vakjes[0].focus();
    };

    var bewaar = function (keuzes) {
      // Iets ingetrokken wat al actief was: alleen herladen haalt het weer weg.
      var ingetrokken = huidig && Object.keys(huidig).some(function (k) { return huidig[k] && !keuzes[k]; });
      try {
        localStorage.setItem(SLEUTEL, JSON.stringify({ versie: versie, keuzes: keuzes, datum: new Date().toISOString() }));
      } catch (e) { /* opslaan geblokkeerd: de keuze geldt dan alleen voor deze pagina */ }
      huidig = keuzes;
      melding.hidden = true;
      if (ingetrokken) window.location.reload();
      else pasToe(keuzes);
    };

    var alles = function (waarde) {
      var keuzes = {};
      vakjes.forEach(function (v) { keuzes[v.value] = waarde; });
      return keuzes;
    };

    knop('weigeren').addEventListener('click', function () { bewaar(alles(false)); });
    knop('accepteren').addEventListener('click', function () { bewaar(alles(true)); });
    knop('kiezen').addEventListener('click', function () { toonKeuzes(true); if (vakjes[0]) vakjes[0].focus(); });
    knop('opslaan').addEventListener('click', function () {
      var keuzes = {};
      vakjes.forEach(function (v) { keuzes[v.value] = v.checked; });
      bewaar(keuzes);
    });

    [].slice.call(document.querySelectorAll('[data-cookie-instellingen]')).forEach(function (k) {
      k.addEventListener('click', function () { openMelding(true); });
    });

    if (huidig) pasToe(huidig);
    else openMelding(false);
  }
})();

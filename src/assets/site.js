/* Café Tijdloos — gedrag van de site.
   Drie dingen: welke weergave actief is, het mobiele menu en het contactformulier. */
(function () {
  'use strict';

  /* Zet hier het adres van de formulierverwerker zodra die er is (bijv. Formspree,
     een Cloudflare Pages Function of het mailadres-endpoint van de hosting).
     Zolang dit null is wordt het bericht niet verstuurd: het formulier controleert
     de invoer en toont de bevestiging, maar er gaat nog niets de deur uit. */
  var FORMULIER_ENDPOINT = null;

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

  function pasWeergaveAan() {
    var mobiel = mq.matches;
    if (desktopView) desktopView.hidden = mobiel;
    if (mobielView) mobielView.hidden = !mobiel;
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
    var bevestiging = formulier.querySelector('[data-bevestiging]');

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
      if (bevestiging) bevestiging.hidden = true;

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

      if (!FORMULIER_ENDPOINT) {
        bevestig(formulier, bevestiging);
        return;
      }

      var knop = formulier.querySelector('button[type="submit"]');
      if (knop) knop.disabled = true;

      fetch(FORMULIER_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(formulier)
      })
        .then(function (res) {
          if (!res.ok) throw new Error('Verzenden mislukt');
          bevestig(formulier, bevestiging);
        })
        .catch(function () {
          var contactveld = formulier.querySelector('[name="contact"]');
          if (contactveld) {
            toonFout(contactveld, 'Verzenden lukte niet. Probeer het later opnieuw of loop even binnen.');
          }
        })
        .then(function () {
          if (knop) knop.disabled = false;
        });
    });
  }

  function bevestig(formulier, bevestiging) {
    formulier.reset();
    if (!bevestiging) return;
    bevestiging.hidden = false;
    bevestiging.focus();
  }

  [].slice.call(document.querySelectorAll('.contactformulier')).forEach(koppelFormulier);

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
})();

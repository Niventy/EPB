/* =====================================================================
   EPB — Landing Page — interactions
   - Validation + soumission formulaire (statique, prêt à brancher)
   - Accordéon FAQ
   - Reveal au scroll
   - Hooks tracking conversions (Google Ads / Meta Pixel)
   ===================================================================== */
(function () {
  "use strict";

  /* Webhook Make : reçoit le lead du formulaire → écrit la ligne dans Google Sheets.
     Laissez vide = simulation d'envoi. */
  var FORM_ENDPOINT = "https://hook.eu1.make.com/7l54peh1yrld6tpmqyyqhk5k60yovi9k";

  /* Pop-up de confirmation d'appel (voir 2b) : offre, mention et horaires. */
  var MONTANT_OFFERT = "200 €";   // espace insécable : évite « 200 » / « € » sur 2 lignes
  var TEXTE_BADGE = "Toutes assurances possibles";
  var TEXTE_VIREMENT = MONTANT_OFFERT + " offerts en virement instantané";
  var TEXTE_CADEAU = "Ou un cadeau au choix d’une valeur de " + MONTANT_OFFERT;
  var MENTION_LEGALE = "*Sous réserve de prise en charge bris de glace par votre assurance. Offre non cumulable, voir conditions en centre.";
  /* Horaires d'ouverture, heure de Paris. Index 0 = dimanche. null = fermé. */
  var HORAIRES = [
    null,                 // dimanche
    ["09:00", "19:00"],   // lundi
    ["09:00", "19:00"],   // mardi
    ["09:00", "19:00"],   // mercredi
    ["09:00", "19:00"],   // jeudi
    ["09:00", "19:00"],   // vendredi
    ["09:00", "12:00"]    // samedi
  ];
  /* Liens tel: qui ouvrent la pop-up au lieu d'appeler directement. */
  var CALL_CONFIRM_SELECTOR = ".sticky-cta-btn, .header__phone";

  /* ----------------------------------------------------------------
     0. TRACKING — aligné sur le conteneur GTM existant (GTM-PKK297FZ)
        Conversions Google Ads déjà configurées (compte AW-18038306554) :
        - APPEL    : déclencheur GTM « clic appel » (Liens uniquement) → capte
                     directement les clics sur les liens tel:. Rien à pousser.
        - FORMULAIRE : conversion « prise de rdv envoyé », déclenchée par
                     l'évènement personnalisé  form_rdv_success.
        => On pousse cet évènement à la soumission réussie du formulaire.
  ---------------------------------------------------------------- */

  /** Déclenche la conversion. type = 'call' (appel) | 'lead' (formulaire) */
  function fireConversion(type) {
    try {
      if (type === "lead") {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: "form_rdv_success" });
      }
      // 'call' : aucune action ici — le déclencheur GTM « clic appel »
      //          (Liens uniquement) capte directement les liens tel:.
    } catch (e) { /* tracking non bloquant */ }
  }

  /* ----------------------------------------------------------------
     0b. ATTRIBUTION — capture gclid / UTM dans les champs cachés du formulaire
         (permet l'import des conversions hors-ligne + l'attribution Google Ads)
  ---------------------------------------------------------------- */
  function initAttribution() {
    try {
      var params = new URLSearchParams(window.location.search);
      var keys = ["gclid", "gbraid", "wbraid", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
      keys.forEach(function (k) {
        var fromUrl = params.get(k);
        if (fromUrl) { try { sessionStorage.setItem("epb_" + k, fromUrl); } catch (e) {} }
        var value = fromUrl || (function () { try { return sessionStorage.getItem("epb_" + k); } catch (e) { return null; } })();
        if (value) {
          document.querySelectorAll('input[name="' + k + '"]').forEach(function (inp) { inp.value = value; });
        }
      });
    } catch (e) { /* non bloquant */ }
  }

  /* ----------------------------------------------------------------
     1. FORMULAIRE
  ---------------------------------------------------------------- */
  var PHONE_RE = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.\-]*\d{2}){4}$/;

  function validateField(field) {
    var value = (field.value || "").trim();
    var valid = true;
    if (field.hasAttribute("required") && !value) valid = false;
    if (valid && field.dataset.validate === "phone") valid = PHONE_RE.test(value);
    if (valid && field.type === "email" && value) valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    field.classList.toggle("invalid", !valid);
    return valid;
  }

  function initForm(form) {
    if (!form) return;
    var fields = form.querySelectorAll(".form-control[required], .form-control[data-validate]");

    // validation à la volée après une 1re erreur
    fields.forEach(function (f) {
      f.addEventListener("blur", function () { validateField(f); });
      f.addEventListener("input", function () { if (f.classList.contains("invalid")) validateField(f); });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      fields.forEach(function (f) { if (!validateField(f)) ok = false; });
      if (!ok) {
        var first = form.querySelector(".form-control.invalid");
        if (first) first.focus();
        return;
      }

      var btn = form.querySelector('button[type="submit"]');
      var original = btn ? btn.innerHTML : "";
      if (btn) { btn.disabled = true; btn.innerHTML = "Envoi en cours…"; }

      /* ----- ENVOI DU LEAD -----------------------------------------
         POST vers le Web App Google Apps Script (enregistre le lead dans
         Google Sheets + envoie l'email de notification). Voir README.
         mode:'no-cors' + FormData = requête « simple » (pas de preflight CORS).
         Si FORM_ENDPOINT est vide : simulation d'un envoi réussi.
      --------------------------------------------------------------- */
      function done() {
        fireConversion("lead");         // conversion uniquement si envoi OK
        showSuccess(form);
        if (btn) { btn.disabled = false; btn.innerHTML = original; }
      }
      function fail() {
        if (btn) { btn.disabled = false; btn.innerHTML = original; }
        alert("Une erreur est survenue lors de l'envoi. Merci de nous appeler au 06 66 87 65 78.");
      }

      if (FORM_ENDPOINT) {
        fetch(FORM_ENDPOINT, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
          body: new URLSearchParams(new FormData(form)).toString()
        }).then(done).catch(fail);
      } else {
        setTimeout(done, 700); // simulation tant que FORM_ENDPOINT n'est pas configuré
      }
    });
  }

  function showSuccess(form) {
    var card = form.closest(".form-card") || form.parentElement;
    var success = card ? card.querySelector(".form-success") : null;
    if (success) {
      form.style.display = "none";
      success.classList.add("show");
      success.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      form.reset();
    }
  }

  /* ----------------------------------------------------------------
     2. APPELS TÉLÉPHONIQUES — tracking sur clic
  ---------------------------------------------------------------- */
  function initCallTracking() {
    document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
      a.addEventListener("click", function () { fireConversion("call"); });
    });
  }

  /* ----------------------------------------------------------------
     2b. CONFIRMATION D'APPEL — limite les taps accidentels sur les liens
         tel: les plus exposés (bouton flottant mobile, icône du header).
         Le tap est intercepté en capture sur window : l'écouteur GTM
         « clic appel » ne le voit pas. Le bouton « Appeler » de la pop-up
         est un vrai lien tel: → GTM ne compte que les appels confirmés.
         Textes de l'offre et horaires : constantes en haut du fichier.
  ---------------------------------------------------------------- */

  var JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

  /** "09:00" → "9h", "13:30" → "13h30" */
  function formatHeure(t) {
    var p = t.split(":");
    return parseInt(p[0], 10) + "h" + (p[1] === "00" ? "" : p[1]);
  }

  /** D'après HORAIRES et l'heure de Paris :
      { open: true }  ou  { open: false, when: "ce matin" | "demain" | "lundi"…, at: "9h" } */
  function openingStatus() {
    try {
      var p = {};
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Paris", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
      }).formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
      var day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
      var now = p.hour + ":" + p.minute;
      var slot = HORAIRES[day];
      if (slot && now >= slot[0] && now < slot[1]) return { open: true };
      if (slot && now < slot[0]) {   // avant l'ouverture du jour
        return { open: false, when: slot[0] < "12:00" ? "ce matin" : "aujourd’hui", at: formatHeure(slot[0]) };
      }
      for (var i = 1; i <= 7; i++) { // le soir, ou jour fermé : prochain jour ouvert
        var next = HORAIRES[(day + i) % 7];
        if (next) return { open: false, when: i === 1 ? "demain" : JOURS[(day + i) % 7], at: formatHeure(next[0]) };
      }
      return { open: false };
    } catch (e) { return { open: true }; } // en cas de doute, on propose l'appel
  }

  function initCallConfirm() {
    var modal, actions, callBtn, formBtn, cancelBtn, pitch, status, lastFocus;
    var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/></svg>';

    function build() {
      modal = document.createElement("div");
      modal.className = "call-modal";
      modal.hidden = true;
      modal.innerHTML =
        '<div class="call-modal__box" role="dialog" aria-modal="true" aria-labelledby="call-modal-title">' +
          '<span class="call-modal__badge">' + TEXTE_BADGE + '</span>' +
          '<h2 class="call-modal__title" id="call-modal-title">Virement instantané ou cadeau : vous choisissez</h2>' +
          '<ul class="call-modal__list">' +
            '<li>' + CHECK + TEXTE_VIREMENT + '*</li>' +
            '<li>' + CHECK + TEXTE_CADEAU + '*</li>' +
            '<li>' + CHECK + 'Prise en charge rapide, sans avance de frais</li>' +
          '</ul>' +
          '<p class="call-modal__pitch">Appelez-nous : un conseiller vous répond directement, sans plateforme.</p>' +
          '<p class="call-modal__status"><span class="call-modal__dot" aria-hidden="true"></span><span></span></p>' +
          '<div class="call-modal__actions">' +
            '<a class="btn call-modal__call" href="#">📞 Appeler un conseiller EPB+</a>' +
            '<button type="button" class="btn call-modal__form"></button>' +
          '</div>' +
          '<button type="button" class="call-modal__cancel">Annuler</button>' +
          '<p class="call-modal__legal">' + MENTION_LEGALE + '</p>' +
        '</div>';
      document.body.appendChild(modal);
      actions = modal.querySelector(".call-modal__actions");
      callBtn = modal.querySelector(".call-modal__call");
      formBtn = modal.querySelector(".call-modal__form");
      cancelBtn = modal.querySelector(".call-modal__cancel");
      pitch = modal.querySelector(".call-modal__pitch");
      status = modal.querySelector(".call-modal__status");

      modal.addEventListener("click", function (e) { if (e.target === modal) close(); });
      cancelBtn.addEventListener("click", close);
      callBtn.addEventListener("click", function () { close(); }); // laisse le tel: s'ouvrir
      formBtn.addEventListener("click", function () {
        close(false);
        var form = document.getElementById("lead-form-main");
        var target = form && (form.closest(".form-card") || form);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }

    function onKey(e) {
      if (e.key === "Escape") { close(); return; }
      if (e.key !== "Tab") return;
      // garde le focus dans la pop-up (ordre du DOM, qui change selon l'état ouvert/fermé)
      var items = Array.prototype.slice.call(actions.children).concat(cancelBtn);
      var i = items.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
    }

    function open(href, trigger) {
      if (!modal) build();
      lastFocus = trigger;
      callBtn.setAttribute("href", href);

      // Ouvert → Appeler en principal. Fermé → Être rappelé en principal.
      var st = openingStatus(), isOpen = st.open;
      status.classList.toggle("is-closed", !isOpen);
      status.lastChild.textContent = isOpen
        ? "Un conseiller est disponible maintenant"
        : st.when
          ? "Nous sommes fermés, on vous rappelle " + st.when + " dès " + st.at
          : "Nous sommes fermés, on vous rappelle dès l’ouverture";
      pitch.hidden = !isOpen;
      formBtn.textContent = isOpen ? "Je préfère être rappelé" : "Être rappelé" + (st.when ? " " + st.when : "");
      callBtn.className = "btn call-modal__call " + (isOpen ? "btn--cta" : "call-modal__alt");
      formBtn.className = "btn call-modal__form " + (isOpen ? "call-modal__alt" : "btn--cta");
      var primary = isOpen ? callBtn : formBtn;
      actions.insertBefore(primary, actions.firstChild);

      modal.hidden = false;
      document.documentElement.classList.add("call-modal-open");
      document.addEventListener("keydown", onKey);
      primary.focus({ preventScroll: true });
    }

    function close(restoreFocus) {
      if (!modal || modal.hidden) return;
      modal.hidden = true;
      document.documentElement.classList.remove("call-modal-open");
      document.removeEventListener("keydown", onKey);
      if (restoreFocus !== false && lastFocus) lastFocus.focus({ preventScroll: true });
    }

    window.addEventListener("click", function (e) {
      if (e.button !== 0 || !e.target.closest) return;
      var link = e.target.closest(CALL_CONFIRM_SELECTOR);
      if (!link) return;
      // href lu AU CLIC : le script Google de suivi d'appel peut l'avoir
      // remplacé par son numéro de transfert, c'est celui-là qu'il faut appeler.
      var href = link.getAttribute("href") || "";
      if (!/^tel:/i.test(href)) return;
      e.preventDefault();
      e.stopPropagation();
      open(href, link);
    }, true);
  }

  /* ----------------------------------------------------------------
     3. FAQ ACCORDÉON
  ---------------------------------------------------------------- */
  function initFaq() {
    document.querySelectorAll(".faq__item").forEach(function (item) {
      var q = item.querySelector(".faq__q");
      var a = item.querySelector(".faq__a");
      if (!q || !a) return;
      // ouvre l'item déjà marqué .open au chargement (ex. documents)
      if (item.classList.contains("open")) a.style.maxHeight = a.scrollHeight + "px";
      var group = item.closest("[data-accordion]") || document;
      q.addEventListener("click", function () {
        var isOpen = item.classList.contains("open");
        // fermer les autres du MÊME groupe uniquement
        group.querySelectorAll(".faq__item.open").forEach(function (other) {
          if (other !== item) { other.classList.remove("open"); other.querySelector(".faq__a").style.maxHeight = null; other.querySelector(".faq__q").setAttribute("aria-expanded", "false"); }
        });
        item.classList.toggle("open", !isOpen);
        q.setAttribute("aria-expanded", String(!isOpen));
        a.style.maxHeight = isOpen ? null : a.scrollHeight + "px";
      });
    });
  }

  /* ----------------------------------------------------------------
     4. REVEAL AU SCROLL
  ---------------------------------------------------------------- */
  function initReveal() {
    var els = document.querySelectorAll(".reveal");
    // Stagger : décalage progressif des éléments .reveal d'un même parent
    els.forEach(function (el) {
      var sibs = Array.prototype.filter.call(el.parentElement.children, function (c) { return c.classList.contains("reveal"); });
      var idx = sibs.indexOf(el);
      if (idx > 0) el.style.transitionDelay = Math.min(idx * 90, 360) + "ms";
    });
    if (!("IntersectionObserver" in window) || !els.length) {
      els.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("in"); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------------------------------------------------
     5. SMOOTH SCROLL pour les ancres CTA
  ---------------------------------------------------------------- */
  function initAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href");
        if (id.length < 2) return;
        var target = document.querySelector(id);
        if (target) { e.preventDefault(); target.scrollIntoView({ behavior: "smooth", block: "start" }); }
      });
    });
  }

  /* ----------------------------------------------------------------
     6. CARROUSEL BARRE DE CONFIANCE (mobile : 1 élément, défilement auto)
        Sur desktop, le CSS ignore .is-active (les 4 restent affichés).
  ---------------------------------------------------------------- */
  function initTrustCarousel() {
    var bar = document.querySelector(".trustbar .container");
    if (!bar) return;
    var items = bar.querySelectorAll(".trustbar__item");
    if (items.length < 2) return;
    var idx = 0;
    items.forEach(function (it, i) { it.classList.toggle("is-active", i === 0); });
    setInterval(function () {
      items[idx].classList.remove("is-active");
      idx = (idx + 1) % items.length;
      items[idx].classList.add("is-active");
    }, 2800);
  }

  /* ----------------------------------------------------------------
     INIT
  ---------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    initAttribution();
    document.querySelectorAll("form.lead-form").forEach(initForm);
    initCallTracking();
    initCallConfirm();
    initFaq();
    initReveal();
    initAnchors();
    initTrustCarousel();
    document.getElementById("year") && (document.getElementById("year").textContent = new Date().getFullYear());
  });
})();

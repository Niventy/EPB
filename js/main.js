/* =====================================================================
   EPB — Landing Page — interactions
   - Validation + soumission formulaire (statique, prêt à brancher)
   - Accordéon FAQ
   - Reveal au scroll
   - Hooks tracking conversions (Google Ads / Meta Pixel)
   ===================================================================== */
(function () {
  "use strict";

  /* ----------------------------------------------------------------
     0. CONFIG TRACKING — à compléter lors de la mise en ligne
     Renseignez vos identifiants puis dé-commentez dans index.html.
  ---------------------------------------------------------------- */
  var TRACKING = {
    googleAdsConversion: "AW-XXXXXXXXX/XXXXXXXXXXXXXXXX", // étiquette de conversion Google Ads
    metaPixelLeadEvent: "Lead"                            // évènement standard Meta
  };

  /** Déclenche les conversions sur soumission/appel. type = 'lead' | 'call' */
  function fireConversion(type) {
    try {
      // Google Ads
      if (typeof window.gtag === "function") {
        window.gtag("event", "conversion", { send_to: TRACKING.googleAdsConversion, event_label: type });
      }
      // Meta Pixel
      if (typeof window.fbq === "function") {
        window.fbq("track", TRACKING.metaPixelLeadEvent, { content_name: type });
      }
      // dataLayer (Google Tag Manager)
      if (window.dataLayer && typeof window.dataLayer.push === "function") {
        window.dataLayer.push({ event: "epb_conversion", conversion_type: type });
      }
    } catch (e) { /* tracking non bloquant */ }
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

      /* ----- BRANCHEMENT BACKEND -----------------------------------
         Remplacez ce bloc par votre intégration réelle :
         - Formspree :  fetch('https://formspree.io/f/XXXX', {method:'POST', body:new FormData(form), headers:{Accept:'application/json'}})
         - EmailJS / webhook CRM : POST des données ci-dessous.
         Pour l'instant : simulation d'un envoi réussi.
      --------------------------------------------------------------- */
      var data = Object.fromEntries(new FormData(form).entries());
      // console.log('Lead capturé:', data);

      setTimeout(function () {
        fireConversion("lead");
        showSuccess(form);
        if (btn) { btn.disabled = false; btn.innerHTML = original; }
      }, 700);
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
    document.querySelectorAll("form.lead-form").forEach(initForm);
    initCallTracking();
    initFaq();
    initReveal();
    initAnchors();
    initTrustCarousel();
    document.getElementById("year") && (document.getElementById("year").textContent = new Date().getFullYear());
  });
})();

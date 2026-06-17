# Audit Landing Page — Euro Pare-Brise + (trafic Google Ads)

**Page analysée :** `index.html` (remplacement / réparation pare-brise, Ambarès-et-Lagrave + 40 km Bordeaux)
**Objectifs de conversion :** formulaire de rappel/devis · appel téléphonique
**Date :** 2026-06-10 · Cadre : skill `ads-landing` v1.5

---

## Score de santé

```
Message Match :   ███████░░░  70/100
Page Speed :      ███████▌░░  75/100
Mobile :          ████████▌░  85/100
Trust Signals :   ████████░░  82/100
Form Quality :    ███████▊░░  78/100
─────────────────────────────────────
SCORE GLOBAL :    ███████▋░░  77/100  → Grade B
```
`Health = MM×0.25 + Speed×0.25 + Mobile×0.20 + Trust×0.15 + Form×0.15`

**Verdict :** page solide et bien construite, mais **3 bloquants pré-lancement** (tracking, backend formulaire, H1) l'empêchent d'être réellement prête pour Google Ads. Corrigés, elle vise un **A**.

---

## 🚨 Bloquants (à régler AVANT de lancer la moindre campagne)

### B1 — Aucune mesure de conversion (CRITIQUE)
Aucun tag actif : pas de `gtag` Google Ads, pas d'event de conversion, pas de GTM, pas de **Consent Mode V2**, pas de capture du **gclid**.
**Conséquence :** Google Ads pilote à l'aveugle — pas de Smart Bidding fiable, pas d'optimisation, ROAS impossible à mesurer. **Tu paieras des clics sans savoir ce qui convertit.**
→ Activer le tag Google Ads + event de conversion sur (a) soumission formulaire, (b) clic `tel:`. Implémenter Consent Mode V2 (obligatoire UE) et capturer le `gclid` en champ caché.

### B2 — Formulaire non branché (CRITIQUE)
`js/main.js` simule l'envoi (`setTimeout`) — **aucun lead n'est réellement transmis**. En production, chaque demande serait perdue.
→ Brancher Formspree / webhook / CRM (déjà documenté dans le README) avant mise en ligne.

### B3 — Aucun `<h1>` sur la page (élevé)
0 balise `<h1>` détectée. L'offre « JUSQU'À 200€ OFFERTS » est dans des `<div>`. Mauvais pour le **Quality Score Google** (expérience de page / pertinence) et le **message match** sémantique.
→ Transformer le titre héros en vrai `<h1>` contenant service + lieu + offre, ex. :
`<h1>Remplacement de pare-brise à Ambarès-et-Lagrave — jusqu'à 200€ offerts</h1>` (le style « offre-choc » peut rester via les spans).

---

## Points de friction par priorité

| # | Friction | Composant | Impact estimé | Effort |
|---|----------|-----------|---------------|--------|
| 1 | **Tracking conversions absent** (B1) | Ads | Pilotage impossible | Moyen |
| 2 | **Formulaire non envoyé** (B2) | Form | 100 % leads perdus | Faible |
| 3 | **Pas de H1** (B3) | Match/QS | Quality Score ↓ | Faible |
| 4 | **Hero en PNG 588 Ko** (élément LCP) | Speed | LCP +1-2 s mobile | Faible |
| 5 | **JPG 9,2 Mo inutilisé** dans `/assets` | Speed/Hygiène | Risque si déployé | Faible |
| 6 | **Formulaire sous la ligne de flottaison** (mobile) | Mobile/Form | -10-20 % CVR | Moyen |
| 7 | **Pas de capture gclid / UTM** | Attribution | Attribution perdue | Faible |
| 8 | **Google Fonts en CDN** (render-blocking) | Speed | +100-300 ms | Faible |
| 9 | **Liens légaux factices** (`href="#"`) | Trust/Conformité | Confiance + RGPD | Faible |
| 10 | **Chiffres « 40 000 / 75 centres* »** douteux | Trust | Crédibilité | Faible |
| 11 | **Page unique statique** (pas de variantes par ad group / DKI) | Match | CVR sous-optimal | Moyen |
| 12 | **Pas de CMP / bandeau consentement** | Conformité UE | Tracking dégradé | Moyen |

---

## Détail par composante

### 1. Message Match — 70/100
✅ Offre visible immédiatement (200€ / cadeau), cohérente avec une annonce promo · véhicule premium · bénéfices clairs.
⚠️ **Pas de H1** ; le **mot-clé + la ville** ne sont pas dans le titre dominant (l'offre prend toute la place) → faible match pour des campagnes search « remplacement pare-brise Ambarès/Bordeaux ».
⚠️ **Une seule page statique** : pas de variante par ad group, pas d'insertion dynamique de mot-clé (DKI), pas de contenu géo-dynamique.
→ Ajouter un H1 service+lieu+offre ; envisager 2-3 variantes (ex. « réparation impact » vs « remplacement ») ou DKI pour aligner annonce↔page.

### 2. Page Speed — 75/100
✅ Très léger globalement : HTML 38 Ko, CSS 31 Ko, JS 7,7 Ko, icônes en SVG inline (0 requête image superflue), `fetchpriority=high` sur le hero, `preconnect` fonts.
⚠️ **Hero `voiture first page.png` = 588 Ko** = élément LCP en PNG → le plus gros frein. En **WebP/AVIF** : ~100-150 Ko (LCP -1 à -2 s sur mobile).
⚠️ **`Peugeot_e-3008…IMG_1360.jpg` = 9,2 Mo** présent dans `/assets` (non lié, donc non chargé — mais à **supprimer** pour ne pas risquer un déploiement accidentel).
⚠️ 2 autres fichiers non utilisés (`…lowaggressive.webp` 61 Ko, `windshield-replacement.jpg` 49 Ko) → ménage.
⚠️ **Google Fonts (Poppins) en CDN** = requête render-blocking → auto-héberger la police (woff2 + `font-display: swap` + preload).
→ Convertir le hero en WebP, supprimer les assets inutiles, auto-héberger la police.

### 3. Mobile — 85/100
✅ Excellent travail : **photo en premier**, boutons pleine largeur empilés, **barre sticky bas** (Appeler / Devis) toujours visible, `tel:` cliquable, logo centré, `type="tel"` + `inputmode` + `autocomplete` sur les champs, pas de scroll horizontal, pas de popup.
⚠️ **Le formulaire n'est pas au-dessus de la ligne de flottaison** : sur mobile on voit photo + offre, puis il faut scroller (le CTA « Prendre RDV » renvoie au formulaire). La **sticky bar compense** bien, mais un formulaire/mini-form plus haut augmenterait la CVR.
⚠️ Quelques textes secondaires < 16 px (labels, captions ~12,5-13 px) — acceptable mais à surveiller.

### 4. Trust Signals — 82/100
✅ **Badge Google 4,9 · 119 avis** (réels), **vrais avis** nominatifs, agréé assurances, franchise offerte, intervention 24-48h, adresse + tél + horaires, FAQ, JSON-LD `AutoRepair` + `FAQPage`, note dans la barre de confiance.
⚠️ **Liens légaux factices** (`Mentions`, `RGPD`, `CGV` → `href="#"`) — nuit à la confiance **et** à la conformité.
⚠️ **« 40 000 interventions / an », « 75 centres en France »** (marqués *) — chiffres « réseau » possiblement inexacts pour ce centre local → à corriger/retirer (risque crédibilité + juridique).
→ Brancher les vraies pages légales ; remplacer les chiffres réseau par des preuves locales (ex. « 119 avis 5★ », « intervention à domicile 40 km »).

### 5. Form Quality — 78/100
✅ **4 champs** (zone CVR favorable), validation inline (tél/requis), bouton spécifique « Être rappelé gratuitement → », écran de succès, ligne de consentement.
🚨 **Non branché** (B2) + **pas de champ caché gclid/UTM** → leads perdus et attribution cassée.
→ Brancher le backend, ajouter `<input type="hidden" name="gclid">` (+ utm_source/medium/campaign) renseignés via JS depuis l'URL, transmis au CRM.

---

## Quick Wins (triés par impact CVR / effort)

| Priorité | Action | Gain attendu | Effort |
|----------|--------|--------------|--------|
| 1 | Brancher le formulaire (Formspree/CRM) | leads réellement reçus | 30 min |
| 2 | Activer tag Google Ads + conversions (form + clic tel) + Consent Mode V2 | pilotage campagne | 1-2 h |
| 3 | Ajouter un vrai `<h1>` service+lieu+offre | Quality Score ↑ | 10 min |
| 4 | Hero PNG → WebP (588 Ko → ~130 Ko) + supprimer le JPG 9,2 Mo | LCP -1 à -2 s | 20 min |
| 5 | Capturer gclid + UTM en champs cachés | attribution exacte | 30 min |
| 6 | Mini-formulaire (ou ancre forte) au-dessus de la flottaison mobile | +10-20 % CVR mobile | 1 h |
| 7 | Brancher les pages légales (RGPD/Mentions/CGV) | confiance + conformité | variable |
| 8 | Auto-héberger Poppins (woff2 + swap) | -100-300 ms | 20 min |

---

## Pour viser un Grade A
Régler **B1 + B2 + B3** (tracking, backend, H1), passer le hero en WebP et supprimer les assets lourds inutiles. Ces actions touchent les deux composantes les plus lourdes (Message Match + Speed, 50 % du score) et lèvent les bloquants de mise en ligne — score projeté **88-92 (A)**.

# Landing Page — Euro Pare-Brise + (Ambarès-et-Lagrave)

Landing page de génération de leads pour le remplacement / la réparation de pare-brise.
HTML/CSS/JS pur, **zéro dépendance externe**, optimisée conversion (Google Ads / Meta Ads) et SEO local.

## Structure
```
index.html        Page complète (SEO, sémantique, JSON-LD LocalBusiness + FAQPage)
css/styles.css    Design system, responsive mobile-first, animations
js/main.js        Validation formulaire, accordéon FAQ, reveal scroll, hooks tracking
assets/           Images réelles à déposer ici (photos centre, équipe, véhicules)
```

## Visualiser
Ouvrez `index.html` dans un navigateur (double-clic) ou servez le dossier :
```
python -m http.server 8000   # puis http://localhost:8000
```

## À faire avant la mise en ligne

### 1. Brancher le formulaire (actuellement en simulation)
Dans `js/main.js`, section **« BRANCHEMENT BACKEND »**, remplacez le `setTimeout` par votre intégration :
- **Formspree** (le plus simple, sans serveur) :
  ```js
  fetch('https://formspree.io/f/VOTRE_ID', {
    method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' }
  }).then(function(r){ if(r.ok) showSuccess(form); });
  ```
- **EmailJS**, **webhook Make/Zapier**, ou **API de votre CRM** : POST de l'objet `data`.

### 2. Tracking — aligné sur le conteneur GTM existant
Le conteneur **GTM `GTM-PKK297FZ`** est posé dans `index.html` (head + noscript). Le compte **Google Ads `AW-18038306554`**, **GA4 `G-XK44TXMF71`** et le **Conversion Linker** y sont déjà configurés. La page émet exactement les signaux attendus par les balises existantes :

| Conversion | Signal émis par la page | Balise GTM qui se déclenche |
|---|---|---|
| **Appel** | clics sur les liens `tel:` (header, héros, bouton conseillère, CTA final, footer) | déclencheur **« clic appel »** (Liens uniquement) → balise « clic appel » |
| **Formulaire** | `dataLayer.push({ event: 'form_rdv_success' })` à la soumission réussie | déclencheur **`form_rdv_success`** → balise « prise de rdv envoyé » |

- **Attribution** : `gclid` (+ `gbraid`/`wbraid` iOS + UTM) capturé depuis l'URL → injecté dans les **champs cachés** du formulaire (import des conversions hors-ligne + Conversion Linker).

**⚠️ À vérifier dans GTM avant publication :**
- La balise HTML **« Chtm - Écouteur Formulaire RDV »** vient de l'ancien site. Comme la page pousse désormais `form_rdv_success` elle-même, **mettez-la en pause / supprimez-la** pour éviter un double comptage (si elle écoute aussi les soumissions de formulaire).
- Confirmer que le déclencheur **« clic appel »** filtre bien sur *URL du clic contient `tel:`*.
- **Conformité UE** : CMP + **Consent Mode V2** dans GTM avant la mise en ligne (RGPD).
- Mettre la **Final URL** des campagnes Google Ads vers cette page une fois déployée.

### 3. Contenu à personnaliser
- **Offre choc** : `JUSQU'À 200€ OFFERTS PAR PARE-BRISE … OU UN CADEAU AU CHOIX` (hero, cartes, FAQ, CTA final). Ajustez le montant / la mention selon votre opération commerciale. **À valider juridiquement** (offre soumise à conditions assurance).
- **Téléphone** : `05 57 77 33 88` / `tel:+33557773388` (header, hero, footer, sticky, CTA final).
- **Adresse / horaires** : footer + JSON-LD.
- **Avis clients** : remplacez les 3 témoignages par de vrais avis (idéalement Google).
- **Chiffres réseau** marqués `*` (40 000 interventions, 75 centres) : à valider juridiquement.
- **Visuels** dans `assets/` : `cropped-LOGO-epb-trans.png` (logo, header + footer + favicon), `voiture first page.png` (véhicule du hero), `peugeot_…lowaggressive.webp` (carte « Choisissez votre offre »). Remplaçables par de vraies photos du centre/technicien pour renforcer la confiance.
- **Liens légaux** (Mentions, RGPD, CGV) : pointez vers vos pages réelles.

### Structure de la page (type LP offre-choc)
Header (logo + tél + RDV) → **Hero offre-choc** (jusqu'à 200€/cadeau + véhicule + boutons) → **Formulaire devis (2ᵉ section)** → bandeau confiance → **Centre + 4 pictos** → avantages → process → réparer/remplacer → **« Rien à débourser » + documents à fournir** (accordéon) → **Loi Hamon + calibrage caméra ADAS** → preuve sociale → zone 40 km → FAQ → CTA final → footer + sticky mobile.

### 4. SEO
- `<link rel="canonical">`, `og:` et JSON-LD pointent vers une URL d'exemple — adaptez-les à l'URL finale.
- Ajoutez une vraie image `og:image` (1200×630) pour le partage social.

## Notes conversion
- Aucune navigation (pas de fuite de trafic payant) — choix volontaire pour une LP de campagne.
- Formulaire visible dès le 1er écran + répété en bas + sticky bar mobile (appel / devis).
- Réassurance répétée : franchise offerte, sans avance de frais, agréé assurances, 4,8/5.

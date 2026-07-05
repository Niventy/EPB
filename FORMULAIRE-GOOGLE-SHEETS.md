# Formulaire → Make → Google Sheets + Email

Architecture en place (gratuite, sans serveur) :

```
Site (formulaire)  ─┐
                    ├─→  Webhook Make  ─→  Google Sheet  ─→  Script Apps Script (toutes les min)  ─→  📧 Email
Meta (fb / ig)     ─┘         (Add a Row)      (1 seule feuille)          (1 mail / lead, sans doublon)
```

- **Site** : le formulaire POST vers un **webhook Make**, qui écrit la ligne dans le Sheet (source `gg`).
- **Meta** : le scénario Make des Lead Ads écrit dans **le même Sheet** (source `fb`/`ig`).
- **Email** : un script posé **sur le Sheet** lit chaque nouvelle ligne et envoie un mail — quelle que soit la source.

---

## 1. Côté site (déjà fait)

`js/main.js` :
```js
var FORM_ENDPOINT = "https://hook.eu1.make.com/…";   // URL du webhook Make
```
Le POST est envoyé en `application/x-www-form-urlencoded` (`mode:'no-cors'`), donc Make lit directement les champs :
`name`, `phone`, `city`, `model`, `insurance`, `source`, `gclid`, `gbraid`, `wbraid`, `utm_*`.

## 2. Scénario Make du site

1. Module **Webhooks → Custom webhook** → *Add* → copie l'URL → colle-la dans `FORM_ENDPOINT`.
2. *Run once*, soumets le formulaire une fois → Make apprend la structure des champs.
3. Module **Google Sheets → Add a Row** → même classeur/onglet que Meta. Mappe :
   - `platform` ← valeur fixe **`gg`** (pour identifier la source « Site / Google »)
   - `full_name` ← `name`, `phone_number` ← `phone`, `city` ← `city`
   - colonne modèle ← `model`, colonne assurance ← `insurance`
4. **Save** + active le scénario (ON).

> Le scénario **Meta** écrit dans le **même** onglet, avec `platform` = `fb`/`ig`.

## 3. Script d'email (posé sur le Google Sheet)

**Extensions → Apps Script** → coller :

```javascript
const EMAIL_TO   = "ambares@europarebrise-plus.fr";  // destinataire(s), séparés par des virgules
const SHEET_NAME = "";          // "" = 1er onglet ; sinon nom EXACT de l'onglet
const NOTIF      = "Notifié";   // colonne de suivi ajoutée automatiquement

function leadSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = SHEET_NAME ? ss.getSheetByName(SHEET_NAME) : ss.getSheets()[0];
  const lastCol = sh.getLastColumn();
  const hdr = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  if (hdr.indexOf(NOTIF) === -1) sh.getRange(1, lastCol + 1).setValue(NOTIF);
  return sh;
}

// 1re colonne dont l'entête contient un mot-clé -> sa valeur
function find_(hdr, row, needles) {
  for (let c = 0; c < hdr.length; c++) {
    const h = hdr[c].toLowerCase();
    for (const n of needles) if (h.indexOf(n) > -1) { const v = String(row[c]).trim(); if (v) return v; }
  }
  return "";
}

function sourceLabel_(hdr, row) {
  const p = find_(hdr, row, ["platform", "source", "réseau", "reseau"]).toLowerCase();
  if (/^(fb|ig)$/.test(p) || /(insta|meta|face)/.test(p)) return "Meta";
  if (/^gg$/.test(p)      || /(site|google|web|ads)/.test(p)) return "Site / Google";
  return find_(hdr, row, ["campaign_name", "ad_name", "adset"]) ? "Meta" : "Site / Google";
}

// Envoie 1 mail par nouvelle ligne (Site + Meta), coche "Notifié", zéro doublon
function notifyNewLeads() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return;
  try {
    const sh = leadSheet_();
    const last = sh.getLastRow(), nCol = sh.getLastColumn();
    if (last < 2) return;
    const hdr = sh.getRange(1, 1, 1, nCol).getValues()[0].map(String);
    const ni  = hdr.indexOf(NOTIF);
    const vals = sh.getRange(2, 1, last - 1, nCol).getValues();
    for (let i = 0; i < vals.length; i++) {
      const row = vals[i];
      if (String(row[ni]).trim() !== "") continue;   // déjà notifié -> on saute

      const source = sourceLabel_(hdr, row);
      const nom    = find_(hdr, row, ["full_name", "nom", "name"]);
      const tel    = find_(hdr, row, ["phone", "tel", "télé", "tele"]);
      const ville  = find_(hdr, row, ["city", "ville", "cp"]);
      const modele = find_(hdr, row, ["modèle", "modele", "model", "véhicule", "vehicule"]);
      const assur  = find_(hdr, row, ["assurance", "franchise"]);
      const offre  = find_(hdr, row, ["offre"]);
      const camp   = find_(hdr, row, ["campaign_name", "ad_name"]);

      const body =
        "🚗 NOUVEAU LEAD\n\n" +
        "Source : "    + source          + "\n" +
        "Nom : "       + (nom    || "-")  + "\n" +
        "Téléphone : " + (tel    || "-")  + "\n" +
        "Ville : "     + (ville  || "-")  + "\n" +
        "Modèle : "    + (modele || "-")  + "\n" +
        "Assurance : " + (assur  || "-")  + "\n" +
        (offre ? "Offre : "    + offre + "\n" : "") +
        (camp  ? "Campagne : " + camp  + "\n" : "");

      MailApp.sendEmail(EMAIL_TO, "🚗 Lead " + source + " — " + (nom || "Sans nom"), body);
      sh.getRange(i + 2, ni + 1).setValue("✓");
    }
  } finally { lock.releaseLock(); }
}

// ⚠️ À EXÉCUTER UNE FOIS avant d'activer le déclencheur (évite de spammer l'historique)
function markHistory() {
  const sh = leadSheet_();
  const last = sh.getLastRow(), nCol = sh.getLastColumn();
  if (last < 2) return;
  const ni = sh.getRange(1, 1, 1, nCol).getValues()[0].map(String).indexOf(NOTIF);
  const rng = sh.getRange(2, ni + 1, last - 1, 1), v = rng.getValues();
  for (let i = 0; i < v.length; i++) if (!String(v[i][0]).trim()) v[i][0] = "historique";
  rng.setValues(v);
}
```

## 4. Activer (pas de déploiement Web App)

1. Sélectionne **`markHistory`** → **▶ Exécuter** une fois → crée la colonne « Notifié » et coche les leads déjà présents (**pas de spam** de l'historique).
2. À la 1re exécution, **autorise** le script (ton compte → *Paramètres avancés* → *Accéder au projet* → *Autoriser*).
3. **Déclencheurs (⏰)** → *Ajouter* : fonction **`notifyNewLeads`**, **Basé sur le temps → Minuteur en minutes → Toutes les minutes**.

→ Dès qu'une ligne arrive (Site **ou** Meta), un mail part dans la minute, avec la **source**, **sans doublon**.

## 5. Réglages utiles

- **Changer / ajouter des destinataires** : `EMAIL_TO = "a@x.fr,b@y.fr"` (virgules, sans espace). Actif immédiatement, pas de re-déploiement.
- **Garder le 0 des téléphones** : sélectionne la colonne téléphone du Sheet → **Format → Nombre → Texte brut**.
- **Rien ne part / pas de mail** : lance `notifyNewLeads` à la main → menu **Exécutions** pour voir l'erreur ; vérifie le **spam** du destinataire ; vérifie que la colonne « Notifié » de la ligne n'est pas déjà cochée.

---

> Note : les déclencheurs Apps Script **« Lors d'un changement »** ne se déclenchent PAS sur les écritures faites via l'API (Make). D'où le **déclencheur horaire** (toutes les minutes) qui, lui, fonctionne pour toutes les sources.

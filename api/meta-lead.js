/* ==========================================================================
   Conversions API Meta — fonction serverless Vercel (POST /api/meta-lead)
   Renvoie le « Lead » du formulaire à Meta côté serveur. Le pixel envoie le
   même évènement avec le même event_id → Meta déduplique.

   Variables d'environnement (Vercel → Settings → Environment Variables) :
     META_PIXEL_ID          1814829916278385
     META_CAPI_TOKEN        jeton d'accès Conversions API (jamais dans le code)
   ========================================================================== */
const crypto = require("crypto");

const GRAPH = "https://graph.facebook.com/v21.0";

/** SHA-256 d'une valeur normalisée (minuscules, sans espaces autour). */
function hash(v) {
  const s = String(v || "").trim().toLowerCase();
  return s ? crypto.createHash("sha256").update(s).digest("hex") : undefined;
}

/** « 06 12 34 56 78 » → « 33612345678 » (format attendu par Meta). */
function telephone(v) {
  let d = String(v || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10 && d.startsWith("0")) d = "33" + d.slice(1);
  return d;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const pixelId = process.env.META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  if (!pixelId || !token) return res.status(204).end(); // CAPI non configurée

  const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  if (!b.event_id) return res.status(400).json({ error: "event_id manquant" });

  const mots = String(b.name || "").trim().split(/\s+/).filter(Boolean);
  const zp = (String(b.city || "").match(/\b\d{5}\b/) || [])[0];
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();

  const userData = {
    ph: hash(telephone(b.phone)),
    fn: hash(mots[0]),
    ln: mots.length > 1 ? hash(mots[mots.length - 1]) : undefined,
    zp: hash(zp),
    country: hash("fr"),
    external_id: hash(b.event_id),
    client_ip_address: ip || undefined,
    client_user_agent: req.headers["user-agent"] || undefined,
    fbp: b.fbp || undefined,
    fbc: b.fbc || undefined,
  };

  const payload = {
    data: [{
      event_name: "Lead",
      event_time: Math.floor(Date.now() / 1000),
      event_id: String(b.event_id),
      action_source: "website",
      event_source_url: b.url || req.headers.referer || undefined,
      user_data: userData,
    }],
  };

  try {
    const r = await fetch(`${GRAPH}/${pixelId}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      console.error("[meta-capi]", r.status, (await r.text()).slice(0, 500));
      return res.status(502).json({ error: "Meta a refusé l'évènement" });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[meta-capi]", e && e.message);
    return res.status(502).json({ error: "Envoi impossible" });
  }
};

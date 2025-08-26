// netlify/edge-functions/lang-redirect.js
// Redirección de primera visita según Accept-Language,
// con _cc (consentimiento) INYECTADO dentro de `u`,
// y exclusión de auditorías/bots (Lighthouse/PSI/Googlebot, etc.).

const SUPPORTED = new Set(["en", "fr", "eu"]);

const STATIC_RX = [
  /^\/admin\//,
  /^\/assets\//,
  /^\/images\//,
  /^\/favicon\./,
  /\.(css|js|json|xml|txt|ico|png|jpg|jpeg|webp|svg|map)$/i,
];

const UA_SKIP = [
  "chrome-lighthouse", "lighthouse", "pagespeed", "speed insights",
  "google-inspectiontool", "psi", "webpagetest", "gtmetrix",
  "googlebot", "bingbot", "duckduckbot", "yandexbot", "baiduspider", "slurp",
  "facebookexternalhit", "twitterbot", "linkedinbot", "discordbot",
  "whatsapp", "telegrambot", "embedly", "pinterestbot",
  "netlifybot", "rendertron", "prerender", "vercelbot",
];

export default async (req) => {
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 1) No tocar estáticos ni el panel
  if (STATIC_RX.some((rx) => rx.test(url.pathname))) return;

  // 2) No redirigir auditorías/bots
  const ua = (req.headers.get("user-agent") || "").toLowerCase();
  if (UA_SKIP.some((token) => ua.includes(token))) return;

  // 3) Respeta: ?_nolang=1 o preferencia manual (langpref)
  if (url.searchParams.has("_nolang")) return;
  const cookies = req.headers.get("cookie") || "";
  if (/\blangpref=(es|stay)\b/.test(cookies)) return;

  // 4) Si el navegador tiene español, no redirigir
  const accept = (req.headers.get("accept-language") || "").toLowerCase();
  if (/\bes(\b|-[a-z]{2}\b)/.test(accept)) return;

  // 5) Primer idioma soportado (en, fr, eu)
  const first = accept
    .split(",")
    .map((s) => s.split(";")[0].trim())
    .map((tag) => tag.split("-")[0])
    .find((code) => SUPPORTED.has(code));
  if (!first) return;

  // 6) INYECTA _cc (base64 del JSON cookie-consent) dentro de la URL destino (u)
  const dest = new URL(url.toString());
  try {
    const m = cookies.match(/(?:^|;\s*)cookie-consent=([^;]+)/);
    if (m) {
      const json = decodeURIComponent(m[1]); // la cookie ya es JSON
      const base64 = btoa(json);
      dest.searchParams.set("_cc", base64);  // <- clave del fix
    }
  } catch (_e) {}

  // 7) Redirige a Google Translate con u=... que YA lleva _cc
  const target =
    "https://translate.google.com/translate?sl=es&tl=" +
    first +
    "&u=" + encodeURIComponent(dest.toString());

  return Response.redirect(target, 302);
};

// Declarado en netlify.toml como edge function para todas las rutas
export const config = { path: "/*" };

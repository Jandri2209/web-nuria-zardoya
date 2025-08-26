// netlify/edge-functions/lang-redirect.js
// Redirección 1ª visita según Accept-Language, inyectando _cc dentro de `u`
// y excluyendo auditorías/bots (Lighthouse/PSI/Googlebot, etc.).

const SUPPORTED = new Set(["en", "fr", "eu"]);
const STATIC_RX = [
  /^\/admin\//, /^\/assets\//, /^\/images\//, /^\/favicon\./,
  /\.(css|js|json|xml|txt|ico|png|jpg|jpeg|webp|svg|map)$/i
];

const UA_SKIP = [
  "chrome-lighthouse","lighthouse","pagespeed","speed insights",
  "google-inspectiontool","psi","webpagetest","gtmetrix",
  "googlebot","bingbot","duckduckbot","yandexbot","baiduspider","slurp",
  "facebookexternalhit","twitterbot","linkedinbot","discordbot",
  "whatsapp","telegrambot","embedly","pinterestbot",
  "netlifybot","rendertron","prerender","vercelbot"
];

export default async (req) => {
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 1) No tocar estáticos/panel
  if (STATIC_RX.some(rx => rx.test(url.pathname))) return;

  // 2) No redirigir auditorías/bots
  const ua = (req.headers.get("user-agent") || "").toLowerCase();
  if (UA_SKIP.some(token => ua.includes(token))) return;

  // 3) Respeta: ?_nolang=1 o cookie de preferencia manual
  if (url.searchParams.has("_nolang")) return;
  const cookies = req.headers.get("cookie") || "";
  if (/\blangpref=(es|stay)\b/.test(cookies)) return;

  // 4) Si el navegador tiene español: no redirigir
  const accept = (req.headers.get("accept-language") || "").toLowerCase();
  if (/\bes(\b|-[a-z]{2}\b)/.test(accept)) return;

  // 5) Primer idioma soportado (en, fr, eu)
  const first = accept
    .split(",").map(s => s.split(";")[0].trim())
    .map(tag => tag.split("-")[0])
    .find(code => SUPPORTED.has(code));
  if (!first) return;

  // 6) Inyecta _cc dentro de la URL destino (u) para que la página traducida lo reciba
  const dest = new URL(url.toString());
  try {
    const m = cookies.match(/(?:^|;\s*)cookie-consent=([^;]+)/);
    if (m) {
      const base64 = btoa(decodeURIComponent(m[1])); // cookie-consent ya es JSON
      dest.searchParams.set("_cc", base64);          // <- clave del fix
    }
  } catch (_) {}

  // 7) Redirige a Google Translate con u=... que ya lleva _cc
  const target =
    "https://translate.google.com/translate?sl=es&tl=" +
    first +
    "&u=" + encodeURIComponent(dest.toString());

  return Response.redirect(target, 302);
};

// Declarado en netlify.toml como edge function en todas las rutas
export const config = { path: "/*" };

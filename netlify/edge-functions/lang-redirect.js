// netlify/edge-functions/lang-redirect.js
// Sugiere idioma en 1ª visita fijando cookies para Google Translate; NO redirige.
// Mantiene exclusiones de bots/auditorías y no toca estáticos.

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

export default async (req, context) => {
  if (req.method !== "GET") return context.next();

  const url = new URL(req.url);
  if (STATIC_RX.some((rx) => rx.test(url.pathname))) return context.next();

  const ua = (req.headers.get("user-agent") || "").toLowerCase();
  if (UA_SKIP.some((token) => ua.includes(token))) return context.next();

  // Respeta opt-out y preferencias previas
  if (url.searchParams.has("_nolang")) return context.next();

  const cookies = req.headers.get("cookie") || "";
  if (/\blangpref=(es|stay)\b/.test(cookies)) return context.next(); // el usuario pidió “no tocar”
  if (/\bgoogtrans=\/es\/(en|fr|eu)\b/.test(cookies)) return context.next(); // ya sugerido antes

  // Si el navegador tiene español, no sugerimos
  const accept = (req.headers.get("accept-language") || "").toLowerCase();
  if (/\bes(\b|-[a-z]{2}\b)/.test(accept)) return context.next();

  // Primer idioma soportado (en, fr, eu)
  const first = accept
    .split(",")
    .map((s) => s.split(";")[0].trim())
    .map((tag) => tag.split("-")[0])
    .find((code) => SUPPORTED.has(code));
  if (!first) return context.next();

  // Escribimos cookies de pista e idioma para GT y seguimos SIN redirigir
  const res = await context.next();
  const host = new URL(req.url).hostname;

  res.headers.append("Set-Cookie", `gt_lang=${first}; Max-Age=31536000; Path=/; SameSite=Lax`);
  // Cookie que el widget de Google Translate usa para auto-aplicar traducción
  res.headers.append("Set-Cookie", `googtrans=/es/${first}; Max-Age=31536000; Path=/`);
  res.headers.append("Set-Cookie", `googtrans=/es/${first}; Max-Age=31536000; Path=/; Domain=${host}`);

  return res;
};

export const config = { path: "/*" };

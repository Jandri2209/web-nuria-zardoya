// netlify/edge-functions/lang-redirect.js
// Sugerencia de idioma en 1ª visita fijando cookies; **NO** redirige.
// Respeta _nolang y la preferencia manual, y evita bots/auditorías.

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

  // 1) No tocar estáticos ni /admin
  if (STATIC_RX.some((rx) => rx.test(url.pathname))) return context.next();

  // 2) Saltar auditorías/bots
  const ua = (req.headers.get("user-agent") || "").toLowerCase();
  if (UA_SKIP.some((token) => ua.includes(token))) return context.next();

  // 3) Respeta opt-out y preferencia manual
  if (url.searchParams.has("_nolang")) return context.next();
  const cookies = req.headers.get("cookie") || "";
  if (/\blangpref=(es|stay)\b/.test(cookies)) return context.next();          // el usuario dijo “no tocar”
  if (/\bgoogtrans=\/es\/(en|fr|eu)\b/.test(cookies)) return context.next();   // ya sugerido antes

  // 4) Si el navegador tiene español, no sugerir
  const accept = (req.headers.get("accept-language") || "").toLowerCase();
  if (/\bes(\b|-[a-z]{2}\b)/.test(accept)) return context.next();

  // 5) Coge el primer idioma soportado
  const first = accept
    .split(",")
    .map((s) => s.split(";")[0].trim())
    .map((tag) => tag.split("-")[0])
    .find((code) => SUPPORTED.has(code));
  if (!first) return context.next();

  // 6) Escribe cookies y continúa (sin redirigir)
  const res = await context.next();
  const host = new URL(req.url).hostname;

  res.headers.append("Set-Cookie", `gt_lang=${first}; Max-Age=31536000; Path=/; SameSite=Lax`);
  // Cookie que el widget de Google Translate usa para auto-aplicar traducción
  const pair = `/es/${first}`;
  res.headers.append("Set-Cookie", `googtrans=${pair}; Max-Age=31536000; Path=/`);
  res.headers.append("Set-Cookie", `googtrans=${pair}; Max-Age=31536000; Path=/; Domain=${host}`);

  return res;
};

export const config = { path: "/*" };
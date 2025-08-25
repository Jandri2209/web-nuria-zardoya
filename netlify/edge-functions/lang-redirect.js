// Redirección 1ª visita según Accept-Language (con _cc si existe)
const SUPPORTED = new Set(["en", "fr", "eu"]); // idiomas a los que sí redirigir
const STATIC_RX = [
  /^\/admin\//, /^\/assets\//, /^\/images\//, /^\/favicon\./,
  /\.(css|js|json|xml|txt|ico|png|jpg|jpeg|webp|svg|map)$/i
];

export default async (req) => {
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // No tocar estáticos/panel
  if (STATIC_RX.some(rx => rx.test(url.pathname))) return;

  // Respeta: ?_nolang=1 o cookie de preferencia
  if (url.searchParams.has("_nolang")) return;
  const cookies = req.headers.get("cookie") || "";
  if (/\blangpref=(es|stay)\b/.test(cookies)) return;

  // Si el navegador tiene español: no redirigir
  const accept = (req.headers.get("accept-language") || "").toLowerCase();
  if (/\bes(\b|-[a-z]{2}\b)/.test(accept)) return;

  // Primer idioma soportado (en, fr, eu)
  const first = accept
    .split(",").map(s => s.split(";")[0].trim())
    .map(tag => tag.split("-")[0])
    .find(code => SUPPORTED.has(code));
  if (!first) return;

  // Lee cookie-consent y añade como _cc si existe
  let cc = "";
  try {
    const m = cookies.match(/(?:^|;\s*)cookie-consent=([^;]+)/);
    if (m) {
      // Ojo: ya viene como JSON -> lo pasamos tal cual a btoa
      cc = "&_cc=" + encodeURIComponent(btoa(decodeURIComponent(m[1])));
    }
  } catch (_) {}

  const target =
    "https://translate.google.com/translate?sl=es&tl=" +
    first +
    "&u=" + encodeURIComponent(url.toString()) +
    cc;

  return Response.redirect(target, 302);
};

export const config = { path: "/*" };

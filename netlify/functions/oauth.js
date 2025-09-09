// netlify/functions/oauth.js
// OAuth Decap + GitHub. Entrega el token al opener y cierra el popup.

const AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const TOKEN_URL     = "https://github.com/login/oauth/access_token";

exports.handler = async (event) => {
  const proto = event.headers["x-forwarded-proto"] || "https";
  const host  = event.headers["x-forwarded-host"] || event.headers.host;
  const basePath = event.path.replace(/\/(auth|callback)$/, "");
  const baseURL  = `${proto}://${host}${basePath}`;
  const redirect = `${baseURL}/callback`;

  // --- /auth → GitHub ---
  if (event.path.endsWith("/auth")) {
    // incluimos state por compatibilidad, pero no dependemos de él
    const state = Buffer.from(JSON.stringify({ origin: `${proto}://${host}` }))
      .toString("base64url");

    const url = new URL(AUTHORIZE_URL);
    url.searchParams.set("client_id", process.env.OAUTH_CLIENT_ID);
    url.searchParams.set("redirect_uri", redirect);
    // usa "repo" para que funcione si el repo es privado (vale también para público)
    url.searchParams.set("scope", "repo");
    url.searchParams.set("state", state);

    return { statusCode: 302, headers: { Location: url.toString() } };
  }

  // --- /callback → code→token → postMessage + close ---
  if (event.path.endsWith("/callback")) {
    const code = (event.queryStringParameters || {}).code;
    if (!code) return { statusCode: 400, body: "Missing code" };

    const body = new URLSearchParams({
      client_id: process.env.OAUTH_CLIENT_ID,
      client_secret: process.env.OAUTH_CLIENT_SECRET,
      code,
      redirect_uri: redirect
    });

    const resp = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { Accept: "application/json" },
      body
    });
    const data = await resp.json();
    const token = data.access_token || "";

    const html = `<!doctype html><html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="google" content="notranslate"><title>Listo</title></head><body>
<script>
(function(){
  var t = ${JSON.stringify(token)};
  var payload = { token: t, provider: 'github' };
  var msg = 'authorization:github:success:' + JSON.stringify(payload);

  // target robusto: 1) referrer → origin del /admin, 2) fallback '*'
  var target = '*';
  try {
    var ref = document.referrer ? new URL(document.referrer).origin : '';
    if (ref) target = ref;
  } catch(e){}

  try {
    if (window.opener && t) {
      window.opener.postMessage(msg, target);
      window.close();
    } else {
      document.body.textContent = 'Autorización completada. Puedes cerrar esta ventana.';
    }
  } catch(e){
    document.body.textContent = 'Autorización completada. Puedes cerrar esta ventana.';
  }
})();
</script></body></html>`;

    return { statusCode: 200, headers: { "Content-Type": "text/html" }, body: html };
  }

  return { statusCode: 404, body: "Not found" };
};

// netlify/functions/oauth.js
// OAuth para Decap (GitHub). Envía el token al opener y cierra el popup.

const AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const TOKEN_URL     = "https://github.com/login/oauth/access_token";

function allowOrigin(origin) {
  const list = (process.env.ORIGINS || "")
    .split(",").map(s => s.trim()).filter(Boolean);
  return list.includes(origin) ? origin : "";
}

exports.handler = async (event) => {
  const reqOrigin = event.headers.origin || "";
  const cors = {
    "Access-Control-Allow-Origin": allowOrigin(reqOrigin),
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors };

  const proto = event.headers["x-forwarded-proto"] || "https";
  const host  = event.headers["x-forwarded-host"] || event.headers.host;
  const basePath = event.path.replace(/\/(auth|callback)$/, "");
  const baseURL  = `${proto}://${host}${basePath}`;
  const redirect = `${baseURL}/callback`;

  // === /auth → redirige a GitHub ===
  if (event.path.endsWith("/auth")) {
    // guardamos el origin en state para limitar postMessage
    const state = Buffer.from(JSON.stringify({ origin: `${proto}://${host}` }))
      .toString("base64url");

    const url = new URL(AUTHORIZE_URL);
    url.searchParams.set("client_id", process.env.OAUTH_CLIENT_ID);
    url.searchParams.set("redirect_uri", redirect);
    url.searchParams.set("scope", "public_repo"); // usa "repo" si tu repo es privado
    url.searchParams.set("state", state);

    return { statusCode: 302, headers: { Location: url.toString() } };
  }

  // === /callback → intercambia code→token y lo entrega al CMS ===
  if (event.path.endsWith("/callback")) {
    const qs   = event.queryStringParameters || {};
    const code = qs.code || "";
    const stateB64 = qs.state || "";
    let postOrigin = "*";
    try {
      const s = JSON.parse(Buffer.from(stateB64, "base64").toString("utf8"));
      if (s && s.origin) postOrigin = s.origin;
    } catch {}

    if (!code) {
      return { statusCode: 400, headers: { ...cors, "Content-Type": "application/json" },
               body: JSON.stringify({ error: "Missing code" }) };
    }

    const body = new URLSearchParams({
      client_id: process.env.OAUTH_CLIENT_ID,
      client_secret: process.env.OAUTH_CLIENT_SECRET,
      code, redirect_uri: redirect
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
  var msg = 'authorization:github:success:' + JSON.stringify({ token: t, provider: 'github' });
  try {
    if (window.opener && t) {
      window.opener.postMessage(msg, ${JSON.stringify(postOrigin)});
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

  return { statusCode: 404, headers: cors, body: "Not found" };
};

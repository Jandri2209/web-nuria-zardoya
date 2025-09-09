// netlify/functions/oauth.js
const AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const TOKEN_URL     = "https://github.com/login/oauth/access_token";

exports.handler = async (event) => {
  const proto = event.headers["x-forwarded-proto"] || "https";
  const host  = event.headers["x-forwarded-host"] || event.headers.host;
  const siteOrigin = `${proto}://${host}`;
  const basePath = event.path.replace(/\/(auth|callback)$/, "");
  const baseURL  = `${siteOrigin}${basePath}`;
  const redirect = `${baseURL}/callback`;

  if (event.path.endsWith("/auth")) {
    // guardo el origin en state para saber a quién postMessage
    const state = Buffer.from(JSON.stringify({ origin: siteOrigin })).toString("base64url");
    const url = new URL(AUTHORIZE_URL);
    url.searchParams.set("client_id", process.env.OAUTH_CLIENT_ID);
    url.searchParams.set("redirect_uri", redirect);
    url.searchParams.set("scope", "repo"); // público/privado
    url.searchParams.set("state", state);
    return { statusCode: 302, headers: { Location: url.toString() } };
  }

  if (event.path.endsWith("/callback")) {
    const qs   = event.queryStringParameters || {};
    const code = qs.code || "";
    if (!code) return { statusCode: 400, body: "Missing code" };

    // intento leer el origin del "state"
    let postOrigin = siteOrigin;
    try {
      const s = JSON.parse(Buffer.from(qs.state || "", "base64").toString("utf8"));
      if (s && s.origin) postOrigin = s.origin;
    } catch {}

    const body = new URLSearchParams({
      client_id: process.env.OAUTH_CLIENT_ID,
      client_secret: process.env.OAUTH_CLIENT_SECRET,
      code, redirect_uri: redirect
    });

    const resp = await fetch(TOKEN_URL, { method: "POST", headers: { Accept: "application/json" }, body });
    const data = await resp.json();
    const token = data.access_token || "";

    const html = `<!doctype html><html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="google" content="notranslate"><title>Autorización completada</title></head><body>
<script>
(function () {
  var t = ${JSON.stringify(token)};
  var o = ${JSON.stringify(postOrigin)};
  function sendOnce(target) {
    try {
      if (!window.opener || !t) return;
      // Formato A (string plano)
      window.opener.postMessage('authorization:github:success:' + t, target);
      // Formato B (payload JSON como string)
      window.opener.postMessage('authorization:github:success:' + JSON.stringify({ token: t, provider: 'github' }), target);
    } catch (e) {}
  }
  // Dispara varias veces por si el listener tarda en enganchar
  sendOnce(o);
  setTimeout(function(){ sendOnce(o); }, 80);
  setTimeout(function(){ sendOnce(o); }, 160);
  // Como último recurso, a wildcard (algunas implementaciones antiguas lo usan)
  setTimeout(function(){ sendOnce('*'); }, 200);
  // Cierra con un pequeño retardo
  setTimeout(function(){ try{ window.close(); }catch(_){} }, 300);
})();
</script></body></html>`;
    return { statusCode: 200, headers: { "Content-Type": "text/html" }, body: html };
  }

  return { statusCode: 404, body: "Not found" };
};

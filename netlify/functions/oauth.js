// netlify/functions/oauth.js
// OAuth Decap + GitHub. Entrega el token al opener y cierra el popup.

const AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const TOKEN_URL     = "https://github.com/login/oauth/access_token";

exports.handler = async (event) => {
  const proto = event.headers["x-forwarded-proto"] || "https";
  const host  = event.headers["x-forwarded-host"] || event.headers.host;
  const siteOrigin = `${proto}://${host}`;      // <-- origen del panel /admin
  const basePath = event.path.replace(/\/(auth|callback)$/, "");
  const baseURL  = `${siteOrigin}${basePath}`;
  const redirect = `${baseURL}/callback`;

  if (event.path.endsWith("/auth")) {
    const state = Buffer.from(JSON.stringify({ origin: siteOrigin }))
      .toString("base64url");

    const url = new URL(AUTHORIZE_URL);
    url.searchParams.set("client_id", process.env.OAUTH_CLIENT_ID);
    url.searchParams.set("redirect_uri", redirect);
    url.searchParams.set("scope", "repo"); // sirve para repo público o privado
    url.searchParams.set("state", state);

    return { statusCode: 302, headers: { Location: url.toString() } };
  }

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
  var msg = 'authorization:github:success:' + JSON.stringify({ token: t, provider: 'github' });
  try {
    if (window.opener && t) {
      // ¡enviar SIEMPRE al origen del panel!
      window.opener.postMessage(msg, ${JSON.stringify(siteOrigin)});
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

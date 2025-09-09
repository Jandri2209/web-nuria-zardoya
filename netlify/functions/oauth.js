// netlify/functions/oauth.js
// OAuth para Decap CMS con GitHub (Node 18).
// Env vars necesarias en Netlify: OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET

const AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const TOKEN_URL     = "https://github.com/login/oauth/access_token";

exports.handler = async (event) => {
  const proto = event.headers["x-forwarded-proto"] || "https";
  const host  = event.headers["x-forwarded-host"] || event.headers.host;
  const siteOrigin = `${proto}://${host}`;       // origen del panel (/admin)
  const basePath   = (event.path || "").replace(/\/(auth|callback)$/, "");
  const baseURL    = `${siteOrigin}${basePath}`;
  const redirect   = `${baseURL}/callback`;

  // === 1) /auth -> redirige a GitHub ===
  if (event.path.endsWith("/auth")) {
    // guardamos el origin en "state" para usarlo en el callback
    const state = Buffer.from(JSON.stringify({ origin: siteOrigin })).toString("base64url");

    const url = new URL(AUTHORIZE_URL);
    url.searchParams.set("client_id", process.env.OAUTH_CLIENT_ID);
    url.searchParams.set("redirect_uri", redirect);
    url.searchParams.set("scope", "repo");          // sirve para repo público o privado
    url.searchParams.set("state", state);

    return { statusCode: 302, headers: { Location: url.toString() } };
  }

  // === 2) /callback -> code→token -> entregar token al panel y cerrar ===
  if (event.path.endsWith("/callback")) {
    const qs   = event.queryStringParameters || {};
    const code = qs.code || "";
    if (!code) return { statusCode: 400, body: "Missing code" };

    // intenta recuperar el origin del "state"
    let postOrigin = siteOrigin;
    try {
      const s = JSON.parse(Buffer.from(qs.state || "", "base64").toString("utf8"));
      if (s && s.origin) postOrigin = s.origin;
    } catch {}

    // Intercambio code → access_token
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

    const data  = await resp.json().catch(() => ({}));
    const token = data && data.access_token ? data.access_token : "";

    // Página mínima: envía el token, lo guarda en localStorage del opener, recarga y cierra
    const html = `<!doctype html><html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="google" content="notranslate">
<title>Autorización completada</title>
</head><body>
<script>
(function () {
  var t = ${JSON.stringify(token)};
  var origin = ${JSON.stringify(postOrigin)};

  function sendAll(target) {
    try {
      if (!window.opener || !t) return;
      // Formato que Decap espera (token en texto plano)
      window.opener.postMessage('authorization:github:success:' + t, target);
      // Formato alternativo (algunas versiones lo usan)
      window.opener.postMessage('authorization:github:success:' + JSON.stringify({ token: t, provider: 'github' }), target);
    } catch (e) {}
  }

  try {
    if (window.opener && t) {
      // 1) Enviar mensajes al panel (varios intentos por si el listener tarda)
      sendAll(origin);
      setTimeout(function(){ sendAll(origin); }, 80);
      setTimeout(function(){ sendAll('*'); }, 160);

      // 2) Parche infalible: persistir token en el panel y recargar
      try {
        var user = JSON.stringify({ token: t, provider: 'github' });
        window.opener.localStorage.setItem('decap-cms-user', user);
        window.opener.localStorage.setItem('netlify-cms-user', user);
      } catch (e) {}

      try { window.opener.location.reload(); } catch (e) {}

      // 3) Cerrar el popup
      setTimeout(function(){ try { window.close(); } catch (_) {} }, 300);
    } else {
      document.body.textContent = 'Autorización completada. Puedes cerrar esta ventana.';
    }
  } catch (e) {
    document.body.textContent = 'Autorización completada. Puedes cerrar esta ventana.';
  }
})();
</script>
</body></html>`;

    return { statusCode: 200, headers: { "Content-Type": "text/html" }, body: html };
  }

  return { statusCode: 404, body: "Not found" };
};

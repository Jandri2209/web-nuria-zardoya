// netlify/functions/oauth.js
// Proveedor OAuth para Decap CMS (GitHub). Node 18 (fetch nativo).
// Requiere vars: OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, ORIGINS
// ORIGINS: dominios permitidos, separados por coma (p.ej. "https://nuriazardoya.es,https://tu-site.netlify.app")

const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';

// Devuelve el origin permitido o vacío (CORS estricto)
function allowOrigin(origin) {
  const list = (process.env.ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  return list.includes(origin) ? origin : '';
}

exports.handler = async (event) => {
  const origin = event.headers.origin || '';
  const cors = {
    'Access-Control-Allow-Origin': allowOrigin(origin),
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };

  // Detecta la URL pública y construye callback absoluto
  const proto = event.headers['x-forwarded-proto'] || 'https';
  const host = event.headers.host;
  const basePath = event.path.replace(/\/(auth|callback)$/, '');
  const callbackUrl = `${proto}://${host}${basePath}/callback`;

  if (event.path.endsWith('/auth')) {
    // Inicia OAuth → redirige a GitHub
    const url = new URL(AUTHORIZE_URL);
    url.searchParams.set('client_id', process.env.OAUTH_CLIENT_ID);
    url.searchParams.set('redirect_uri', callbackUrl);
    // Si el repo es privado, usa "repo"; si es público puedes usar "public_repo"
    url.searchParams.set('scope', 'public_repo');
    // Decap puede pasar state; lo propagamos
    const qs = event.queryStringParameters || {};
    if (qs.state) url.searchParams.set('state', qs.state);
    return { statusCode: 302, headers: { Location: url.toString() } };
  }

  if (event.path.endsWith('/callback')) {
    const qs = event.queryStringParameters || {};
    if (!qs.code) {
      return { statusCode: 400, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Missing code' }) };
    }
    const body = new URLSearchParams({
      client_id: process.env.OAUTH_CLIENT_ID,
      client_secret: process.env.OAUTH_CLIENT_SECRET,
      code: qs.code,
      redirect_uri: callbackUrl,
    });

    const resp = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body,
    });
    const data = await resp.json();

    if (!resp.ok || data.error || !data.access_token) {
      return {
        statusCode: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: data.error || 'token_exchange_failed', details: data.error_description || data }),
      };
    }

    // Lo que espera Decap: { token: "<access_token>" }
    return {
      statusCode: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: data.access_token }),
    };
  }

  return { statusCode: 404, headers: cors, body: 'Not found' };
};

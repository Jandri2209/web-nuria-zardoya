// netlify/edge-functions/consent.js
// Devuelve y actualiza el consentimiento desde/para tu dominio.
// GET  -> { consent: {...} | null }
// POST -> body: { consent: { analytics: bool, marketing: bool } }
//        Set-Cookie: cookie-consent=...; SameSite=None; Secure

export default async (req) => {
  const url = new URL(req.url);
  const method = req.method || "GET";

  // CORS (refleja origen llamante para permitir credentials)
  const origin = req.headers.get("Origin") || "*";
  const headers = {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  };

  if (method === "OPTIONS") {
    return new Response(null, { headers });
  }

  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/(?:^|;\s*)cookie-consent=([^;]+)/);

  if (method === "GET") {
    let json = null;
    if (match) {
      try { json = JSON.parse(decodeURIComponent(match[1])); } catch {}
    }
    return new Response(JSON.stringify({ consent: json }), {
      headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  if (method === "POST") {
    let body = null;
    try { body = await req.json(); } catch {}
    const value = body && body.consent ? body.consent : null;
    if (!value || typeof value !== "object") {
      return new Response(JSON.stringify({ ok: false, error: "bad_consent" }), {
        status: 400, headers: { ...headers, "Content-Type": "application/json" }
      });
    }
    const normalized = {
      necessary: true,
      analytics: !!value.analytics,
      marketing: !!value.marketing,
    };
    const cookie =
      `cookie-consent=${encodeURIComponent(JSON.stringify(normalized))}; ` +
      `Path=/; Max-Age=31536000; SameSite=None; Secure`;

    return new Response(JSON.stringify({ ok: true }), {
      headers: {
        ...headers,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Set-Cookie": cookie,
      },
    });
  }

  return new Response("Method Not Allowed", { status: 405, headers });
};

export const config = { path: "/api/consent" };

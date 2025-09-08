const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");

/* ==== Utils ==== */
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function trimAndLimit(str = "", max = 800) {
  const s = String(str).trim();
  return s.length > max ? s.slice(0, max) + "…" : s;
}
function nowStamp() {
  const d = new Date();
  const fmt = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false
  });
  const parts = fmt.formatToParts(d).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
  return `${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}`;
}

/* ==== Datos del sitio (sin ENV) ==== */
let SITE_URL = "https://nuriazardoya.es";
for (const guess of ["../../_data/site.json", "../../src/_data/site.json"]) {
  try {
    const s = require(path.resolve(__dirname, guess));
    SITE_URL = s.url || s.site?.url || SITE_URL;
    break;
  } catch (_) {}
}

/* ==== Logo inline (CID) ==== */
const LOGO_CID = "logoNuria@inline";

function getLogoAttachment() {
  // Usa la imagen que ya existe en tu sitio
  return {
    filename: "logo-nuria.jpg",
    path: `${SITE_URL}/images/nuria-zardoya-hero-320.jpg`,
    cid: LOGO_CID,
    contentType: "image/jpeg",
  };
}


/* ==== Firma / estilos (usa el logo inline) ==== */
const FIRMA_HTML = `
<table role="presentation" cellpadding="0" cellspacing="0"
       style="font:14px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Ubuntu,'Helvetica Neue',Arial,sans-serif;color:#0f172a;margin-top:24px">
  <tr>
    <td style="padding-right:12px;vertical-align:top">
      <img src="cid:${LOGO_CID}" width="48" height="48" alt="Nuria Zardoya"
           style="border-radius:12px;display:block">
    </td>
    <td style="vertical-align:top">
      <div style="font-weight:700;font-size:16px;color:#0b1220">Nuria Zardoya</div>
      <div style="color:#334155">Dietista-Nutricionista</div>
      <div style="margin-top:6px">
        <a href="mailto:contacto@nuriazardoya.es" style="color:#2563eb;text-decoration:none">contacto@nuriazardoya.es</a>
        &nbsp;·&nbsp;
        <a href="${SITE_URL}/pide-tu-cita/" style="color:#2563eb;text-decoration:none">Pide tu cita</a>
      </div>
      <div style="margin-top:4px">
        <a href="${SITE_URL}" style="color:#64748b;text-decoration:none">nuriazardoya.es</a>
      </div>
    </td>
  </tr>
</table>`;

/* ==== Transporter (Hostalia SMTP -> fallback Gmail) ==== */
function makeTransporter() {
  const useSMTP = !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASS;
  if (useSMTP) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,               // p.ej. "smtp.servidor-correo.net"
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",// false con 587 (STARTTLS); true con 465
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
}

exports.handler = async (event) => {
  try {
    const { payload } = JSON.parse(event.body || "{}");
    const data = payload?.data || {};

    // Campos del formulario
    const to      = (data.email || data.correo || "").trim();
    const name    = (data.name || data.nombre || "").trim();
    const reason  = (data.reason || data.motivo || "").trim();
    const message = (data.message || data.mensaje || "").trim();
    const bot     = (data["bot-field"] || data._gotcha || "").trim(); // honeypot
    if (!to || bot) return { statusCode: 200, body: "skip" };

    // Saneado
    const safeName    = escapeHtml(name || "hola");
    const safeReason  = escapeHtml(trimAndLimit(reason, 140));
    const safeMessage = escapeHtml(trimAndLimit(message, 1200));

    const transporter = makeTransporter();

    // Remitentes / destino
    const FROM    = process.env.MAIL_FROM    || `Nuria Zardoya <${process.env.SMTP_USER || process.env.GMAIL_USER}>`;
    const REPLYTO = process.env.MAIL_REPLYTO || (process.env.SMTP_USER || process.env.GMAIL_USER);
    const NOTIFY  = process.env.NOTIFY_TO    || "nuriazardoyalasheras@gmail.com";

    /* ========= AUTO-REPLY (verde + logo inline) ========= */
    const replyHtml = `
<div style="font-family:system-ui,Segoe UI,Roboto,Arial;max-width:640px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #eef1f3">
  <div style="background:#22c55e;color:#fff;padding:16px 24px">
    <h2 style="margin:0;font-size:20px;line-height:1.3">¡Gracias por tu mensaje, ${safeName}!</h2>
  </div>
  <div style="padding:24px;color:#111827">
    <p>He recibido tu consulta y te responderé con la mayor brevedad.</p>
    ${(safeReason || safeMessage) ? `
    <div style="margin:16px 0;padding:16px;background:#f9fafb;border-radius:10px">
      <p style="margin:0 0 8px;font-weight:600;color:#166534">Resumen</p>
      ${safeReason ? `<p style="margin:0 0 6px"><strong>Motivo:</strong> ${safeReason}</p>` : ``}
      ${safeMessage ? `<p style="margin:0"><strong>Mensaje:</strong> “${safeMessage}”</p>` : ``}
    </div>` : ``}
    <p>Si lo prefieres, puedes <a href="${SITE_URL}/pide-tu-cita/" style="color:#2563eb;text-decoration:none">pedir tu cita online</a> directamente.</p>
    <div style="text-align:center;margin:20px 0">
      <a href="${SITE_URL}/pide-tu-cita/"
         style="display:inline-block;background:#22c55e;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600">
        Pide tu cita
      </a>
    </div>
  </div>
  <div style="background:#f3f4f6;padding:14px 24px;color:#374151;font-size:13px;display:flex;align-items:center;gap:12px">
    <img src="cid:${LOGO_CID}" width="40" height="40" alt="Logo Nuria" style="border-radius:12px;display:block">
    <div style="padding-left:12px">
      <p style="margin:0 0 6px"><strong>Nuria Zardoya</strong> · Dietista–Nutricionista</p>
      <p style="margin:0">
        🌐 <a href="${SITE_URL}" style="color:#15803d;text-decoration:none">Web</a>
        &nbsp;·&nbsp; 📸 <a href="https://www.instagram.com/nutri.zar/" style="color:#15803d;text-decoration:none">Instagram</a>
        &nbsp;·&nbsp; ✉️ <a href="mailto:${REPLYTO}" style="color:#15803d;text-decoration:none">${REPLYTO}</a>
      </p>
    </div>
  </div>
</div>`.trim();

    const replyText = [
      `Hola ${name || "hola"},`,
      `Gracias por tu mensaje. Te responderé en breve.`,
      reason ? `Motivo: ${reason}` : "",
      message ? `Mensaje: ${message}` : "",
      ``,
      `Pide tu cita: ${SITE_URL}/pide-tu-cita/`,
      ``,
      `— Nuria (${REPLYTO})`
    ].filter(Boolean).join("\n");

    // Adjunta el logo inline (un objeto por envío)
    const logoForClient = getLogoAttachment();

    await transporter.sendMail({
      to, from: FROM, replyTo: REPLYTO,
      subject: "Hemos recibido tu mensaje",
      html: replyHtml, text: replyText,
      attachments: [logoForClient],
    });

    /* ========= NOTIFICACIÓN INTERNA (verde + logo inline) ========= */
    const stamp = nowStamp();
    const flatText = [
      `Nueva consulta — ${stamp}`,
      `Nombre: ${name || "-"}`,
      `Email: ${to}`,
      reason ? `Motivo: ${reason}` : "",
      message ? `Mensaje: ${message}` : ""
    ].filter(Boolean).join("\n");

    const notifyHtml = `
<div style="font-family:system-ui,Segoe UI,Roboto,Arial;max-width:700px;margin:auto;background:#ffffff;border:1px solid #eef1f3;border-radius:12px;overflow:hidden">
  <div style="background:#22c55e;color:#fff;padding:14px 20px">
    <h2 style="margin:0;font-size:18px;line-height:1.3">📩 Nueva consulta desde la web</h2>
  </div>
  <div style="padding:20px;color:#111827">
    <div style="display:grid;grid-template-columns:140px 1fr;gap:8px 16px">
      <div style="color:#6b7280">Nombre</div><div><strong>${escapeHtml(name || "-")}</strong></div>
      <div style="color:#6b7280">Email</div><div><a href="mailto:${to}" style="color:#15803d;text-decoration:none">${to}</a></div>
      ${safeReason ? `<div style="color:#6b7280">Motivo</div><div>${safeReason}</div>` : ``}
      ${safeMessage ? `<div style="grid-column:1/-1;color:#6b7280;margin-top:8px">Mensaje</div>` : ``}
      ${safeMessage ? `<div style="grid-column:1/-1"><pre style="white-space:pre-wrap;background:#f9fafb;padding:12px;border-radius:8px;margin:0">${safeMessage}</pre></div>` : ``}
    </div>
    ${FIRMA_HTML}
  </div>
</div>`.trim();

    const logoForNotify = getLogoAttachment();

    await transporter.sendMail({
      from: FROM,
      to: NOTIFY,
      subject: `📩 Nueva consulta — ${stamp}`,
      html: notifyHtml,
      text: flatText,
      attachments: [
        logoForNotify,
        { filename: `consulta-${stamp}.txt`,  content: flatText },
        { filename: `consulta.json`, content: JSON.stringify({ name, email: to, reason, message }, null, 2), contentType: "application/json" }
      ]
    });

    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "error" };
  }
};

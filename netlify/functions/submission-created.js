// netlify/functions/submission-created.js
const nodemailer = require("nodemailer");

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

/* ==== Firma / estilos ==== */
const path = require("path");

// Usa la URL del sitio desde _data/site.json (con fallback seguro)
let SITE_URL = "https://nuriazardoya.es";
for (const guess of ["../../_data/site.json", "../../src/_data/site.json"]) {
  try {
    const s = require(path.resolve(__dirname, guess));
    SITE_URL = s.url || s.site?.url || SITE_URL;
    break;
  } catch (_) {}
}
const LOGO_URL = `${SITE_URL}/images/hero.jpeg`;
const FIRMA_HTML = `
<table role="presentation" cellpadding="0" cellspacing="0" style="font:14px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Ubuntu,'Helvetica Neue',Arial,sans-serif;color:#0f172a;margin-top:24px">
  <tr>
    <td style="padding-right:12px;vertical-align:top">
      ${LOGO_URL ? `<img src="${LOGO_URL}" width="48" height="48" alt="Nuria Zardoya" style="border-radius:12px;display:block">` : ``}
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
      host: process.env.SMTP_HOST,               // ej: "smtp.servidor-correo.net"
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",// false con 587 (STARTTLS), true si usas 465
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  // Fallback a Gmail si no hay SMTP
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
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

    /* ========= AUTO-REPLY AL CLIENTE ========= */
    const replyHtml = `
<div style="font:16px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Ubuntu,'Helvetica Neue',Arial,sans-serif;color:#0f172a;max-width:640px;margin:auto">
  <p style="margin:0 0 14px">Hola ${safeName},</p>
  <p style="margin:0 0 14px">¡Gracias por escribirme! He recibido tu mensaje y te responderé a la mayor brevedad.</p>
  ${(safeReason || safeMessage) ? `
  <div style="margin:16px 0;padding:16px;background:#f9fafb;border-radius:10px">
    <p style="margin:0 0 8px;font-weight:600;color:#334155">Resumen</p>
    ${safeReason ? `<p style="margin:0 0 6px"><strong>Motivo:</strong> ${safeReason}</p>` : ``}
    ${safeMessage ? `<p style="margin:0"><strong>Mensaje:</strong> “${safeMessage}”</p>` : ``}
  </div>` : ``}
  <p style="margin:0 0 14px">Si quieres, puedes <a href="${SITE_URL}/pide-tu-cita/" style="color:#2563eb;text-decoration:none">pedir tu cita online</a> directamente.</p>
  ${FIRMA_HTML}
</div>`.trim();

    const replyText = [
      `Hola ${name || "hola"},`,
      `Gracias por tu mensaje. Te responderé en breve.`,
      reason ? `Motivo: ${reason}` : "",
      message ? `Mensaje: ${message}` : "",
      `\nPide tu cita: ${SITE_URL}/pide-tu-cita/`,
      `\n— Nuria (${REPLYTO})`
    ].filter(Boolean).join("\n");

    await transporter.sendMail({
      to, from: FROM, replyTo: REPLYTO,
      subject: "Hemos recibido tu mensaje",
      html: replyHtml, text: replyText
    });

    /* ========= NOTIFICACIÓN INTERNA ========= */
    const stamp = nowStamp();
    const flatText = [
      `Nueva consulta — ${stamp}`,
      `Nombre: ${name || "-"}`,
      `Email: ${to}`,
      reason ? `Motivo: ${reason}` : "",
      message ? `Mensaje: ${message}` : ""
    ].filter(Boolean).join("\n");

    const notifyHtml = `
<div style="font:14px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Ubuntu,'Helvetica Neue',Arial,sans-serif;color:#0f172a;max-width:700px;margin:auto">
  <h2 style="margin:0 0 10px;font-size:18px">📩 Nueva consulta desde la web</h2>
  <table role="presentation" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;border-collapse:collapse;width:100%;max-width:640px">
    <tr><td style="padding:6px 8px;background:#f8fafc;color:#334155">Nombre</td><td style="padding:6px 8px;border-left:1px solid #e2e8f0;color:#0f172a">${safeName}</td></tr>
    <tr><td style="padding:6px 8px;background:#f8fafc;color:#334155">Email</td><td style="padding:6px 8px;border-left:1px solid #e2e8f0"><a href="mailto:${to}" style="color:#2563eb;text-decoration:none">${to}</a></td></tr>
    ${safeReason ? `<tr><td style="padding:6px 8px;background:#f8fafc;color:#334155">Motivo</td><td style="padding:6px 8px;border-left:1px solid #e2e8f0">${safeReason}</td></tr>` : ``}
    ${safeMessage ? `<tr><td style="padding:6px 8px;background:#f8fafc;color:#334155">Mensaje</td><td style="padding:6px 8px;border-left:1px solid #e2e8f0"><pre style="white-space:pre-wrap;margin:0">${safeMessage}</pre></td></tr>` : ``}
  </table>
  ${FIRMA_HTML}
</div>`.trim();

    await transporter.sendMail({
      from: FROM,
      to: NOTIFY,
      subject: `📩 Nueva consulta — ${stamp}`,
      html: notifyHtml,
      text: flatText,
      attachments: [
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

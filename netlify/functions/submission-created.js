// netlify/functions/submission-created.js
const nodemailer = require("nodemailer");

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
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  // Esto devuelve algo tipo "25/08/2025 11:44"
  const parts = fmt.formatToParts(d).reduce((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});

  // Reordenamos a AAAAMMDD-HHMM
  return `${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}`;
}


exports.handler = async (event) => {
  try {
    const { payload } = JSON.parse(event.body || "{}");
    const data = payload?.data || {};

    // Campos del formulario (aceptamos variantes)
    const to      = (data.email || data.correo || "").trim();
    const name    = (data.name || data.nombre || "hola").trim();
    const reason  = (data.reason || data.motivo || "").trim();
    const message = (data.message || data.mensaje || "").trim();

    // Honeypot
    const bot = (data["bot-field"] || data._gotcha || "").trim();
    if (!to || bot) return { statusCode: 200, body: "skip" };

    // Saneado
    const safeName    = escapeHtml(name);
    const safeReason  = escapeHtml(trimAndLimit(reason, 140));
    const safeMessage = escapeHtml(trimAndLimit(message, 1200));

    // Transporte Gmail (App Password en ENV)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    const from      = process.env.MAIL_FROM    || `Nuria <${process.env.GMAIL_USER}>`;
    const replyTo   = process.env.MAIL_REPLYTO || process.env.GMAIL_USER;
    const notifyTo  = process.env.NOTIFY_TO    || process.env.GMAIL_USER;
    const sigImgURL = process.env.SIGNATURE_IMG_URL || ""; // opcional

    // ========= AUTO-REPLY AL USUARIO =========
    const logoUrl = "https://nuriazardoyalasheras.netlify.app/images/hero.jpeg"; // súbelo a /images si aún no está

    const replyHtml = `
<div style="font-family:system-ui,Segoe UI,Roboto,Arial;max-width:640px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #eef1f3">
  <div style="background:#22c55e;color:#fff;padding:16px 24px">
    <h2 style="margin:0;font-size:20px;line-height:1.3">¡Gracias por tu mensaje, ${safeName}!</h2>
  </div>
  <div style="padding:24px;color:#111827">
    <p>He recibido tu consulta y te responderé personalmente en un plazo de <strong>24–48 horas</strong>.</p>

    ${(safeReason || safeMessage) ? `
    <div style="margin:16px 0;padding:16px;background:#f9fafb;border-radius:10px">
      <p style="margin:0 0 8px;font-weight:600;color:#166534">Resumen de tu mensaje</p>
      ${safeReason ? `<p style="margin:0 0 6px"><strong>Motivo:</strong> ${safeReason}</p>` : ``}
      ${safeMessage ? `<p style="margin:0"><strong>Mensaje:</strong> “${safeMessage}”</p>` : ``}
    </div>` : ``}

    <p>Si quieres <strong>pedir cita directamente</strong> o simplemente ver mi calendario puedes hacerlo desde aquí:</p>

    <div style="text-align:center;margin:20px 0">
      <a href="https://nuriazardoyalasheras.netlify.app/pide-tu-cita/"
         style="display:inline-block;background:#22c55e;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600">
        Pide tu cita
      </a>
    </div>
  </div>
  <div style="background:#f3f4f6;padding:14px 24px;color:#374151;font-size:13px;display:flex;align-items:center;gap:12px">
    <img src="${logoUrl}" alt="Logo Nuria" width="40" height="40" style="border-radius:50%;display:block">
    <div>
      <p style="margin:0 0 6px"><strong>Nuria Zardoya Lasheras</strong> · Dietista–Nutricionista</p>
      <p style="margin:0">
        🌐 <a href="https://nuriazardoyalasheras.netlify.app" style="color:#15803d;text-decoration:none">Web</a>
        &nbsp;·&nbsp; 📸 <a href="https://www.instagram.com/nuriazardoyaa" style="color:#15803d;text-decoration:none">Instagram</a>
        &nbsp;·&nbsp; ✉️ <a href="mailto:${replyTo}" style="color:#15803d;text-decoration:none">${replyTo}</a>
      </p>
    </div>
  </div>
</div>`.trim();

    const replyText = [
      `Gracias por tu mensaje, ${name}!`,
      `He recibido tu consulta y te responderé en 24–48 horas.`,
      reason ? `Motivo: ${reason}` : "",
      message ? `Mensaje: ${message}` : "",
      "",
      "Si quieres acelerar el proceso, puedes pedir cita aquí:",
      "https://nuriazardoyalasheras.netlify.app/pide-tu-cita/",
      "",
      `— Nuria (${replyTo})`
    ].filter(Boolean).join("\n");

    await transporter.sendMail({
      from, to, replyTo,
      subject: "Hemos recibido tu mensaje",
      html: replyHtml,
      text: replyText
    });

    // ========= NOTIFICACIÓN INTERNA (BONITA + ACCIONES + ADJUNTOS) =========
    const stamp = nowStamp();
    const flatText = [
      `Nueva consulta — ${stamp}`,
      `Nombre: ${name}`,
      `Email: ${to}`,
      reason ? `Motivo: ${reason}` : "",
      message ? `Mensaje: ${message}` : ""
    ].filter(Boolean).join("\n");

    const mailtoReply = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent("Respuesta a tu consulta")}&body=${encodeURIComponent(
      `Hola ${name},\n\nGracias por tu mensaje. Te respondo por aquí...\n\n— Nuria`
    )}`;

    const notifyHtml = `
<div style="font-family:system-ui,Segoe UI,Roboto,Arial;max-width:700px;margin:auto;background:#ffffff;border:1px solid #eef1f3;border-radius:12px;overflow:hidden">
  <div style="background:#22c55e;color:#fff;padding:14px 20px">
    <h2 style="margin:0;font-size:18px;line-height:1.3">📩 Nueva consulta desde la web</h2>
  </div>
  <div style="padding:20px;color:#111827">
    <div style="display:grid;grid-template-columns:140px 1fr;gap:8px 16px">
      <div style="color:#6b7280">Nombre</div><div><strong>${safeName}</strong></div>
      <div style="color:#6b7280">Email</div><div><a href="mailto:${to}" style="color:#15803d;text-decoration:none">${to}</a></div>
      ${safeReason ? `<div style="color:#6b7280">Motivo</div><div>${safeReason}</div>` : ``}
      ${safeMessage ? `<div style="grid-column:1/-1;color:#6b7280;margin-top:8px">Mensaje</div>` : ``}
      ${safeMessage ? `<div style="grid-column:1/-1"><pre style="white-space:pre-wrap;background:#f9fafb;padding:12px;border-radius:8px;margin:0">${safeMessage}</pre></div>` : ``}
    </div>

    <div style="margin:16px 0 6px 0; display:flex;gap:10px;flex-wrap:wrap">
      <a href="${mailtoReply}" style="display:inline-block;background:#22c55e;color:#fff;padding:10px 16px;border-radius:999px;text-decoration:none;font-weight:600">Responder ahora</a>
      <a href="https://nuriazardoyalasheras.netlify.app/pide-tu-cita/" style="display:inline-block;border:1px solid #22c55e;color:#15803d;padding:10px 16px;border-radius:999px;text-decoration:none;font-weight:600">Enviar enlace de cita</a>
    </div>

    <p style="margin:12px 0 0 0;color:#6b7280;font-size:12px">Adjunto: TXT y JSON con la consulta (útiles para archivar o imprimir a PDF).</p>
  </div>
</div>`.trim();

    await transporter.sendMail({
      from: process.env.MAIL_FROM || `Web Nuria <${process.env.GMAIL_USER}>`,
      to: notifyTo,
      subject: `📩 Nueva consulta — ${stamp}`,
      html: notifyHtml,
      text: flatText,
      attachments: [
        {
          filename: `consulta-${stamp}.txt`,
          content: flatText
        },
        {
          filename: `consulta.json`,
          content: JSON.stringify({ name, email: to, reason, message }, null, 2),
          contentType: "application/json"
        }
      ]
    });

    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "error" };
  }
};

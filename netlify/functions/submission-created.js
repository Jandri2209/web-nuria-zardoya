// netlify/functions/submission-created.js
const nodemailer = require("nodemailer");

// helpers para seguridad/estética
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function trimAndLimit(str = "", max = 800) {
  const s = String(str).trim();
  return s.length > max ? s.slice(0, max) + "…" : s;
}

exports.handler = async (event) => {
  try {
    const { payload } = JSON.parse(event.body || "{}");
    const data = payload?.data || {};

    // campos del formulario (aceptamos variantes en ES/EN)
    const to      = (data.email || data.correo || "").trim();
    const name    = (data.name || data.nombre || "hola").trim();
    const reason  = (data.reason || data.motivo || "").trim();
    const message = (data.message || data.mensaje || "").trim();

    // honeypots típicos
    const bot = (data["bot-field"] || data._gotcha || "").trim();
    if (!to || bot) return { statusCode: 200, body: "skip" };

    // Sanitizar y limitar por si acaso
    const safeName    = escapeHtml(name);
    const safeReason  = escapeHtml(trimAndLimit(reason, 140));
    const safeMessage = escapeHtml(trimAndLimit(message, 1200));

    // Gmail transport (App Password necesario)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    const from    = process.env.MAIL_FROM    || `Nuria <${process.env.GMAIL_USER}>`;
    const replyTo = process.env.MAIL_REPLYTO || process.env.GMAIL_USER;

    // plantilla HTML con marca y CTA a pedir cita
    const html = `
<div style="font-family:system-ui,Segoe UI,Roboto,Arial;max-width:640px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #eef1f3">
  <div style="background:#22c55e;color:#fff;padding:16px 24px">
    <h2 style="margin:0;font-size:20px;line-height:1.3">¡Gracias por tu mensaje, ${safeName}!</h2>
  </div>
  <div style="padding:24px;color:#111827">
    <p style="margin:0 0 12px 0">He recibido tu consulta y te responderé personalmente en un plazo de <strong>24–48 horas</strong>.</p>

    ${(safeReason || safeMessage) ? `
    <div style="margin:16px 0 8px 0;padding:16px;background:#f9fafb;border-radius:10px">
      <p style="margin:0 0 8px 0;font-weight:600;color:#166534">Resumen de tu mensaje</p>
      ${safeReason ? `<p style="margin:0 0 6px 0"><strong>Motivo:</strong> ${safeReason}</p>` : ``}
      ${safeMessage ? `<p style="margin:0"><strong>Mensaje:</strong> “${safeMessage}”</p>` : ``}
    </div>` : ``}

    <p style="margin:16px 0 0 0">
      Si quieres acelerar el proceso, puedes <strong>pedir cita directamente</strong> y ver mi calendario desde aquí:
    </p>

    <div style="text-align:center;margin:20px 0 6px 0">
      <a href="https://nuriazardoyalasheras.netlify.app/pide-tu-cita/"
         style="display:inline-block;background:#22c55e;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600">
        Pide tu cita
      </a>
    </div>

    <p style="margin:0;color:#6b7280;font-size:13px">Si hiciste este envío por error, puedes ignorar este correo.</p>
  </div>
  <div style="background:#f3f4f6;padding:14px 24px;color:#374151;font-size:13px">
    <p style="margin:0 0 6px 0"><strong>Nuria Zardoya Lasheras</strong> · Dietista–Nutricionista</p>
    <p style="margin:0">
      🌐 <a href="https://nuriazardoyalasheras.netlify.app" style="color:#15803d;text-decoration:none">Web</a>
      &nbsp;·&nbsp; 📸 <a href="https://www.instagram.com/nuriazardoyaa" style="color:#15803d;text-decoration:none">Instagram</a>
      &nbsp;·&nbsp; ✉️ <a href="mailto:${replyTo}" style="color:#15803d;text-decoration:none">${replyTo}</a>
    </p>
  </div>
</div>`.trim();

    // versión de texto plano (mejora entregabilidad)
    const text = [
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
      from,
      to,
      replyTo,
      subject: "Hemos recibido tu mensaje",
      html,
      text
    });

    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "error" };
  }
};

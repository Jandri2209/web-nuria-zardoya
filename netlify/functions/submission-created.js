const nodemailer = require("nodemailer");

exports.handler = async (event) => {
  try {
    const { payload } = JSON.parse(event.body || "{}");
    const data = payload?.data || {};

    const to   = (data.email || "").trim();            // campo "email" del formulario
    const name = (data.name  || "hola").trim();
    const bot  = (data["bot-field"] || data._gotcha || "").trim(); // honeypot

    if (!to || bot) return { statusCode: 200, body: "skip" };

    // Transport Gmail (necesita App Password)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,          // p.ej. nurinutricionista@gmail.com
        pass: process.env.GMAIL_APP_PASSWORD   // App Password (16 chars)
      }
    });

    await transporter.sendMail({
      from: process.env.MAIL_FROM || `Nuria <${process.env.GMAIL_USER}>`,
      to,
      replyTo: process.env.MAIL_REPLYTO || process.env.GMAIL_USER,
      subject: "Hemos recibido tu mensaje",
      html: `
        <div style="font-family:system-ui,Segoe UI,Roboto,Arial">
          <h2>¡Gracias, ${name}!</h2>
          <p>He recibido tu mensaje y te responderé muy pronto.</p>
          <p>— Nuria Zardoya</p>
        </div>`
    });

    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "error" };
  }
};

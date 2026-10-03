const nodemailer = require("nodemailer");

const { APP_EMAIL, APP_PASSWORD, FRONTEND_URL } = require("./config");

function createGmailTransporter() {
  if (!APP_EMAIL || !APP_PASSWORD) {
    throw new Error("APP_EMAIL and APP_PASSWORD must be set in .env");
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: APP_EMAIL,
      pass: APP_PASSWORD,
    },
  });
}

async function mailSender(email , token) {
  const transporter = createGmailTransporter();

  await transporter.sendMail({
    from: `"FoodApp" <${APP_EMAIL}>`,
    to: email,
    subject: "Hello ✔ Your reset token",
    html: `<b>Your reset token is ${token}</b>`,
  });
}


async function sendVerificationEmail(email, token, name = "User") {
  const transporter = createGmailTransporter();
  const verifyLink = `${FRONTEND_URL}/verify-email?token=${token}`;

  await transporter.sendMail({
    from: `"FoodApp" <${APP_EMAIL}>`,
    to: email,
    subject: "Verify your FoodApp account",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
        <h2 style="color: #DCCA87;">Welcome to FoodApp, ${name}!</h2>
        <p>Thanks for signing up. Please verify your email address by clicking the button below:</p>
        <p style="margin: 24px 0;">
          <a href="${verifyLink}"
             style="background: #DCCA87; color: #0C0C0C; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 2px;">
            Verify Email
          </a>
        </p>
        <p>Or copy this link into your browser:</p>
        <p style="word-break: break-all; color: #555;">${verifyLink}</p>
        <p style="color: #888; font-size: 12px;">This link expires in 24 hours.</p>
      </div>
    `,
  });
}

function escapeHtml(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendContactEmail({ name, email, source, message }) {
  const transporter = createGmailTransporter();
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSource = escapeHtml(source || "Not specified");
  const safeMessage = escapeHtml(message);

  await transporter.sendMail({
    from: `"FoodApp Contact" <${APP_EMAIL}>`,
    to: APP_EMAIL,
    replyTo: email,
    subject: `FoodApp contact form — ${name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px;">
        <h2 style="color: #DCCA87;">New contact message</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>How they found us:</strong> ${safeSource}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap; background: #f5f5f5; padding: 12px; border-radius: 4px;">${safeMessage}</p>
      </div>
    `,
  });

  await transporter.sendMail({
    from: `"FoodApp" <${APP_EMAIL}>`,
    to: email,
    subject: "We received your message — FoodApp",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px;">
        <h2 style="color: #DCCA87;">Hi ${safeName},</h2>
        <p>Thanks for reaching out. We received your message and will get back to you soon.</p>
        <p style="color: #888; font-size: 12px;">— FoodApp Team</p>
      </div>
    `,
  });
}

module.exports = mailSender;
module.exports.sendVerificationEmail = sendVerificationEmail;
module.exports.sendContactEmail = sendContactEmail;
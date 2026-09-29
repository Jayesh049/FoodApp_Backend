/**
 * PoC only — uses env via secrets.js (env-only). Prefer Backend/utilities/mailSender.js.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const nodemailer = require("nodemailer");
const secrets = {
  APP_EMAIL: process.env.APP_EMAIL || "",
  APP_PASSWORD: process.env.APP_PASSWORD || "",
};

async function mailSender() {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    secure: true,
    auth: {
      user: secrets.APP_EMAIL,
      pass: secrets.APP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
  let token = "senderdefinedtokenname";
  let dataObj = {
    from: `"FoodApp" <${secrets.APP_EMAIL}>`,
    to: secrets.APP_EMAIL,
    subject: "Hello ✔ Testing from FJP",
    html: `<b>Hello world testing email from fjp learning with token ${token}</b>`,
  };
  await transporter.sendMail(dataObj);
}

mailSender()
  .then(function () {
    console.log("mail send successfully");
  })
  .catch(console.error);

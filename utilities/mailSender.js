const nodemailer = require("nodemailer");

const APP_EMAIL = process.env.APP_EMAIL || require("../secrets").APP_EMAIL;
const APP_PASSWORD = process.env.APP_PASSWORD || require("../secrets").APP_PASSWORD;

async function mailSender(email , token) {
    
  let transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    secure: true, 
    auth: {
      user: APP_EMAIL,
      pass: APP_PASSWORD
    },
    tls : {
        rejectUnauthorized : false
    },
  });

  let dataObj = {
        from: '"Cult fit clone 👻" <foo@example.com>', 
        to: email, 
        subject: "Hello ✔ Your reset token", 
        html: `<b>Your reset token is ${token}</b>`, 
  }
  
  let info = await transporter.sendMail(dataObj);
  
}


module.exports = mailSender;
const nodemailer = require("nodemailer");
const secrets = process.env.secrets || require("../secrets");

async function mailSender() {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    secure: true, 
    auth: {
      user: secrets.APP_EMAIL,
      pass: secrets.APP_PASSWORD
    },
    tls : {
        rejectUnauthorized : false
    },
  });
  let token = "senderdefinedtokenname";
  let dataObj = {
        from: '"Fred Foo 👻" <foo@example.com>', 
        to: "rajguhya421@gmail.com", 
        subject: "Hello ✔ Testing from FJP", 
        html: `<b>Hello world testing email from fjp learning with token ${token}</b>`, 
  }
  let info = await transporter.sendMail(dataObj);
  
}

mailSender().then(function() {
    console.log("mail send successfully")
}).catch(console.error);
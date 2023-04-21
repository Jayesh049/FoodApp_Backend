const nodemailer = require("nodemailer");
const secrets = require("../secrets");

async function mailSender() {
    //input through which mechanism send your email -> port ,facilitator (technical details)
    //ye nodemailer ke website se copy paste maar lo
  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    // port: 25,
    secure: true, 
    auth: {
      user: secrets.APP_EMAIL,
      pass: secrets.APP_PASSWORD
    },
    //mitm attack se bachne ke liye we use tls means
    tls : {
        //do not fail on invalid certificates
        rejectUnauthorized : false
    },
  });
  let token = "senderdefinedtokenname";
  let dataObj = {
        from: '"Fred Foo 👻" <foo@example.com>', // sender address
        to: "rajguhya421@gmail.com", // list of receivers
        subject: "Hello ✔ Testing from FJP", // Subject line
        // text: "Hello world?", // plain text body not necessary to add
       //for defining token inside html we are uding backtick
        html: `<b>Hello world testing email from fjp learning with token ${token}</b>`, // html body
  }
  // send mail with defined transport object
  let info = await transporter.sendMail(dataObj);
  
}

mailSender().then(function() {
    console.log("mail send successfully")
}).catch(console.error);
const nodemailer = require("nodemailer");
const secrets = require("../secrets");
async function mailSender(email , token) {
    {/*input through which mechanism send your email -> port ,facilitator (technical details)
    ye nodemailer ke website se copy paste maar lo
    create reusable transporter object using the default SMTP transport */}
  let transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
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

  let dataObj = {
        from: '"Cult fit clone 👻" <foo@example.com>', // sender address
        to: email, // list of receivers
        subject: "Hello ✔ Your reset token", // Subject line
        // text: "Hello world?", // plain text body not necessary to add
       //for defining token inside html we are uding backtick
        html: `<b>Your reset token is ${token}</b>`, // html body
  }
  // send mail with defined transport object
  let info = await transporter.sendMail(dataObj);
  
}

//error tha email aur token ke through hi bataana tha ki mail send successfully for postman
//email , token
// mailSender(email , token).then(function() {
//     console.log("mail send successfully")
// }).catch(console.error);

module.exports = mailSender;
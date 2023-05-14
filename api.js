const express = require("express");
const app = express();
//token name is -> JWT & mechanism -> cookies
//represent -> collection
const cookieParser = require('cookie-parser');

//jsonwebtoken
// const jwt = require("jsonwebtoken");//npm install jswonwebtoken
// const secrets = require("./secrets");
//tojen name is -> JWT & mechanism -> cookies
//represent -> collection
const userRouter = require("./routes/userRoutes");
const authRouter = require("./routes/authRoutes");
const planRouter = require("./routes/planRoutes");
const reviewRouter = require("./routes/reviewRoutes");



//to add post body data to req.body
app.use(express.json());//getting users body data
//add cookies to req.cookies
app.use(cookieParser());
//database ki jitni bhi call hoti hai wo async hoti h

//apply the rate limiting middleware to API Calls only
// app.use(cors());

// //authRouter for authorization controller functions like signup , login ,forgetPassword , resetPassword
// const authRouter = express.Router();
// //userRouter for getting all users and profile page of user
// const userRouter = express.Router();
//making path version is good practice for developer
app.use("/api/v1/auth" , authRouter);
app.use("/api/v1/user" , userRouter);
app.use("/api/v1/plan" , planRouter);
app.use("/api/v1/review", reviewRouter);



// app.use(function(req ,res){
//   res.send("<h1>Backend  API</h1>");
// })


// localhost:3000 -> express API
app.listen(process.env.PORT || 3000 ,function() {
    console.log("server started at port 3000");
})



/*

{
  name: 'Jasbir',
  password: 'abcd',
  confirmPassword: 'abcd',
  email: 'abc@gmail.com',
  phonenumber: '9560884197',
  pic: 'dp.png',
  !unique id mongodb provide karta hai
  _id: new ObjectId("6433bc951a0750cce4beb9ee"),
  !mongoose
  __v: 0
}
*/ 




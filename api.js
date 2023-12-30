
const express = require("express");
const multer = require('multer');
const app = express();
const config  = require("dotenv");
const KEY_ID = process.env.KEY_ID || require("./secrets").KEY_ID;


//token name is -> JWT & mechanism -> cookies
//represent -> collection
// config({ path: "./config/config.env" });

const cookieParser = require('cookie-parser');
const cors = require("cors");
//jsonwebtoken
// const jwt = require("jsonwebtoken");//npm install jswonwebtoken
// const secrets = require("./secrets");
//tojen name is -> JWT & mechanism -> cookies
//represent -> collection
const userRouter = require("./routes/userRoutes");
const authRouter = require("./routes/authRoutes");
const planRouter = require("./routes/planRoutes");
const reviewRouter = require("./routes/reviewRoutes");
const bookingRouter = require("./routes/bookingRoutes");

// to  add post body data to req.body
const rateLimit = require('express-rate-limit')

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

// to access the file public in image
app.use('/uploads', express.static('uploads'))

// Apply the rate limiting middleware to API calls only
app.use(cors());
app.use('/api', apiLimiter);


app.use(express.json());

app.use(cookieParser());




app.use("/api/v1/auth" , authRouter);
app.use("/api/v1/user" , userRouter);
app.use("/api/v1/plan" , planRouter);
app.use("/api/v1/review", reviewRouter);
app.use("/api/v1/booking" , bookingRouter);



app.get("/api/getkey", (req, res) =>
  res.status(200).json({ key: KEY_ID })
);




app.listen(process.env.PORT || 3000 ,function() {
    console.log("server started at port 3000");
})











/*

// //authRouter for authorization controller functions like signup , login ,forgetPassword , resetPassword
// const authRouter = express.Router();
// //userRouter for getting all users and profile page of user
// const userRouter = express.Router(); */

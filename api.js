
const express = require("express");
const multer = require('multer');
const app = express();
const config  = require("dotenv");
const KEY_ID = process.env.KEY_ID || require("./secrets").KEY_ID;




const cookieParser = require('cookie-parser');
const cors = require("cors");

const userRouter = require("./routes/userRoutes");
const authRouter = require("./routes/authRoutes");
const planRouter = require("./routes/planRoutes");
const reviewRouter = require("./routes/reviewRoutes");
const bookingRouter = require("./routes/bookingRoutes");


const rateLimit = require('express-rate-limit')

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, 
    standardHeaders: true,
    legacyHeaders: false, 
})


app.use('/uploads', express.static('uploads'));
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










  
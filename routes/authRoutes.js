const express = require('express');
const authRouter = express.Router();
const FooduserModel = require("../model/userModule");
const { signupController , loginController,
    resetPasswordController , forgetPasswordController} = require("../controller/authController");
    

// app.post("/api/v1/auth/signup" , signupController);//!1st way
authRouter.post("/signup", signupController);
//for sending res to postman
authRouter.post("/login", loginController);
//for updation we use patch for sending res to frontend or postman
authRouter.patch("/forgetPassword", forgetPasswordController);
authRouter.patch("/resetPassword", resetPasswordController);
module.exports = authRouter;
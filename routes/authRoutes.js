const express = require("express");
const rateLimit = require("express-rate-limit");
const authRouter = express.Router();
const {
  signupController,
  verifyEmailController,
  loginController,
  resetPasswordController,
  forgetPasswordController,
} = require("../controller/authController");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many auth attempts. Try again later." },
});

authRouter.use(authLimiter);

authRouter.post("/signup", signupController);
authRouter.get("/verify-email/:token", verifyEmailController);
authRouter.post("/login", loginController);
authRouter.patch("/forgetPassword", forgetPasswordController);
authRouter.patch("/resetPassword", resetPasswordController);

module.exports = authRouter;

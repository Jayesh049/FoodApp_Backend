const express = require("express");
const rateLimit = require("express-rate-limit");
const authRouter = express.Router();
const { validate } = require("../middleware/validate");
const {
  signup,
  login,
  forgetPassword,
  resetPassword,
} = require("../utilities/schemas");
const {
  signupController,
  verifyEmailController,
  demoLoginController,
  loginController,
  resetPasswordController,
  forgetPasswordController,
  issueCsrf,
  logoutController,
  protectRoute,
} = require("../controller/authController");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 20 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many auth attempts. Try again later." },
});

authRouter.use(authLimiter);

authRouter.get("/csrf", issueCsrf);
authRouter.post("/logout", protectRoute, logoutController);
authRouter.post("/signup", validate(signup), signupController);
authRouter.get("/verify-email/:token", verifyEmailController);
authRouter.post("/login", validate(login), loginController);
authRouter.post("/demo", demoLoginController);
authRouter.patch("/forgetPassword", validate(forgetPassword), forgetPasswordController);
authRouter.patch("/resetPassword", validate(resetPassword), resetPasswordController);

module.exports = authRouter;

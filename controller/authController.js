const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const JWTSECRET = process.env.JWTSECRET || "";

const FooduserModel = require("../model/userModule");
const mailSender = require("../utilities/mailSender");
const { sendVerificationEmail } = require("../utilities/mailSender");
const { getAdminConfig } = require("../utilities/ensureAdminUser");

function isConfiguredAdminEmail(email) {
  const { email: adminEmail } = getAdminConfig();
  if (!adminEmail || !email) return false;
  return email.toLowerCase().trim() === adminEmail;
}

async function signupController(req, res) {
  try {
    let data = req.body;
    if (isConfiguredAdminEmail(data.email)) {
      return res.status(400).json({
        result: "This email is reserved for admin login. Please use Log In instead.",
      });
    }
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const emailVerificationExpiry = Date.now() + 24 * 60 * 60 * 1000;

    const newUser = await FooduserModel.create({
      name: data.name,
      password: data.password,
      confirmPassword: data.confirmPassword,
      email: data.email,
      role: "user",
      isEmailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpiry,
    });

    try {
      await sendVerificationEmail(data.email, verificationToken, data.name);
      console.log("Verification email sent to:", data.email);
    } catch (emailErr) {
      await FooduserModel.findByIdAndDelete(newUser._id);
      console.error("Verification email failed:", emailErr);
      return res.status(500).json({
        result:
          "Could not send verification email. Please check email settings and try again.",
      });
    }

    res.status(201).json({
      result: "Signup successful. Please check your email to verify your account.",
      email: data.email,
    });
  } catch (err) {
    res.status(400).json({
      result: err.message,
    });
  }
}

async function verifyEmailController(req, res) {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ result: "Verification token is missing" });
    }

    const user = await FooduserModel.findOne({ emailVerificationToken: token });
    if (!user) {
      return res.status(400).json({ result: "Invalid or already used verification link" });
    }

    if (user.emailVerificationExpiry && Date.now() > user.emailVerificationExpiry) {
      return res
        .status(400)
        .json({ result: "Verification link has expired. Please sign up again." });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;
    await user.save();

    res.status(200).json({
      result: "Email verified successfully. You can now log in.",
    });
  } catch (err) {
    res.status(500).json({ result: err.message });
  }
}

async function loginController(req, res) {
  try {
    let data = req.body;
    let { email, password } = data;

    if (email && password) {
      let user = await FooduserModel.findOne({ email: email });
      if (user) {
        const matches = await user.comparePassword(password);
        if (!matches) {
          return res.status(403).json({
            result: "email or password does not match",
          });
        }

        // Migrate legacy plaintext passwords to bcrypt on successful login
        if (!String(user.password).startsWith("$2")) {
          user.password = password;
          user.confirmPassword = password;
          await user.save();
        }

        if (user.isEmailVerified === false) {
          return res.status(403).json({
            result:
              "Please verify your email before logging in. Open the link we sent to your inbox, then try again.",
            needsVerification: true,
          });
        }

        const token = jwt.sign(
          {
            data: user["_id"],
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
          },
          JWTSECRET
        );

        const isProd = process.env.NODE_ENV === "production";
        res.cookie("JWT", token, {
          httpOnly: true,
          sameSite: isProd ? "strict" : "lax",
          secure: isProd,
          maxAge: 24 * 60 * 60 * 1000,
        });

        user.password = undefined;
        user.confirmPassword = undefined;

        console.log("login", user.email);
        res.status(200).json({
          result: "ok",
          user,
          token: `Bearer ${token}`,
        });
      } else {
        res.status(400).json({
          result: "user not found",
        });
      }
    } else {
      res.status(400).json({
        result: "user not found kindly signup",
      });
    }
  } catch (err) {
    res.status(500).json({
      result: err.message,
    });
  }
}

async function resetPasswordController(req, res) {
  try {
    let { otp, password, confirmPassword, email } = req.body;
    let user = await FooduserModel.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ result: "user with this email not found" });
    }
    let currentTime = Date.now();
    if (currentTime > user.otpExpiry) {
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();

      return res.status(200).json({
        result: "Otp expired",
      });
    }
    if (user.otp != otp) {
      return res.status(200).json({
        message: "wrong otp",
      });
    }

    user.password = password;
    user.confirmPassword = confirmPassword;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    user.password = undefined;
    user.confirmPassword = undefined;
    res.status(201).json({
      user: user,
      result: "User password reset",
    });
  } catch (err) {
    res.status(500).json({
      result: err.message,
    });
    console.log(err);
  }
}

async function forgetPasswordController(req, res) {
  try {
    let { email } = req.body;

    let user = await FooduserModel.findOne({ email });
    if (user) {
      let otp = otpGenerator();
      let afterFiveMin = Date.now() + 5 * 60 * 1000;
      await mailSender(email, otp);
      user.otp = otp;
      user.otpExpiry = afterFiveMin;
      await user.save();
      res.status(204).json({
        result: "Otp send to your email",
      });
    } else {
      res.status(404).json({
        result: "user with this email not found",
      });
    }
  } catch (err) {
    res.status(500).json({ result: err.message });
    console.log(err.message);
  }
}

function otpGenerator() {
  return Math.floor(100000 + Math.random() * 900000);
}

function protectRoute(req, res, next) {
  try {
    const cookieToken = req.cookies && req.cookies.JWT;
    const authHeader = req.headers && req.headers.authorization;

    let rawToken = cookieToken;
    if (!rawToken && authHeader && typeof authHeader === "string") {
      rawToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : authHeader;
    }

    if (!rawToken) {
      return res
        .status(401)
        .json({ message: "You are not logged in. Kindly login." });
    }

    const payload = jwt.verify(rawToken, JWTSECRET);
    const userId = payload && payload.data;

    if (!userId) {
      return res.status(401).json({ message: "Invalid token. Kindly login." });
    }

    req.userId = userId;
    next();
  } catch (err) {
    console.log(err);
    if (err.message == "invalid signature") {
      res.status(401).json({ message: "Token invalid kindly login" });
    } else {
      res.status(401).json({ message: err.message });
    }
  }
}

async function protectAdminRoute(req, res, next) {
  try {
    if (!req.userId) {
      return res
        .status(401)
        .json({ message: "You are not logged in. Kindly login." });
    }
    const user = await FooduserModel.findById(req.userId).select("role");
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

module.exports = {
  signupController,
  verifyEmailController,
  loginController,
  resetPasswordController,
  forgetPasswordController,
  protectRoute,
  protectAdminRoute,
};

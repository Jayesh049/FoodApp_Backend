const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const config = require("../utilities/config");
const { JWTSECRET } = config;
const logger = require("../utilities/logger");

const FooduserModel = require("../model/userModule");
const mailSender = require("../utilities/mailSender");
const { sendVerificationEmail } = require("../utilities/mailSender");
const { getAdminConfig } = require("../utilities/ensureAdminUser");
const {
  newCsrfToken,
  setCsrfCookie,
  setJwtCookie,
  clearAuthCookies,
  tokenVersionMatches,
} = require("../utilities/sessionCookies");

function isConfiguredAdminEmail(email) {
  const { email: adminEmail } = getAdminConfig();
  if (!adminEmail || !email) return false;
  return user.email.toLowerCase().trim() === adminEmail;
}

async function issueSession(res, user) {
  const token = jwt.sign(
    {
      data: user["_id"],
      tv: user.tokenVersion || 0,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    },
    JWTSECRET
  );
  const csrfToken = newCsrfToken();
  setJwtCookie(res, token);
  setCsrfCookie(res, csrfToken);
  user.password = undefined;
  user.confirmPassword = undefined;
  user.otp = undefined;
  return csrfToken;
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
    } catch (emailErr) {
      await FooduserModel.findByIdAndDelete(newUser._id);
      logger.error({ err: emailErr }, "verification email failed");
      return res.status(503).json({
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

async function verifyEmailController(req, res, next) {
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
    next(err);
  }
}

async function loginController(req, res, next) {
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

        const csrfToken = await issueSession(res, user);

        res.status(200).json({
          result: "ok",
          user,
          csrfToken,
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
    next(err);
  }
}

async function demoLoginController(req, res, next) {
  try {
    const email = config.optional("DEMO_EMAIL").toLowerCase().trim();
    const password = config.optional("DEMO_PASSWORD");
    if (!email || !password) {
      return res.status(404).json({ result: "Demo login is not configured" });
    }
    const user = await FooduserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ result: "Demo user is not seeded" });
    }
    const matches = await user.comparePassword(password);
    if (!matches) {
      return res.status(403).json({ result: "Demo login failed" });
    }
    const csrfToken = await issueSession(res, user);
    res.status(200).json({ result: "ok", user, csrfToken });
  } catch (err) {
    next(err);
  }
}

async function resetPasswordController(req, res, next) {
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
    const submitted = hashOtp(otp);
    const stored = Buffer.from(String(user.otp || ""), "utf8");
    const given = Buffer.from(submitted, "utf8");
    const otpMatches =
      stored.length === given.length && crypto.timingSafeEqual(stored, given);
    if (!otpMatches) {
      return res.status(200).json({
        message: "wrong otp",
      });
    }

    user.password = password;
    user.confirmPassword = confirmPassword;
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    user.password = undefined;
    user.confirmPassword = undefined;
    res.status(201).json({
      user: user,
      result: "User password reset",
    });
  } catch (err) {
    next(err);
  }
}

async function forgetPasswordController(req, res, next) {
  try {
    let { email } = req.body;

    let user = await FooduserModel.findOne({ email });
    if (user) {
      let otp = otpGenerator();
      let afterFiveMin = Date.now() + 5 * 60 * 1000;
      await mailSender(email, otp);
      user.otp = hashOtp(otp);
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
    next(err);
  }
}

function otpGenerator() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashOtp(otp) {
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
}

async function protectRoute(req, res, next) {
  try {
    const rawToken = req.cookies && req.cookies.JWT;

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

    const user = await FooduserModel.findById(userId).select("tokenVersion");
    if (!user || !tokenVersionMatches(payload.tv, user.tokenVersion)) {
      return res.status(401).json({ message: "Session ended. Kindly login." });
    }

    req.userId = userId;
    next();
  } catch (err) {
    if (err.message == "invalid signature") {
      res.status(401).json({ message: "Token invalid kindly login" });
    } else {
      res.status(401).json({ message: err.message });
    }
  }
}

function issueCsrf(req, res) {
  const csrfToken = newCsrfToken();
  setCsrfCookie(res, csrfToken);
  res.status(200).json({ csrfToken });
}

async function logoutController(req, res) {
  await FooduserModel.updateOne(
    { _id: req.userId },
    { $inc: { tokenVersion: 1 } }
  );
  clearAuthCookies(res);
  res.status(200).json({ result: "ok" });
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
    return next(err);
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
  issueCsrf,
  logoutController,
  demoLoginController,
};

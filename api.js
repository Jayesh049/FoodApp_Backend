require("dotenv").config();
const config = require("./utilities/config");
config.assertBootConfig();

const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const KEY_ID = config.KEY_ID;
const FRONTEND_URL = config.FRONTEND_URL;

const userRouter = require("./routes/userRoutes");
const authRouter = require("./routes/authRoutes");
const planRouter = require("./routes/planRoutes");
const reviewRouter = require("./routes/reviewRoutes");
const bookingRouter = require("./routes/bookingRoutes");
const locationRouter = require("./routes/locationRoutes");
const deliveryRouter = require("./routes/deliveryRoutes");
const mediaRouter = require("./routes/mediaRoutes");
const sectionRouter = require("./routes/sectionRoutes");
const suggestRouter = require("./routes/suggestRoutes");
const contactRouter = require("./routes/contactRoutes");
const { logRagStartupStatus } = require("./controller/suggestController");
const { ensureAdminUser, ensureDemoUser } = require("./utilities/ensureAdminUser");
const { errorHandler } = require("./middleware/errorHandler");
const crypto = require("crypto");
const fs = require("fs");
const pinoHttp = require("pino-http");
const { handleRazorpayWebhook } = require("./controller/bookingController");
const { stripeWebhook, createStripeSession } = require("./controller/stripeController");
const { requireCsrf } = require("./utilities/sessionCookies");

const { initSentry, sentryErrorHandler } = require("./utilities/sentry");
const { mountSwagger } = require("./utilities/swagger");
initSentry();

const app = express();

const isProd = process.env.NODE_ENV === "production";
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 100 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Try again later." },
});

app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader("X-Request-Id", req.id);
  next();
});
app.use(
  pinoHttp({
    autoLogging: process.env.NODE_ENV !== "test",
    quietReqLogger: true,
    genReqId: (req) => req.id,
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.body.password",
        "req.body.confirmPassword",
        "req.body.otp",
        "req.body.razorpaySignature",
      ],
      censor: "[redacted]",
    },
  })
);
app.use(
  helmet({
    // FE (e.g. :3001) embeds API uploads (:3000); same-origin CORP blocks those <img>s.
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);
app.use(
  "/uploads",
  express.static("uploads", {
    setHeaders(res, filePath) {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      try {
        const fd = fs.openSync(filePath, "r");
        const magic = Buffer.alloc(3);
        fs.readSync(fd, magic, 0, 3, 0);
        fs.closeSync(fd);
        if (magic[0] === 0xff && magic[1] === 0xd8 && magic[2] === 0xff) {
          res.setHeader("Content-Type", "image/jpeg");
        }
      } catch (_err) {
        /* keep the extension content type */
      }
    },
  })
);
app.use(cookieParser());
app.post(
  "/api/v1/booking/webhook",
  express.raw({ type: "application/json" }),
  handleRazorpayWebhook
);
app.use("/api", apiLimiter);
app.post(
  "/api/v1/booking/stripe-webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);
app.use(express.json({ limit: "100kb" }));
app.use(requireCsrf);

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/plan", planRouter);
app.use("/api/v1/review", reviewRouter);
app.use("/api/v1/booking", bookingRouter);
app.use("/api/v1/location", locationRouter);
app.use("/api/v1/delivery", deliveryRouter);
app.use("/api/v1/media", mediaRouter);
app.use("/api/v1/sections", sectionRouter);
app.use("/api/v1/suggest", suggestRouter);
app.use("/api/v1/contact", contactRouter);

app.get("/api/getkey", (req, res) => res.status(200).json({ key: KEY_ID }));

mountSwagger(app);

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/health/ready", async (req, res) => {
  try {
    const mongoose = require("mongoose");
    const dbReady = mongoose.connection.readyState === 1;
    if (!dbReady) {
      return res.status(503).json({ status: "not_ready", db: false });
    }
    res.status(200).json({ status: "ready", db: true });
  } catch (err) {
    res.status(503).json({ status: "not_ready", message: err.message });
  }
});

app.use(sentryErrorHandler());
app.use(errorHandler);

["DB_LINK", "JWTSECRET"].forEach((key) => {
  if (!process.env[key]) {
    console.error(`[config] Missing ${key}. Set it in Render Environment, not secrets.js.`);
  }
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, function () {
    console.log("server started at port", port);
    setTimeout(() => {
      ensureAdminUser().catch((err) =>
        console.error("[admin] seed failed:", err.message)
      );
      ensureDemoUser().catch((err) =>
        console.error("[demo] seed failed:", err.message)
      );
      logRagStartupStatus();
    }, 3000);
  });
}

module.exports = app;

require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const KEY_ID = process.env.KEY_ID || require("./secrets").KEY_ID;
const FRONTEND_URL =
  process.env.FRONTEND_URL || require("./secrets").FRONTEND_URL || "http://localhost:3001";

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
const { ensureAdminUser } = require("./utilities/ensureAdminUser");
const { errorHandler } = require("./middleware/errorHandler");
const pinoHttp = require("pino-http");

const app = express();

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(
  pinoHttp({
    autoLogging: process.env.NODE_ENV !== "test",
    quietReqLogger: true,
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
    setHeaders(res) {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);
app.use("/api", apiLimiter);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

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

app.use(errorHandler);

const port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log("server started at port", port);
  setTimeout(() => {
    ensureAdminUser().catch((err) =>
      console.error("[admin] seed failed:", err.message)
    );
    logRagStartupStatus();
  }, 3000);
});

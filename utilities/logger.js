const pino = require("pino");

const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  redact: {
    paths: ["password", "confirmPassword", "otp", "req.body.password", "req.headers.authorization", "req.headers.cookie"],
    censor: "[redacted]",
  },
});

module.exports = logger;

const Sentry = require("@sentry/node");
const config = require("./config");

function scrubEvent(event) {
  if (event.request) {
    delete event.request.cookies;
    if (event.request.headers) {
      delete event.request.headers.cookie;
      delete event.request.headers.authorization;
    }
  }
  return event;
}

function initSentry() {
  const dsn = config.SENTRY_DSN;
  if (!dsn) return false;
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend: scrubEvent,
  });
  return true;
}

function sentryErrorHandler() {
  if (!config.SENTRY_DSN) {
    return function skipSentry(_err, _req, _res, next) {
      next(_err);
    };
  }
  return Sentry.expressErrorHandler();
}

module.exports = { initSentry, sentryErrorHandler };

const crypto = require("crypto");

function cookieFlags() {
  const isProd = process.env.NODE_ENV === "production";
  const configured = String(process.env.COOKIE_SAME_SITE || "").toLowerCase();
  const allowed = configured === "strict" || configured === "lax" || configured === "none";
  // The live site and API are different hosts, so a strict cookie is dropped.
  // COOKIE_SAME_SITE can force strict, lax, or none.
  const sameSite = allowed ? configured : isProd ? "none" : "lax";
  return {
    sameSite,
    secure: isProd || sameSite === "none",
    path: "/",
  };
}

function newCsrfToken() {
  return crypto.randomBytes(32).toString("hex");
}

function setCsrfCookie(res, token) {
  res.cookie("csrf", token, {
    ...cookieFlags(),
    httpOnly: false,
    maxAge: 24 * 60 * 60 * 1000,
  });
}

function setJwtCookie(res, token) {
  res.cookie("JWT", token, {
    ...cookieFlags(),
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookies(res) {
  const flags = cookieFlags();
  res.clearCookie("JWT", { ...flags, httpOnly: true });
  res.clearCookie("csrf", { ...flags, httpOnly: false });
}

const CSRF_EXEMPT = [
  "/api/v1/auth/login",
  "/api/v1/auth/demo",
  "/api/v1/auth/signup",
  "/api/v1/auth/forgetpassword",
  "/api/v1/auth/resetpassword",
  "/api/v1/booking/webhook",
];

function csrfExempt(req) {
  const path = String(req.path || "").toLowerCase();
  if (path.startsWith("/api/v1/auth/verify-email")) return true;
  return CSRF_EXEMPT.some((item) => path === item || path.startsWith(`${item}/`));
}

function requireCsrf(req, res, next) {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return next();
  if (csrfExempt(req)) return next();
  const cookie = req.cookies && req.cookies.csrf;
  const header = req.get("x-csrf-token");
  if (!cookie || !header || cookie !== header) {
    return res.status(403).json({ message: "CSRF check failed" });
  }
  return next();
}

function tokenVersionMatches(payloadVersion, userVersion) {
  return Number(payloadVersion || 0) === Number(userVersion || 0);
}

module.exports = {
  newCsrfToken,
  setCsrfCookie,
  setJwtCookie,
  clearAuthCookies,
  requireCsrf,
  tokenVersionMatches,
};

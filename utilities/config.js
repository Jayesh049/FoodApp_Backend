function required(key) {
  const value = process.env[key];
  if (value === undefined || String(value).trim() === "") {
    throw new Error(`[config] Missing required env: ${key}`);
  }
  return String(value).trim();
}

function optional(key, fallback = "") {
  const value = process.env[key];
  if (value === undefined || String(value).trim() === "") return fallback;
  return String(value).trim();
}

function assertBootConfig() {
  required("JWTSECRET");
  required("DB_LINK");
}

module.exports = {
  required,
  optional,
  assertBootConfig,
  get JWTSECRET() {
    return required("JWTSECRET");
  },
  get DB_LINK() {
    return required("DB_LINK");
  },
  get KEY_ID() {
    return optional("KEY_ID");
  },
  get KEY_SECRET() {
    return optional("KEY_SECRET");
  },
  get WEBHOOK_SECRET() {
    return optional("WEBHOOK_SECRET");
  },
  get APP_EMAIL() {
    return optional("APP_EMAIL");
  },
  get APP_PASSWORD() {
    return optional("APP_PASSWORD");
  },
  get HF_TOKEN() {
    return optional("HF_TOKEN");
  },
  get STRIPE_SECRET_KEY() {
    return optional("STRIPE_SECRET_KEY");
  },
  get STRIPE_WEBHOOK_SECRET() {
    return optional("STRIPE_WEBHOOK_SECRET");
  },
  get FRONTEND_URL() {
    return optional("FRONTEND_URL", "http://localhost:3001");
  },
  get SENTRY_DSN() {
    return optional("SENTRY_DSN");
  },
};

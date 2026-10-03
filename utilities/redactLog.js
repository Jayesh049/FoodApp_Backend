const SECRET_KEY = /password|otp|razorpaySignature|jwtsecret|key_secret|webhook_secret/i;

function redactValue(value) {
  if (Array.isArray(value)) return value.map(redactValue);
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const [key, inner] of Object.entries(value)) {
    out[key] = SECRET_KEY.test(key) ? "[redacted]" : redactValue(inner);
  }
  return out;
}

module.exports = { redactValue, SECRET_KEY };

const crypto = require("crypto");

function checkoutDigest(secret, orderId, paymentId) {
  return crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
}

function signaturesMatch(expectedHex, providedHex) {
  const expected = Buffer.from(String(expectedHex || ""), "utf8");
  const provided = Buffer.from(String(providedHex || ""), "utf8");
  if (expected.length === 0 || expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(expected, provided);
}

function webhookDigest(secret, rawBody) {
  const payload = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody || ""));
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

module.exports = {
  checkoutDigest,
  signaturesMatch,
  webhookDigest,
};

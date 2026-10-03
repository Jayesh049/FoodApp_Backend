/**
 * Mark stale pending checkouts from Razorpay: paid ones confirm, the rest fail.
 * Usage: node scripts/reconcile-payments.js
 */
require("dotenv").config();
require("../model/userModule");
const mongoose = require("mongoose");
const { reconcilePayments } = require("../controller/bookingController");

function waitForDb() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("DB timeout")), 30000);
    mongoose.connection.once("connected", () => {
      clearTimeout(t);
      resolve();
    });
    mongoose.connection.once("error", (err) => {
      clearTimeout(t);
      reject(err);
    });
  });
}

(async () => {
  await waitForDb();
  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      console.log(JSON.stringify(body));
    },
  };
  await reconcilePayments({ userId: "script" }, res, (err) => {
    console.error(err.message);
    process.exitCode = 1;
  });
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

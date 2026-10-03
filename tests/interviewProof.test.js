const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { cartTotalFromPlans, toPaise } = require("../utilities/checkoutPricing");
const { checkoutDigest, signaturesMatch, webhookDigest } = require("../utilities/paymentSignature");
const { confirmCheckoutPayment } = require("../utilities/confirmCheckout");
const { redactValue } = require("../utilities/redactLog");
const { gatePlanIds, stripUnknownIds, ownBookingSummary } = require("../utilities/suggestGuard");
const { requireCsrf, tokenVersionMatches } = require("../utilities/sessionCookies");

function memoryDeps() {
  const checkouts = [];
  const payments = [];
  const bookings = [];
  const events = [];
  return {
    checkouts,
    payments,
    bookings,
    events,
    CheckoutOrder: {
      async findOne(q) {
        return checkouts.find((c) => c.razorpayOrderId === q.razorpayOrderId) || null;
      },
      async updateOne(q, update) {
        const row = checkouts.find((c) => c.razorpayOrderId === q.razorpayOrderId);
        if (row && update.$set) Object.assign(row, update.$set);
      },
    },
    Payment: {
      async findOne(q) {
        return payments.find((p) => p.razorpayPaymentId === q.razorpayPaymentId) || null;
      },
      async create(doc) {
        const row = Array.isArray(doc) ? doc[0] : doc;
        if (payments.some((p) => p.razorpayPaymentId === row.razorpayPaymentId)) {
          const err = new Error("dup");
          err.code = 11000;
          throw err;
        }
        payments.push({ ...row });
        return row;
      },
    },
    Booking: {
      async updateMany(filter, update) {
        const ids = (filter._id.$in || []).map(String);
        for (const booking of bookings) {
          if (!ids.includes(String(booking._id))) continue;
          if (String(booking.user) !== String(filter.user)) continue;
          if (booking.status !== filter.status) continue;
          Object.assign(booking, update.$set);
        }
      },
    },
    PaymentEvent: {
      async create(doc) {
        const row = Array.isArray(doc) ? doc[0] : doc;
        events.push(row);
        return row;
      },
    },
    async runTransaction(work) {
      return work(null);
    },
  };
}

describe("checkout price ignores the client", () => {
  it("charges stored plan price and discount", () => {
    const total = cartTotalFromPlans([
      { plan: { price: 200, discount: 10 }, quantity: 2 },
    ]);
    assert.equal(total, 360);
    assert.equal(toPaise(total), 36000);
  });
});

describe("payment signatures", () => {
  it("accepts a matching checkout signature and rejects a bad webhook", () => {
    const digest = checkoutDigest("secret", "order_1", "pay_1");
    assert.equal(signaturesMatch(digest, digest), true);
    const raw = Buffer.from('{"event":"payment.captured"}');
    const good = webhookDigest("hook", raw);
    assert.equal(signaturesMatch(good, "nope"), false);
  });
});

describe("confirm checkout", () => {
  it("refuses another user's order and confirms once", async () => {
    const deps = memoryDeps();
    deps.checkouts.push({
      razorpayOrderId: "order_1",
      user: "userA",
      bookingIds: ["b1"],
      status: "pending",
    });
    deps.bookings.push({ _id: "b1", user: "userA", status: "pending" });

    await assert.rejects(
      () =>
        confirmCheckoutPayment(deps, {
          razorpayOrderId: "order_1",
          razorpayPaymentId: "pay_1",
          requestUserId: "userB",
        }),
      (err) => err.statusCode === 403
    );
    assert.equal(deps.bookings[0].status, "pending");

    const first = await confirmCheckoutPayment(deps, {
      razorpayOrderId: "order_1",
      razorpayPaymentId: "pay_1",
      requestUserId: "userA",
    });
    const second = await confirmCheckoutPayment(deps, {
      razorpayOrderId: "order_1",
      razorpayPaymentId: "pay_1",
      requestUserId: "userA",
    });
    assert.equal(first.duplicate, false);
    assert.equal(second.duplicate, true);
    assert.equal(deps.bookings[0].status, "confirmed");
    assert.equal(deps.payments.length, 1);
  });
});

describe("suggest and logs", () => {
  it("drops invented ids and hides secrets", () => {
    const allowed = ["aaaaaaaaaaaaaaaaaaaaaaaa"];
    assert.deepEqual(gatePlanIds(allowed, ["bbbbbbbbbbbbbbbbbbbbbbbb", allowed[0]]), [allowed[0]]);
    const text = stripUnknownIds(`see ${allowed[0]} and bbbbbbbbbbbbbbbbbbbbbbbb`, allowed);
    assert.match(text, new RegExp(allowed[0]));
    assert.doesNotMatch(text, /bbbbbbbbbbbbbbbbbbbbbbbb/);
    const redacted = redactValue({ password: "secret", razorpaySignature: "sig", name: "dal" });
    assert.equal(redacted.password, "[redacted]");
    assert.equal(redacted.razorpaySignature, "[redacted]");
    assert.equal(redacted.name, "dal");
    const summary = ownBookingSummary({
      _id: "b1",
      user: "other",
      status: "pending",
      quantity: 1,
      priceAtThatTime: 10,
      bookedAt: "now",
    });
    assert.equal(summary.user, undefined);
  });

  it("rejects a csrf header that does not match the cookie", () => {
    let status = 0;
    const res = {
      status(code) {
        status = code;
        return this;
      },
      json() {
        return this;
      },
    };
    requireCsrf(
      { method: "POST", path: "/api/v1/booking/verification", cookies: { csrf: "a" }, get: () => "b" },
      res,
      () => {
        throw new Error("should not pass");
      }
    );
    assert.equal(status, 403);
    assert.equal(tokenVersionMatches(1, 2), false);
    assert.equal(tokenVersionMatches(0, undefined), true);
  });
});

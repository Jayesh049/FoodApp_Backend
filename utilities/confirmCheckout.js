function statusError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function insertDoc(Model, doc, session) {
  if (session) return Model.create([doc], { session });
  return Model.create(doc);
}

async function confirmCheckoutPayment(deps, input) {
  const { CheckoutOrder, Payment, Booking, PaymentEvent, runTransaction } = deps;
  const orderId = input.razorpayOrderId || input.orderCreationId;
  const paymentId = input.razorpayPaymentId;

  const checkout = await CheckoutOrder.findOne({ razorpayOrderId: orderId });
  if (!checkout) throw statusError("Checkout not found", 404);

  if (input.requestUserId && String(checkout.user) !== String(input.requestUserId)) {
    throw statusError("Order does not belong to you", 403);
  }

  const stored = (checkout.bookingIds || []).map(String);
  let ids = stored;
  if (Array.isArray(input.requestedBookingIds) && input.requestedBookingIds.length > 0) {
    const bad = input.requestedBookingIds.filter((id) => !stored.includes(String(id)));
    if (bad.length) {
      throw statusError("One or more bookings do not belong to you", 403);
    }
    ids = input.requestedBookingIds.map(String);
  }

  const existing = await Payment.findOne({ razorpayPaymentId: paymentId });
  if (existing || checkout.status === "paid") {
    await PaymentEvent.create({
      kind: "duplicate",
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      reason: "already recorded",
      createdAt: new Date(),
    });
    return { duplicate: true, orderId };
  }

  const outcome = await runTransaction(async (session) => {
    try {
      await insertDoc(
        Payment,
        {
          razorpayPaymentId: paymentId,
          razorpayOrderId: orderId,
          razorpaySignature: input.razorpaySignature || "",
          orderCreationId: input.orderCreationId || orderId,
        },
        session
      );
    } catch (err) {
      if (err && err.code === 11000) return { duplicate: true };
      throw err;
    }

    const opts = session ? { session } : {};
    await Booking.updateMany(
      { _id: { $in: ids }, user: checkout.user, status: "pending" },
      { $set: { status: "confirmed" } },
      opts
    );
    await CheckoutOrder.updateOne(
      { razorpayOrderId: orderId },
      { $set: { status: "paid" } },
      opts
    );
    await insertDoc(
      PaymentEvent,
      {
        kind: "captured",
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        reason: "payment captured",
        createdAt: new Date(),
      },
      session
    );
    return { duplicate: false };
  });

  if (outcome && outcome.duplicate) {
    await PaymentEvent.create({
      kind: "duplicate",
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      reason: "duplicate key",
      createdAt: new Date(),
    });
    return { duplicate: true, orderId };
  }

  return { duplicate: false, orderId };
}

async function failCheckout(deps, checkout) {
  await deps.Booking.updateMany(
    { _id: { $in: checkout.bookingIds }, user: checkout.user, status: "pending" },
    { $set: { status: "failed" } }
  );
  await deps.CheckoutOrder.updateOne(
    { razorpayOrderId: checkout.razorpayOrderId },
    { $set: { status: "failed" } }
  );
}

const STALE_MS = 15 * 60 * 1000;

async function reconcileStaleCheckouts(deps, options = {}) {
  const olderThanMs = options.olderThanMs || STALE_MS;
  const now = options.now || Date.now();
  const cutoff = new Date(now - olderThanMs);
  const stale = await deps.CheckoutOrder.find({
    status: "pending",
    createdAt: { $lt: cutoff },
  });
  const results = [];
  for (const checkout of stale) {
    const order = await deps.fetchOrder(checkout.razorpayOrderId);
    if (order && order.status === "paid") {
      const payments = await deps.fetchPayments(checkout.razorpayOrderId);
      const items = (payments && payments.items) || [];
      const captured = items.find((p) => p.status === "captured") || items[0];
      if (!captured || !captured.id) {
        results.push({ razorpayOrderId: checkout.razorpayOrderId, action: "skipped" });
        continue;
      }
      await confirmCheckoutPayment(deps, {
        razorpayOrderId: checkout.razorpayOrderId,
        razorpayPaymentId: captured.id,
        razorpaySignature: "reconcile",
        orderCreationId: checkout.razorpayOrderId,
      });
      results.push({ razorpayOrderId: checkout.razorpayOrderId, action: "confirmed" });
    } else {
      await failCheckout(deps, checkout);
      results.push({ razorpayOrderId: checkout.razorpayOrderId, action: "failed" });
    }
  }
  return results;
}

module.exports = {
  confirmCheckoutPayment,
  failCheckout,
  reconcileStaleCheckouts,
  STALE_MS,
};

const FoodBookingModel = require("../model/bookingModel");
const UserModel = require("../model/userModule");
const FoodplanModel = require("../model/planModel");
const Razorpay = require("razorpay");
const CheckoutOrder = require("../model/checkoutOrderModel");
const FoodpaymentModel = require("../model/paymentModel");
const PaymentEvent = require("../model/paymentEventModel");
const { cartTotalFromPlans, toPaise, chargedLine } = require("../utilities/checkoutPricing");
const { checkoutDigest, signaturesMatch, webhookDigest } = require("../utilities/paymentSignature");
const { confirmCheckoutPayment, reconcileStaleCheckouts } = require("../utilities/confirmCheckout");
const { runMoneyTransaction } = require("../utilities/moneyTransaction");

const { KEY_ID, KEY_SECRET, WEBHOOK_SECRET } = require("../utilities/config");

let razorpay = null;
function getRazorpay() {
  if (!KEY_ID || !KEY_SECRET) {
    const err = new Error("KEY_ID and KEY_SECRET must be set in the environment");
    err.statusCode = 503;
    throw err;
  }
  if (!razorpay) {
    razorpay = new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });
  }
  return razorpay;
}

function paymentDeps() {
  return {
    CheckoutOrder,
    Payment: FoodpaymentModel,
    Booking: FoodBookingModel,
    PaymentEvent,
    runTransaction: runMoneyTransaction,
  };
}

function sameUserId(a, b) {
  return String(a) === String(b);
}

async function isAdminUser(userId) {
  const user = await UserModel.findById(userId).select("role");
  return Boolean(user && user.role === "admin");
}

async function initiateBooking(req, res, next) {
  try {
    const userId = req.userId;
    const idempotencyKey = req.get("Idempotency-Key");
    if (idempotencyKey) {
      const existing = await CheckoutOrder.findOne({ user: userId, idempotencyKey });
      if (existing) {
        return res.status(200).json({
          id: existing.razorpayOrderId,
          amount: existing.amountPaise,
          bookings: existing.bookingIds,
          reused: true,
          message: "Existing order returned",
        });
      }
    }
    const cartItems = req.body.cartItems || [req.body];

    if (!userId) {
      return res.status(401).json({ message: "You are not logged in. Kindly login." });
    }
    if (!cartItems.length || !cartItems[0] || !(cartItems[0]._id || cartItems[0].plan)) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const priced = [];
    for (const item of cartItems) {
      const planDetails = await FoodplanModel.findById(item._id || item.plan);
      if (!planDetails) {
        return res.status(404).json({
          message: `Plan not found: ${item._id || item.plan}`,
        });
      }
      const quantity = item.quantity || 1;
      priced.push({
        plan: planDetails,
        quantity,
        line: chargedLine(planDetails, quantity),
      });
    }

    const totalAmount = cartTotalFromPlans(priced);
    const bookings = [];
    for (const row of priced) {
      const booking = await FoodBookingModel.create({
        bookedAt: new Date(),
        priceAtThatTime: row.line,
        user: userId,
        plan: row.plan._id,
        status: "pending",
        quantity: row.quantity,
        planDetails: {
          image: row.plan.image,
          price: row.plan.price,
          discount: row.plan.discount,
          reviews: row.plan.reviews,
        },
      });
      bookings.push(booking);
    }

    const user = await UserModel.findById(userId);
    if (user) {
      user.bookings.push(...bookings.map((booking) => booking._id));
      await user.save();
    }

    const response = await getRazorpay().orders.create({
      amount: toPaise(totalAmount),
      currency: "INR",
      receipt: `rs_${bookings[0]._id}`,
    });

    await CheckoutOrder.create({
      razorpayOrderId: response.id,
      user: userId,
      bookingIds: bookings.map((booking) => booking._id),
      amountPaise: toPaise(totalAmount),
      idempotencyKey: idempotencyKey || undefined,
      status: "pending",
      createdAt: new Date(),
    });

    res.status(200).json({
      id: response.id,
      currency: response.currency,
      amount: response.amount,
      bookings,
      totalAmount,
      message: "Bookings created successfully",
      entity: response.id,
      response,
    });
  } catch (err) {
    next(err);
  }
}

async function verifyPayment(req, res, next) {
  try {
    const {
      orderCreationId,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
      bookingIds,
    } = req.body || {};

    if (!orderCreationId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ message: "Missing payment fields" });
    }

    const digest = checkoutDigest(KEY_SECRET, orderCreationId, razorpayPaymentId);
    if (!signaturesMatch(digest, razorpaySignature)) {
      await PaymentEvent.create({
        kind: "rejected",
        razorpayOrderId: razorpayOrderId || orderCreationId,
        razorpayPaymentId,
        reason: "bad checkout signature",
        createdAt: new Date(),
      });
      return res.status(400).json({ msg: "Transaction not legit!" });
    }

    const result = await confirmCheckoutPayment(paymentDeps(), {
      razorpayOrderId: razorpayOrderId || orderCreationId,
      razorpayPaymentId,
      razorpaySignature,
      orderCreationId,
      requestUserId: req.userId,
      requestedBookingIds: bookingIds,
    });

    res.json({
      msg: "success",
      duplicate: Boolean(result.duplicate),
      orderId: result.orderId,
      paymentId: razorpayPaymentId,
    });
  } catch (err) {
    next(err);
  }
}

async function handleRazorpayWebhook(req, res) {
  try {
    if (!WEBHOOK_SECRET) {
      return res.status(503).json({ message: "WEBHOOK_SECRET is not set" });
    }
    const raw = req.body;
    const header = req.get("x-razorpay-signature") || "";
    const digest = webhookDigest(WEBHOOK_SECRET, raw);
    if (!signaturesMatch(digest, header)) {
      await PaymentEvent.create({
        kind: "rejected",
        reason: "bad webhook signature",
        createdAt: new Date(),
      });
      return res.status(400).json({ message: "Invalid webhook signature" });
    }

    const payload = JSON.parse(Buffer.isBuffer(raw) ? raw.toString("utf8") : String(raw || "{}"));
    if (payload.event !== "payment.captured") {
      return res.status(200).json({ ignored: true });
    }
    const payment = payload.payload && payload.payload.payment && payload.payload.payment.entity;
    if (!payment || !payment.order_id || !payment.id) {
      return res.status(400).json({ message: "Webhook payment payload missing" });
    }

    const result = await confirmCheckoutPayment(paymentDeps(), {
      razorpayOrderId: payment.order_id,
      razorpayPaymentId: payment.id,
      razorpaySignature: "webhook",
      orderCreationId: payment.order_id,
    });
    return res.status(200).json({ ok: true, duplicate: Boolean(result.duplicate) });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ message: err.message || "Webhook failed" });
  }
}

async function reconcilePayments(req, res, next) {
  try {
    const results = await reconcileStaleCheckouts(
      {
        ...paymentDeps(),
        fetchOrder: (id) => getRazorpay().orders.fetch(id),
        fetchPayments: (id) => getRazorpay().orders.fetchPayments(id),
      },
      {}
    );
    res.status(200).json({ results });
  } catch (err) {
    next(err);
  }
}

async function listPaymentEvents(req, res, next) {
  try {
    const events = await PaymentEvent.find().sort({ createdAt: -1 }).limit(100);
    res.status(200).json({ events });
  } catch (err) {
    next(err);
  }
}

async function getBookingById(req, res, next) {
  try {
    const id = req.params.bookingId;
    const booking = await FoodBookingModel.findById(id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    const admin = await isAdminUser(req.userId);
    if (!admin && !sameUserId(booking.user, req.userId)) {
      return res.status(403).json({ message: "Not allowed to view this booking" });
    }
    res.status(200).json({ result: "booking found", booking });
  } catch (err) {
    next(err);
  }
}

async function getBookings(req, res, next) {
  try {
    const admin = await isAdminUser(req.userId);
    const filter = admin ? {} : { user: req.userId };
    const bookings = await FoodBookingModel.find(filter).sort({ bookedAt: -1 });
    res.status(200).json(bookings);
  } catch (err) {
    next(err);
  }
}

async function deleteAllBookings(req, res, next) {
  try {
    await FoodBookingModel.deleteMany({});
    await UserModel.updateMany({}, { $set: { bookings: [] } });
    res.status(200).json({ message: "All bookings deleted successfully" });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  initiateBooking,
  verifyPayment,
  handleRazorpayWebhook,
  reconcilePayments,
  listPaymentEvents,
  getBookings,
  getBookingById,
  deleteAllBookings,
  paymentDeps,
};

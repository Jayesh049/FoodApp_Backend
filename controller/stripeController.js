const Stripe = require("stripe");
const FoodplanModel = require("../model/planModel");
const FoodBookingModel = require("../model/bookingModel");
const CheckoutOrder = require("../model/checkoutOrderModel");
const UserModel = require("../model/userModule");
const { chargedLine, cartTotalFromPlans, toPaise } = require("../utilities/checkoutPricing");
const { confirmCheckoutPayment } = require("../utilities/confirmCheckout");
const { paymentDeps } = require("./bookingController");

function stripeClient() {
  const key = require("../utilities/config").STRIPE_SECRET_KEY;
  if (!key) {
    const err = new Error("STRIPE_SECRET_KEY is not set");
    err.statusCode = 503;
    throw err;
  }
  return new Stripe(key);
}

async function createStripeSession(req, res, next) {
  try {
    const userId = req.userId;
    const cartItems = req.body.cartItems || [req.body];
    if (!cartItems.length || !(cartItems[0]._id || cartItems[0].plan)) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const priced = [];
    for (const item of cartItems) {
      const plan = await FoodplanModel.findById(item._id || item.plan);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }
      const quantity = item.quantity || 1;
      priced.push({ plan, quantity, line: chargedLine(plan, quantity) });
    }

    const totalAmount = cartTotalFromPlans(priced);
    const bookings = [];
    for (const row of priced) {
      bookings.push(
        await FoodBookingModel.create({
          bookedAt: new Date(),
          priceAtThatTime: row.line,
          user: userId,
          plan: row.plan._id,
          status: "pending",
          quantity: row.quantity,
        })
      );
    }
    const user = await UserModel.findById(userId);
    if (user) {
      user.bookings.push(...bookings.map((booking) => booking._id));
      await user.save();
    }

    const origin = require("../utilities/config").FRONTEND_URL.replace(/\/$/, "");
    const session = await stripeClient().checkout.sessions.create({
      mode: "payment",
      success_url: `${origin}/paymentsuccess?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/allPlans`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "inr",
            unit_amount: toPaise(totalAmount),
            product_data: { name: "FoodApp order" },
          },
        },
      ],
      metadata: { userId: String(userId) },
    });

    await CheckoutOrder.create({
      razorpayOrderId: session.id,
      user: userId,
      bookingIds: bookings.map((booking) => booking._id),
      amountPaise: toPaise(totalAmount),
      status: "pending",
    });

    res.status(200).json({ url: session.url, id: session.id });
  } catch (err) {
    next(err);
  }
}

async function stripeWebhook(req, res, next) {
  try {
    const secret = require("../utilities/config").STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      return res.status(503).json({ message: "STRIPE_WEBHOOK_SECRET is not set" });
    }
    const event = stripeClient().webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      secret
    );
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      await confirmCheckoutPayment(paymentDeps(), {
        razorpayOrderId: session.id,
        razorpayPaymentId: String(session.payment_intent || session.id),
        razorpaySignature: "stripe",
        orderCreationId: session.id,
      });
    }
    res.json({ received: true });
  } catch (err) {
    err.statusCode = 400;
    next(err);
  }
}

module.exports = { createStripeSession, stripeWebhook };

const FoodBookingModel = require("../model/bookingModel");
const UserModel = require("../model/userModule");
const FoodplanModel = require("../model/planModel");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const FoodpaymentModel = require("../model/paymentModel.js");

const KEY_ID = process.env.KEY_ID || "";
const KEY_SECRET = process.env.KEY_SECRET || "";

let razorpay = null;
function getRazorpay() {
  if (!KEY_ID || !KEY_SECRET) {
    const err = new Error("KEY_ID and KEY_SECRET must be set in the environment");
    err.statusCode = 503;
    throw err;
  }
  if (!razorpay) {
    razorpay = new Razorpay({
      key_id: KEY_ID,
      key_secret: KEY_SECRET,
    });
  }
  return razorpay;
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
    const cartItems = req.body.cartItems || [req.body];
    const totalAmount = req.body.price || req.body.priceAtThatTime;

    if (!userId) {
      return res.status(401).json({ message: "You are not logged in. Kindly login." });
    }

    if (!cartItems.length) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    if (totalAmount === undefined || totalAmount === null) {
      return res.status(400).json({ message: "Price is required" });
    }

    const bookings = [];
    for (const item of cartItems) {
      const planDetails = await FoodplanModel.findById(item._id || item.plan);

      if (!planDetails) {
        return res.status(404).json({
          message: `Plan not found: ${item._id || item.plan}`,
        });
      }

      const bookingData = {
        bookedAt: new Date(),
        priceAtThatTime: item.price || planDetails.price,
        user: userId,
        plan: item._id || item.plan,
        status: "pending",
        quantity: item.quantity || 1,
        planDetails: {
          image: planDetails.image,
          price: planDetails.price,
          discount: planDetails.discount,
          reviews: planDetails.reviews,
        },
      };

      const booking = await FoodBookingModel.create(bookingData);
      bookings.push(booking);
    }

    let user = await UserModel.findById(userId);
    if (user) {
      const bookingIds = bookings.map((booking) => booking._id);
      user.bookings.push(...bookingIds);
      await user.save();
    }

    const amount = Math.round(Number(totalAmount) * 100);
    const currency = "INR";
    const options = {
      amount,
      currency,
      receipt: `rs_${bookings[0]._id}`,
    };

    const response = await getRazorpay().orders.create(options);

    res.status(200).json({
      id: response.id,
      currency: response.currency,
      amount: response.amount,
      bookings: bookings,
      totalAmount: totalAmount,
      message: "Bookings created successfully",
      entity: response.id,
      response,
    });
  } catch (err) {
    next(err);
  }
}

async function confirmBookingsAfterPayment(bookingIds, orderCreationId, ownerUserId) {
  if (Array.isArray(bookingIds) && bookingIds.length > 0) {
    await FoodBookingModel.updateMany(
      {
        _id: { $in: bookingIds },
        user: ownerUserId,
        status: "pending",
      },
      { $set: { status: "confirmed" } }
    );
    return;
  }

  if (!orderCreationId) return;

  try {
    const order = await getRazorpay().orders.fetch(orderCreationId);
    const receipt = order && order.receipt;
    if (!receipt || !receipt.startsWith("rs_")) return;

    const primaryBookingId = receipt.slice(3);
    const primaryBooking = await FoodBookingModel.findById(primaryBookingId);
    if (!primaryBooking) return;
    if (!sameUserId(primaryBooking.user, ownerUserId)) return;

    const bookedAt = primaryBooking.bookedAt || new Date();
    const windowStart = new Date(bookedAt.getTime() - 60000);
    const windowEnd = new Date(bookedAt.getTime() + 60000);

    await FoodBookingModel.updateMany(
      {
        user: ownerUserId,
        status: "pending",
        bookedAt: { $gte: windowStart, $lte: windowEnd },
      },
      { $set: { status: "confirmed" } }
    );
  } catch (err) {
    console.log("Could not confirm bookings from order receipt:", err.message);
  }
}

async function verifyPayment(req, res, next) {
  try {
    const userId = req.userId;
    const secret = KEY_SECRET;
    const {
      orderCreationId,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
      bookingIds,
    } = req.body;

    if (!orderCreationId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ message: "Missing payment fields" });
    }

    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(`${orderCreationId}|${razorpayPaymentId}`);
    const digest = shasum.digest("hex");

    if (digest !== razorpaySignature) {
      return res.status(400).json({ msg: "Transaction not legit!" });
    }

    if (Array.isArray(bookingIds) && bookingIds.length > 0) {
      const ownedCount = await FoodBookingModel.countDocuments({
        _id: { $in: bookingIds },
        user: userId,
      });
      if (ownedCount !== bookingIds.length) {
        return res.status(403).json({
          message: "One or more bookings do not belong to you",
        });
      }
    } else if (orderCreationId) {
      const order = await getRazorpay().orders.fetch(orderCreationId);
      const receipt = order && order.receipt;
      if (receipt && receipt.startsWith("rs_")) {
        const primary = await FoodBookingModel.findById(receipt.slice(3));
        if (!primary || !sameUserId(primary.user, userId)) {
          return res.status(403).json({ message: "Order does not belong to you" });
        }
      }
    }

    await FoodpaymentModel.create({
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
      orderCreationId,
    });

    await confirmBookingsAfterPayment(bookingIds, orderCreationId, userId);

    res.json({
      msg: "success",
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
    });
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

    res.status(200).json({
      result: "booking found",
      booking,
    });
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

    res.status(200).json({
      message: "All bookings deleted successfully",
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  initiateBooking,
  verifyPayment,
  getBookings,
  getBookingById,
  deleteAllBookings,
};

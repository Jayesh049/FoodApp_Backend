const FoodBookingModel = require("../model/bookingModel");
const UserModel = require("../model/userModule");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const FoodpaymentModel = require("../model/paymentModel.js");

const KEY_ID = process.env.KEY_ID || require("../secrets").KEY_ID;
const KEY_SECRET = process.env.KEY_SECRET || require("../secrets").KEY_SECRET;
const razorpay = new Razorpay({
  key_id: KEY_ID,
  key_secret: KEY_SECRET,
});
async function initiateBooking(req, res) {
  try {
    let booking = await FoodBookingModel.create(req.body);
    let bookingId = booking["_id"];
    console.log(bookingId);
    console.log(bookingId);
    let userId = req.body.user;
    console.log(userId);
    let user = await UserModel.findById(userId);
    console.log(user);
    user.bookings.push(bookingId);
    await user.save();
    const amount = req.body.priceAtThatTime * 100;
    const currency = "INR";
    const options = {
      amount,
      currency,
      receipt: `rs_${bookingId}`,
    };
    const response = await razorpay.orders.create(options);
    console.log(response);
    res.status(200).json({
      id: response.id,
      currency: response.currency,
      amount: response.amount,
      booking: booking,
      message: "booking created",
      entity: response.id,
      response,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: err.message,
    });
  }
}

async function verifyPayment(req, res) {
  const secret = KEY_SECRET;
  try {
    const {
      orderCreationId,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
    } = req.body;

    const shasum = crypto.createHmac("sha256", secret);

    shasum.update(`${orderCreationId}|${razorpayPaymentId}`);

    const digest = shasum.digest("hex");

    if (digest !== razorpaySignature)
      return res.status(400).json({ msg: "Transaction not legit!" });

    let newPayment =  await FoodpaymentModel.create({
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
      orderCreationId
    });
    console.log(newPayment);

    res.json({
      msg: "success",
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
    });
   
    
  } catch (error) {
    res.status(500).send(error);
  }
}

async function getBookingById(req, res) {
  try {
    let bookings = await FoodBookingModel.find();

    console.log(bookings);
    let id = req.params.bookings;
    console.log(id);
    let booking = await FoodBookingModel.findById(bookings);
    res.status(200).json({
      result: "booking found",
      booking: booking,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      err: err.message,
    });
  }
}
async function getBookings(req, res) {
  try {
    let bookings = await FoodBookingModel.find();
    res.status(200).json(bookings);
  } catch (err) {
    res.end(err.message);
  }
}


module.exports = {
  initiateBooking,
  verifyPayment,
  getBookings,
  getBookingById,
};

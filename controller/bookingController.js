const FoodBookingModel = require("../model/bookingModel");
const UserModel = require("../model/userModule");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const FoodpaymentModel = require("../model/paymentModel.js");
const axios = require('axios');

const KEY_ID = process.env.KEY_ID || require("../secrets").KEY_ID;
const KEY_SECRET = process.env.KEY_SECRET || require("../secrets").KEY_SECRET;
const razorpay = new Razorpay({
  key_id: KEY_ID,
  key_secret: KEY_SECRET,
});
async function initiateBooking(req, res) {
  try {
  
    const plansResponse = await axios.get(`https://foodappbackend-lk5m.onrender.com/api/v1/plan/${req.body.plan}`);
    console.log(plansResponse.data.plan)
    const planDetails = plansResponse.data.plan;
    console.log(planDetails);
    const bookingData = {
      bookedAt: new Date(),
      priceAtThatTime: planDetails.price,
      user: req.body.user,
      plan: req.body.plan,
      status: req.body.status,
      planDetails: {
        image: planDetails.image,
        price: planDetails.price,
        discount: planDetails.discount,
        reviews: planDetails.reviews,
      }
    };

    console.log(bookingData);

    let booking = await FoodBookingModel.create(bookingData);
    let bookingId = booking["_id"];
    console.log(bookingId);

  
    let user = await UserModel.findById(req.body.user);
    if (user) {
      user.bookings.push(bookingId);
      await user.save();
    }

  
    const amount = req.body.priceAtThatTime ;
    const currency = "INR";
    const options = {
      amount,
      currency,
      receipt: `rs_${bookingId}`,
    };

    const response = await razorpay.orders.create(options);
   
    res.status(200).json({
      id: response.id,
      currency: response.currency,
      amount: response.amount,
      booking: booking,
      planDetails: planDetails, // Include all plan details in the response
      message: "Booking created",
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


async function deleteAllBookings(req, res) {
  try {
    // Delete all bookings
    await FoodBookingModel.deleteMany({});

    // Optionally, clear the bookings array in all users
    await UserModel.updateMany({}, { $set: { bookings: [] } });

    res.status(200).json({
      message: "All bookings deleted successfully"
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: err.message,
    });
  }
}
module.exports = {
  initiateBooking,
  verifyPayment,
  getBookings,
  getBookingById,
  deleteAllBookings,
};





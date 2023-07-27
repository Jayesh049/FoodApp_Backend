
// router
const FoodBookingModel = require("../model/bookingModel");
const UserModel = require("../model/userModule");
const Razorpay = require("razorpay");
const crypto = require('crypto');


// console.log("Hello",process.env);
const KEY_ID = process.env.KEY_ID || require("../secrets").KEY_ID;
const KEY_SECRET = process.env.KEY_SECRET || require("../secrets").KEY_SECRET
const razorpay = new Razorpay({
    key_id: KEY_ID,
    key_secret: KEY_SECRET,
});
// createbooking
async function initiateBooking(req, res) {
    try {
        // 1. add a booking to booking model
        let booking = await FoodBookingModel.create(req.body);
        let bookingId = booking["_id"];
        // 2.add uid of that booing to userModel
        let userId = req.body.user;
        let user = await UserModel.findById(userId);
        console.log(user);
        var order = new Object() , stack =[];
        for(var i = 0 ; i< user.length ;i++){
            parseInt(order[i].bookings.push(bookingId));
        }
        // user.bookings.push(bookingId);
        await user.save();
        // 3. razorpay -> order create send 
        const amount = req.body.priceAtThatTime;
        const currency = "INR";
        const options = {
            amount,
            currency,
            receipt: `rs_${bookingId}`,
        };
        const response = await razorpay.orders.create(options);
        console.log(response);
        // 4 respond to client 
        res.status(200).json({
            id: response.id,
            currency: response.currency,
            amount: response.amount,
            booking: booking,
            message: "booking created",
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            message: err.message,

        })
    }
}
async function verifyPayment(req, res) {
    // JWT 
    const secret = KEY_SECRET;
    console.log(req.body);
    // const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    // req.body;

    // const body = razorpay_order_id + "|" + razorpay_payment_id;

    // 
    const shasum = crypto.createHmac("sha256", secret);
    console.log(shasum);
    shasum.update(JSON.stringify(req.body));

    const digest = shasum.digest("hex");

    console.log(digest, req.headers["x-razorpay-signature"]);

    if (digest === req.headers["x-razorpay-signature"]) {
    //   payment is done 
        console.log("request is legit");
        res.status(200).json({
            message: "OK",
        });
    } else {
        res.status(403).json({ message: "Invalid" });
    }
};

async function getBookingById(req, res) {
    try {
        let id = req.params.bookingId;
        let booking = await FoodBookingModel.findById(id);
        res.status(200).json({
            result: "booking found",
            booking: booking

        });

    } catch (err) {
        console.log(err);
        res.status(500).json({
            err: err.message
        })
    }
}
async function getBookings(req, res) {
    try {
        let bookings = await FoodBookingModel.find();
        // to send json data ;
        res.status(200).json(bookings);
    } catch (err) {
        res.end(err.message);
    }
}
module.exports = {
    initiateBooking,
    verifyPayment,
    getBookings, getBookingById
}
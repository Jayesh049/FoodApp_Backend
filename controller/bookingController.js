
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  const isAuthentic = expectedSignature === razorpay_signature;

  if (isAuthentic) {
    // Database comes here

    await Payment.create({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });
      res.status(200).json({
        success: true,
      })
    res.redirect(
      `http://localhost:3000/paymentsuccess?reference=${razorpay_payment_id}`
    );
  } else {
    res.status(400).json({
      success: false,
    });
  }
};
// async function verifyPayment(req, res) {
//     // JWT 
//     const secret = KEY_SECRET;
//     const {order_id, payment_id} = req.body;
//     const razorpay_signature = req.headers['x-razorpay-signature'];
//     console.log(req.body);
//     /**************************************************************/ 

//     const shasum = crypto.createHmac("sha256", secret);
    
//     shasum.update(order_id +"|" + payment_id);
    
//     const generated_signature = shasum.digest("hex");
    
//     console.log(generated_signature , razorpay_signature)
//     if(razorpay_signature == generated_signature){
//         console.log("request is legit");
//         res.status(200).json({
//             message: "Payment Verified",
//         });
//     }
//     else{
//         res.status(403).json({ message: "Invalid" });
//     }

    
    
   
// };

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
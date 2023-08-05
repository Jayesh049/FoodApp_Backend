// boooking ke baad hi we will do payment so we have to create new paymentmodel inside the backend


const Razorpay = require("razorpay");

const Payment = require("../model/paymentModel");
const crypto = require("crypto");

const KEY_ID = process.env.KEY_ID || require("../secrets").KEY_ID;
const KEY_SECRET = process.env.KEY_SECRET || require("../secrets").KEY_SECRET

const razorpay = new Razorpay({
  key_id: KEY_ID,
  key_secret: KEY_SECRET,
});

 async function checkout(req, res) {
  const options = {
    amount: 50000,
    currency: "INR",
  };
  const order = await razorpay.orders.create(options);

  res.status(200).json({
    success: true,
    order,
  });
};

 async function paymentVerification (req, res) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =   req.body;
  console.log(req.body);
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

module.exports = {
  checkout,
  paymentVerification
}
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  
            razorpayOrderId: {
    type: String,
    required: true,
  },
  razorpayPaymentId: {
    type: String,
    required: true,
  },
  razorpaySignature: {
    type: String,
    required: true,
  },
  orderCreationId: {
    type: String,
    required: true,
  },
});

const FoodpaymentModel = mongoose.model
    // name of the collection, the set of rules this collection should follow
    ('paymentModel', paymentSchema);
module.exports = FoodpaymentModel;
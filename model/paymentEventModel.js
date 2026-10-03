const mongoose = require("mongoose");

const paymentEventSchema = new mongoose.Schema({
  kind: {
    type: String,
    enum: ["captured", "duplicate", "rejected"],
    required: true,
  },
  razorpayOrderId: { type: String, default: "" },
  razorpayPaymentId: { type: String, default: "" },
  reason: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("paymentEventModel", paymentEventSchema);

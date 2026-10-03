const mongoose = require("mongoose");

const checkoutOrderSchema = new mongoose.Schema({
  razorpayOrderId: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.ObjectId, ref: "FooduserModel", required: true },
  bookingIds: [{ type: mongoose.Schema.ObjectId, ref: "FoodbookingModel" }],
  amountPaise: { type: Number, required: true },
  idempotencyKey: { type: String },
  status: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
});

checkoutOrderSchema.index(
  { user: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: "string" } },
  }
);

module.exports = mongoose.model("checkoutOrderModel", checkoutOrderSchema);

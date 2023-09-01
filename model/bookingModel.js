const mongoose = require("mongoose");
const bookingSchema = new mongoose.Schema({
    user: {
        // info
        type: mongoose.Schema.ObjectId, // _id
        required: [true, "Booking must belong to a user"],
        ref: "FooduserModel"
    },
    plan: {
        // info
        type: mongoose.Schema.ObjectId, //_id
        required: [true, "Booking must belong to a plan "],
        ref: "FoodplanModel"
    },
    bookedAt: {
        type: Date,
        default: Date.now()
    },
    priceAtThatTime: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "failed", "sucess"],
        required: true,
        default: "pending"
    },
    // razorpay_order_id: {
    //     type: String,
    //     required: true,
    //   },
    //   razorpay_payment_id: {
    //     type: String,
    //     required: true,
    //   },
    //   razorpay_signature: {
    //     type: String,
    //     required: true,
    //   },
})
const bookingModel = mongoose.model("FoodbookingModel", bookingSchema);
module.exports = bookingModel;
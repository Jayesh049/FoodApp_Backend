const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId, 
        required: [true, "Booking must belong to a user"],
        ref: "FooduserModel"
    },
    plan: {
        type: mongoose.Schema.ObjectId, 
        required: [true, "Booking must belong to a plan"],
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
        enum: ["pending", "failed", "success"],
        required: true,
        default: "pending"
    },
    planDetails: {
        image: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        discount: {
            type: Number,
            required: true
        },
        reviews: {
            type: [mongoose.Schema.ObjectId],
            ref: "FoodreviewModel",
            required: true
        }
    }
});

const bookingModel = mongoose.model("FoodbookingModel", bookingSchema);
module.exports = bookingModel;

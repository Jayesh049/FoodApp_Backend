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
        default: Date.now
    },
    priceAtThatTime: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 1
    },
    status: {
        type: String,
        enum: ["pending", "confirmed", "preparing", "out_for_delivery", "delivered", "failed", "cancelled"],
        required: true,
        default: "pending"
    },
    deliveryStatus: {
        currentStatus: {
            type: String,
            enum: ["order_placed", "restaurant_confirmed", "preparing", "ready_for_pickup", "picked_up", "on_the_way", "nearby", "delivered"],
            default: "order_placed"
        },
        estimatedDeliveryTime: {
            type: Date
        },
        actualDeliveryTime: {
            type: Date
        },
        driverLocation: {
            latitude: Number,
            longitude: Number,
            lastUpdated: {
                type: Date,
                default: Date.now
            }
        },
        deliveryNotes: {
            type: String
        }
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

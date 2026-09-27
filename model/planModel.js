const mongoose = require('mongoose'); 

let planSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "kindly pass the name"],
        unique: [true, "plan name should be unique"],
        maxlength: [40, "Your plan length is more than 40 characters"],
    },
    image:{
        type: String,
    },
    images: [{
        type: String,
        required: false
    }],
    video: {
        type: String,
        required: false
    },
    description: {
        type: String,
        maxlength: [500, "Description is too long"],
    },
    duration: {
        type: Number,
        required: [true, "You Need to provide duration"]
    },
    price: {
        type: Number,
        required: true,
    },
    discount: {
        type: Number,
        validate: {
            validator: function () {
                return this.discount < this.price;
            },
            message: "Discount must be less than actual price",
        },
    },
    category: {
        type: String,
        enum: ["north_indian", "south_indian", "chinese", "dessert", "beverages"],
        default: "north_indian",
    },
    icon: {
        type: String,
        default: "🍛",
    },
    reviews : {
        type : [mongoose.Schema.ObjectId],
        ref : "FoodreviewModel"
    },
    averageRating :{
        type : Number
    }
   
})
const FoodplanModel = mongoose.model
    // name of the collection, the set of rules this collection should follow
    ('FoodplanModel', planSchema);
module.exports = FoodplanModel;
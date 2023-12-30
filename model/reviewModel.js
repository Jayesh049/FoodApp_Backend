const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
    description: {
        type : String,
        required : [true , "Review can't be empty"]
    },
    rating : {
        type : Number, 
        min : 1,
        max : 5,
        required :[true , "Review must contain som rating"]
    },
    createdAt : { 
        type : Date,
        default : Date.now
    },
    user : {
        type : mongoose.Schema.ObjectId,
        required : [true , "Review must belong to a user"],
        ref:"FooduserModel"
    },
    plan :{
     type : mongoose.Schema.ObjectId,
     required : [true , "Review must belong to a plan "],
     ref:"FoodplanModel"
    }


    
})


const ReviewModel = mongoose.model("FoodreviewModel" , reviewSchema);
module.exports = ReviewModel;
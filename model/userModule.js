
const mongoose = require('mongoose');
let DB_LINK = process.env.DB_LINK || require("../secrets").DB_LINK;

mongoose
.connect(DB_LINK).then(function (){
    console.log("connected");
}).catch(function (err){
    console.log("error" , err);
})

let userSchema = new mongoose.Schema({

  name:{
    type: String,
    required: [true , "Name is not send"],
  },
  password:{
    type:String,
    required: [true , "password is missing"],
    
  },
  confirmPassword :{
    type:String,
    required:[true , "confirmPassword is missing"],
    validate : {
      validator: function (){
        return this.password == this.confirmPassword
      },
      message: "password miss match"
    }
  },
  email:{
    type:String,
    required: [true , "email is missing"],
    unique: true
  },
  phonenumber: {
    type: String,
    minLength : [10 , "less than 10 numbers"],
    maxLength : [10  ,"less than 10 numbers"]
  },
  pic:{
    type:String,
    default: "dp.png"
  },
  otp: {
    type: String
  },
  otpExpiry: {
    type: Date
  },
  address:{
    type:String,
  },
  bookings : {
    type : [mongoose.Schema.ObjectId],
    ref:  "FoodbookingModel"
  }

})



const FooduserModel = mongoose.model
('FooduserModel' , userSchema);
module.exports = FooduserModel;

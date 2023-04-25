//tech knowledge
//! ( schema )-> set  of features and rules a certain entity should follow

// let secrets = require("../secrets");

//* how to create a db -> link share
//* connect to my app //mongoose
const mongoose = require('mongoose');//npm i mongoose
// let secrets = require("../secrets");
let DB_LINK = process.env.DB_LINK || require("../secrets").DB_LINK;

mongoose
.connect(DB_LINK).then(function (){
    console.log("connected");
}).catch(function (err){
    console.log("error" , err);
})
//how to create a schema ->only entries written will be added to your db no one else
let userSchema = new mongoose.Schema({
//toh ye saare predefined hote hai mongoose library ke andar
//mongoosejs.com/docs/validation.html
  name:{
    type: String,
    //sahi hai toh true wrna error message send kar do
    //use case of error message which is double quotes
    required: [true , "Name is not send"],
  },
  password:{
    //hum  type string ko ya toh  double col me likh skte hai ya nhi
    type:String,
    required: [true , "password is missing"],
    
  },
  confirmPassword :{
    type:String,
    required:[true , "confirmPassword is missing"],

    //use case of custom validator
    validate : {
      validator: function (){
        //this se pichla data uth kar aa jata hai
        //this refers to current entry jo aarha hai by jasbir sir
        return this.password == this.confirmPassword
        //return true -> value that is valid
        //return false -> value that is invalid
      },
      //error message
      message: "password miss match"
    }
  },
  email:{
    type:String,
    required: [true , "email is missing"],
    //unique hona chahiye
    unique: true
  },
  phonenumber: {
    type: String,
    //hum string ke andar minLength and maxLength ko define karte hai which is the rule
    minLength : [10 , "less than 10 numbers"],
    maxLength : [10  ,"less than 10 numbers"]
  },
  pic:{
    type:String,
    default: "dp.png"
  },
  // days:{
    // type: String ,
    //use case of enum is that ki iske alawa aur koi days daale toh error show hoga means bhai ne bola hai karne ka mtlb karne ka
    // enum: ["Mon" , "Tue" , "Wed"]
  // },
  otp: {
    type: String
  },
  otpExpiry: {
    type: Date
  },
  address:{
    type:String,
  }

})
//product knowledge
//user data -> store
//name,
//email,
//phonenumber,
//pic , 
//password,
//address

//model is similar to your collection
const FooduserModel = mongoose.model
//name of the collection , the set of rules this collection should follow
//foodusermodel naam ho gya humaara collection ka , userSchema 
// humaara set of rules ho gya ki inn rules par humaara data store hoga mongodbAtlas par
('FooduserModel' , userSchema);
module.exports = FooduserModel;
//inn upar ki saari things me values kaise store karna hai we will learn it

//jab koi value undefined hogi toh undefined error show hoga 




const jwt = require("jsonwebtoken");
const JWTSECRET = process.env.JWTSECRET || require("../secrets").JWTSECRET;

const FooduserModel = require("../model/userModule");
const mailSender = require("../utilities/mailSender");

async function signupController(req , res){

    try{
      let data = req.body;
      console.log(data);
      let newUser = await FooduserModel.create(data);
      console.log(newUser);
      res.status(201).json({
        result: "user signed up"
      });
    }catch (err){
      res.status(400).json({
        result : err.message
      })
    }
         
}
  

async function  loginController(req , res){
    try{
    let data = req.body;
    let {email , password} = data;
  
    if(email && password){
      let user = await FooduserModel.findOne({ email : email });
      if(user){
        if(user.password == password){
          const token = jwt.sign({
            data: user["_id"],
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24)
          } , JWTSECRET);
          res.cookie("JWT" , token);
             user.password = undefined;
             user.confirmPassword = undefined;

            console.log("login" , user);
            res.status(200).json({
                result: "ok", 
                user,
                token: `Bearer ${token}`
              })
        }else{
          res.status(403).json({
            result : "email or password does not match"})
        }
      }else{
        res.status(400).json({ 
          result: "user not found"})
      }
    }else{
      res.status(400).json({
        result: "user not found kindly signup"
      })
    }
  } catch(err){

     res.status(500).json({
      result: err.message
     });
  }
}
  
async function resetPasswordController(req ,res){
    try {
       let { otp , password , confirmPassword ,email } = req.body;
       let user = await FooduserModel.findOne({email : email});
       let currentTime = Date.now();
       if(currentTime > user.otpExpiry){ 
            delete user.otp
            delete user.otpExpiry
            await user.save();
            
            res.status(200).json({
                result : "Otp expired"
            })
       }else{
              if(user.otp != otp){
                res.status(200).json({
                  message : "wrong otp"
                })
            }else{
              user = await FooduserModel.findOneAndUpdate( 
                {otp , email} , 
                { password , confirmPassword},
                {
                  runValidators : true,
                   new : true
                });
                delete user.otp;
                delete user.otpExpiry;
                
                await user.save();   
          
                console.log(user);
                res.status(201).json({
                  user : user,
                  result : "User password reset"
                })
            }
       }
       
    }catch ( err){
      res.status(500).json({
        result : err.message
      });
      console.log(err);
    }
}
  
async  function forgetPasswordController(req , res){
    try{
      let { email } = req.body;
      
      let user = await FooduserModel.findOne({  email });
      if(user){
        let otp = otpGenerator(); 
        let afterFiveMin = Date.now() + 5 * 60 * 1000;
        await mailSender(email , otp); 
        user.otp = otp;
        user.otpExpiry = afterFiveMin;
        await user.save();
        res.status(204).json({
            data : user,
            result: "Otp send to your email"
        })
        }else {
        res.status(404).json({
          result : "user with this email not found"
        })
      }
    }catch(err){
      res.status(500).json(err.message)
      console.log(err.message);
      
    }
}
  
  


  // *---------helper functions***********-
function otpGenerator(){
    return Math.floor(100000 + Math.random() * 900000);
}
  
function protectRoute(req , res , next){
  
    try{
      const cookies = req.cookies;
      const JWT = cookies.JWT;
      if(cookies.JWT){
        console.log("protect Route Encountered");
        let token = jwt.sign(JSON.stringify(jwt), JWTSECRET);
        console.log("JWT DECRYPTED" ,token);
        let userId = token.data;
        console.log("userId" , userId);
        req.userId = userId;
        next();
      }else{
        res.send("You are not logged in Kindly login");
      }
    }catch(err){
        console.log(err);
        if(err.message == "invalid signature"){
          res.send("Token invalid kindly login");
        }else{
          res.send(err.message);
        }
    }
}

  module.exports = {
    signupController,
    loginController,
    resetPasswordController,
    forgetPasswordController,
    protectRoute
  }

 
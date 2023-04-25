const jwt = require("jsonwebtoken");
const JWTSECRET = process.env.JWTSECRET || require("../secrets").JWTSECRET;

//aap jiss schema se kaam kar rahe ho usse import karna na bhule
const FooduserModel = require("../model/userModule");
const mailSender = require("../utilities/mailSender");

// ************************controller functions******************
async function signupController(req , res){

    try{
      let data = req.body;
      console.log(data);
      //to create document inside userModel
      //async await se humne data mangwa kar create kara  li mongodb se 
      //aur ek naya user bna diya mtlb object bana liya
      let newUser = await FooduserModel.create(data);//ye humein unique id dega
      console.log(newUser);
      res.status(201).json({
        result: "user signed up"
      });
      // res.end("data recieved");
    }catch (err){
      res.status(400).json({
        result : err.message
      })
      // res.end(err.message);
    }
         
}
  
//login input:email + password  
async function loginController(req , res){
    try{
    let data = req.body;
    let {email , password} = data;
  
    //!agar humne email and password daala hai
    if(email && password){
      //query ka use karke model ke andar se find karaa email and user dhundh liya
      //so basically what we are doing is hum db se object mangwa le rahe hai user ka
      let user = await FooduserModel.findOne({ email : email });
      //! Check for if  User is found
      if(user){
        //toh kya user ka password aur jo login ke time password daala 
        //hai wo sahi hai
        //!Check for password 
        if(user.password == password){
          //sahi hai toh user logged in
  
          //create JWT -> payload , secret text
          //algorithms -> SHA256
          //* defining token
          const token = jwt.sign({
            data: user["_id"],
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24)
          } , JWTSECRET);
          //put token into cookies
          res.cookie("JWT" , token);
            //send the token
            //toh jo object mngwaya hai db se hum password and confirm password login ke time user{client} ko na pahuchne de usse aage naa pahuchne de par db me password nd cp hai we are not deleting it into our database
           
           
             user.password = undefined;
             user.confirmPassword = undefined;

            console.log("login" , user);
            // delete user.confirmPassword
            //before sending to frontend we have to delete password and confirm password so that we can login successfully in our front end
            //status hote hai kahi saare taaki hum error bata paaye ki kaha error aa rha hai frontend me
            res.status(200).json({//1
                user})
          // res.send("user logged in ");
        }else{//400 status code jab client ne kuch galat kiya hai tabhi hum daalte hai
          /* galat hai toh email ka  password match nahi hua
          res.send("email and password does not match"); */
          res.status(403).json({//2
            result : "email or password does not match"})
        }
  
        //! Check for if user is not found
      }else{//400 status code-> client side error 
        //user not found
        res.status(400).json({ //3
          result: "user not found"})
        /* res.send(`User with this email Id is not found.
         kindly signup`); */
      }
      //! email and password nahi daala hai tab
    }else{
      /*something is missing
      res.end("kindly enter email and password both") */
      res.status(400).json({
        result: "user not found kindly signup"
      })
    }
  } catch(err){//hum 500 server side error ko show karne ke liye use karte hai frontend
    //status code -> 500 -> server side error 
    /* server crashed
     res.end(err.message); */

     res.status(500).json({
      result: err.message
     });
  }
}
  
async function resetPasswordController(req ,res){
    try {
      //kya pata kisi aur time par kisi ne otp wahi daal diya ho galat waala fir hum kya karenge
      //toh hum email ka sahara lenge for user verification
       let { otp , password , confirmPassword ,email } = req.body;
       //search -> get the user
       //user define karne waala humesha btao ki kon se user ko define kar rahe hai 
       //mtlb ({email : email})
       let user = await FooduserModel.findOne({email : email});
       //if condition for otp expiration statement
       let currentTime = Date.now();
       if(currentTime > user.otpExpiry){//agar expiry time se zyada ho gya toh user ke otp and otpexpire ko delete ya undefine kar do 
            delete user.otp
            delete user.otpExpiry
            await user.save();
            //jab bhi otp ke mamle me koi error hai jisme na developer kuch kar skta
            //na user kuch kar skta//toh uske liye 200 status ka result daalenge
            res.status(200).json({
                result : "Otp expired"
            })
       }else{//yaha user se email ko find bhi kar rahe hai saath me otp se compare bhi kar rahe user.otp ka mtlb user se jo mail nikala tha aur otp jo hai humaara dono we are using 
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
                //key delete karna hoga otp ka undefined se nahi ho raha inside the query toh bahar karenge
                //get the document obj -> modify that objectby removing useless keys
                delete user.otp  //or delete user.otp
                delete user.otpExpiry ;//or delete user.otpExpiry
                //save to save this doc in db
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
      // res.json({
      //   user : user, 
      //   message : "Password for the use is reset"
      // })
    }
}
  
async  function forgetPasswordController(req , res){
    try{
      let { email } = req.body;//email nikaala
      // so the process is if user is present there then we will do our process if user is not present there then we will send the status of error code
      let user = await FooduserModel.findOne({  email });
      if(user){
        let otp = otpGenerator();//otp generate karwa diya
        let afterFiveMin = Date.now() + 5 * 60 * 1000;//otp expiry time
        await mailSender(email , otp); //humein mail bhejne ke liye we are using mailSender file and requesting it
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
      // res.end(err.message);
    }
}
  
  


  // *---------helper functions***********-
function otpGenerator(){
    return Math.floor(100000 + Math.random() * 900000);
}
  
  //* user defined middleware for protecting sensitive data and if user is logged in or not
function protectRoute(req , res , next){
  
    //* console.log cookies
    try{
      const cookies = req.cookies;
      const JWT = cookies.JWT;
      if(cookies.JWT){
        console.log("protect Route Encountered");
        //you are logged in then it will allow next fn to run
        //allow next fn to run
        let token = jwt.verify(jwt , JWTSECRET);
        console.log("JWT DECRYPTED" ,token);
        //humne userId nikalwa liya tokenki data me se
        let userId = token.data;
        console.log("userId" , userId);
        //fir req karke userId mangwa li
        req.userId = userId;
        next();
      }else{
        res.send("You are not logged in Kindly login");
      }
    }catch(err){
      //displaying error message
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

   //previous backend code
      // let user = await FooduserModel.findOneAndUpdate({ //find karo pehla waaala and update 
      //   let otp = otpGenerator();//otp generate karwa diya
      //   let afterFiveMin = Date.now() + 5 * 60 * 1000;//otp expiry time
      //   email: email  // jis factor se search kiy
      // },{ otp : otp , otpExpiry : afterFiveMin } //jiss cheez update karna hai 
      // , { new : true});//agar modified docs return karna hota hai rather than original ye compulsory hai wrt mongoose
      // console.log(user);
      // res.json({
      //   data : user,
      //   "message": "Otp send to your mail"
      // })
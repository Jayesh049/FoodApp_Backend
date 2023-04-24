
const FooduserModel = require("../model/userModule");

async function getAllUsersController(req , res){
    try{
      //iss tareeke se model se find karke we will get our users
      let users = await FooduserModel.find();
      //hum body me json ke through data mangwa rahe hai so we can also write
      res.json(users);
    }catch{
      res.end(err.message);
    }
  }
  
async function profileController(req , res ){
    //user ki profile show ho
    try{
      //ye humein protectRoute se mila humein
      const userId = req.userId;
      const user = await FooduserModel.findById(userId);
      res.json({
        data : user,
        message : "Data about logged in user is send"
      });
      //model by Id -> get
      //res -> send
    }catch(err){
      res.end(err.message);
    }
  }


  module.exports ={
     profileController : profileController,
     getAllUsersController : getAllUsersController
  }
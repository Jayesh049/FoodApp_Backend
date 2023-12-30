
const FooduserModel = require("../model/userModule");

async function profileController(req , res){
  try{
    const userId = req.userId;
    const user = await FooduserModel.findById(userId);
    res.json({
      data : user,
      message : "Data about logged in user is send"
    });
  }catch(err){
    res.end(err.message);
  }
}
async function getAllUsersController(req , res){
    try{
      let users = await FooduserModel.find();
      res.json(users);
    }catch{
      res.end(err.message);
    }
  }
  



  module.exports ={
     profileController : profileController,
     getAllUsersController : getAllUsersController
  }
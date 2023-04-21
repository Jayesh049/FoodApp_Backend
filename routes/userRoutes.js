const express = require('express');
const userRouter = express.Router();
const { getAllUsersController , profileController} = 
require("../controller/userController");
const { protectRoute } = require("../controller/authController");

//users -> get all the users from the database -> sensitive route -> protected route-> logged in i will allow only that person
userRouter.get("/" , protectRoute, getAllUsersController);
//agar protectroute fn ke hum req res ko change kar rahe hai
//then iss user function ke andar bhi hum changes kar rahe h
//logged in user //profile controller
userRouter.get('/profile', protectRoute , profileController);

module.exports = userRouter;

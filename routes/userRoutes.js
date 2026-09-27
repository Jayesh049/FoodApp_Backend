const express = require("express");
const userRouter = express.Router();
const {
  getAllUsersController,
  profileController,
} = require("../controller/userController");
const {
  protectRoute,
  protectAdminRoute,
} = require("../controller/authController");

userRouter.get("/", protectRoute, protectAdminRoute, getAllUsersController);
userRouter.get("/profile", protectRoute, profileController);

module.exports = userRouter;

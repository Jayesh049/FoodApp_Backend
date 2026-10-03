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
const { AuditEvent } = require("../model/auditEventModel");

userRouter.get("/", protectRoute, protectAdminRoute, getAllUsersController);
userRouter.get("/audit", protectRoute, protectAdminRoute, async (req, res, next) => {
  try {
    const events = await AuditEvent.find().sort({ createdAt: -1 }).limit(100);
    res.status(200).json({ events });
  } catch (err) {
    next(err);
  }
});
userRouter.get("/profile", protectRoute, profileController);

module.exports = userRouter;

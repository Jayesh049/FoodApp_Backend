const FooduserModel = require("../model/userModule");

const USER_SAFE_SELECT =
  "-password -confirmPassword -otp -otpExpiry -emailVerificationToken -emailVerificationExpiry";

async function profileController(req, res, next) {
  try {
    const user = await FooduserModel.findById(req.userId).select(USER_SAFE_SELECT);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({
      data: user,
      message: "Data about logged in user is send",
    });
  } catch (err) {
    next(err);
  }
}

async function getAllUsersController(req, res, next) {
  try {
    const users = await FooduserModel.find().select(USER_SAFE_SELECT);
    res.json(users);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  profileController,
  getAllUsersController,
};

const express = require("express");
const {
  verifyPayment,
  initiateBooking,
  getBookingById,
  getBookings,
  deleteAllBookings,
} = require("../controller/bookingController");
const {
  protectRoute,
  protectAdminRoute,
} = require("../controller/authController");
const { validateObjectId } = require("../middleware/validateObjectId");

const bookingRouter = express.Router();

bookingRouter.post("/verification", protectRoute, verifyPayment);
bookingRouter.delete(
  "/all",
  protectRoute,
  protectAdminRoute,
  deleteAllBookings
);

bookingRouter
  .route("/")
  .get(protectRoute, getBookings)
  .post(protectRoute, initiateBooking);

bookingRouter
  .route("/:bookingId")
  .get(protectRoute, validateObjectId("bookingId"), getBookingById);

module.exports = bookingRouter;

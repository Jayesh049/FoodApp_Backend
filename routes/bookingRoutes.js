const express = require("express");
const { verifyPayment, initiateBooking, getBookingById, getBookings } = require("../controller/bookingController")



const bookingRouter = express.Router();


bookingRouter.route("/verification").post(verifyPayment)

bookingRouter
    .route("/:bookingId")
    .get(getBookingById)

bookingRouter
    .route("/")
    .get(getBookings)

    .post(initiateBooking);
module.exports = bookingRouter;

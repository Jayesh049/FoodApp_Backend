const express = require("express");
const {
  verifyPayment,
  initiateBooking,
  getBookingById,
  getBookings,
  deleteAllBookings,
  reconcilePayments,
  listPaymentEvents,
} = require("../controller/bookingController");
const { auditAfter } = require("../model/auditEventModel");
const {
  protectRoute,
  protectAdminRoute,
} = require("../controller/authController");
const { validate } = require("../middleware/validate");
const { validateObjectId } = require("../middleware/validateObjectId");
const { createStripeSession } = require("../controller/stripeController");
const { bookingCreate } = require("../utilities/schemas");

const bookingRouter = express.Router();

bookingRouter.post("/verification", protectRoute, verifyPayment);
bookingRouter.post("/stripe-session", protectRoute, validate(bookingCreate), createStripeSession);
bookingRouter.post(
  "/reconcile",
  protectRoute,
  protectAdminRoute,
  auditAfter("booking.reconcile"),
  reconcilePayments
);
bookingRouter.get("/events", protectRoute, protectAdminRoute, listPaymentEvents);
bookingRouter.delete(
  "/all",
  protectRoute,
  protectAdminRoute,
  auditAfter("booking.deleteAll"),
  deleteAllBookings
);

bookingRouter
  .route("/")
  .get(protectRoute, getBookings)
  .post(protectRoute, validate(bookingCreate), initiateBooking);

bookingRouter
  .route("/:bookingId")
  .get(protectRoute, validateObjectId("bookingId"), getBookingById);

module.exports = bookingRouter;

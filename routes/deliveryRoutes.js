const express = require("express");
const deliveryRouter = express.Router();
const {
  updateDeliveryStatusController,
  getDeliveryStatusController,
  getActiveDeliveriesController,
  updateDriverLocationController,
  getUserDeliveryHistoryController,
} = require("../controller/deliveryController");
const {
  protectRoute,
  protectAdminRoute,
} = require("../controller/authController");
const { validateObjectId } = require("../middleware/validateObjectId");

// Static paths before :bookingId
deliveryRouter.get(
  "/active",
  protectRoute,
  protectAdminRoute,
  getActiveDeliveriesController
);
deliveryRouter.get("/history", protectRoute, getUserDeliveryHistoryController);

deliveryRouter.put(
  "/:bookingId/status",
  protectRoute,
  protectAdminRoute,
  validateObjectId("bookingId"),
  updateDeliveryStatusController
);
deliveryRouter.get(
  "/:bookingId/status",
  protectRoute,
  validateObjectId("bookingId"),
  getDeliveryStatusController
);
deliveryRouter.put(
  "/:bookingId/location",
  protectRoute,
  protectAdminRoute,
  validateObjectId("bookingId"),
  updateDriverLocationController
);

module.exports = deliveryRouter;

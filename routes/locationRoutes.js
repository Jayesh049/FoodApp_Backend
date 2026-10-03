const express = require('express');
const locationRouter = express.Router();
const { 
    updateLocationController,
    getLocationController,
    getLocationByIPController,
    geocodeLocationController,
    findNearbyUsersController,
    smartLocationController,
    searchLocationController
} = require("../controller/locationController");
const rateLimit = require("express-rate-limit");
const { protectRoute, protectAdminRoute } = require("../controller/authController");

const ipLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

// Protected routes (require authentication)
locationRouter.post("/update", protectRoute, updateLocationController);
locationRouter.get("/current", protectRoute, getLocationController);
locationRouter.post("/geocode", protectRoute, geocodeLocationController);
locationRouter.post("/nearby", protectRoute, protectAdminRoute, findNearbyUsersController);
locationRouter.post("/smart", protectRoute, smartLocationController);
locationRouter.post("/search", protectRoute, searchLocationController);

// Auth required so this proxy to ipapi.co is not an anonymous open relay.
// The limiter stays so a logged-in caller cannot hammer the external API.
locationRouter.get("/ip", ipLimiter, protectRoute, getLocationByIPController);

module.exports = locationRouter;

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
const { protectRoute } = require("../controller/authController");

// Protected routes (require authentication)
locationRouter.post("/update", protectRoute, updateLocationController);
locationRouter.get("/current", protectRoute, getLocationController);
locationRouter.post("/geocode", protectRoute, geocodeLocationController);
locationRouter.post("/nearby", protectRoute, findNearbyUsersController);
locationRouter.post("/smart", protectRoute, smartLocationController);
locationRouter.post("/search", protectRoute, searchLocationController);

// Public route (no authentication required)
locationRouter.get("/ip", getLocationByIPController);

module.exports = locationRouter;

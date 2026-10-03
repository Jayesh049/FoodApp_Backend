const express = require('express');
const reviewRoutes = express.Router();
const { 
    createReviewController, 
    getAllReviewController, 
    getTop3Reviews, 
    updateReview, 
    deleteReview,
    getPlanReviewsController,
    getUserPurchasedPlansController,
    canUserReviewController
} = require('../controller/reviewController');
const { protectRoute, protectAdminRoute } = require('../controller/authController');
const { validateObjectId } = require('../middleware/validateObjectId');

// Public routes
reviewRoutes.get("/best3", getTop3Reviews);
reviewRoutes.get("/plan/:plan", getPlanReviewsController);

// Protected routes (require authentication)
reviewRoutes.use(protectRoute); // Apply auth middleware to all routes below

// Create review for a plan (requires authentication)
reviewRoutes.post("/plan/:plan", createReviewController);

reviewRoutes.get("/", getAllReviewController);
reviewRoutes.get("/my-purchases", getUserPurchasedPlansController);
reviewRoutes.get("/can-review/:plan", canUserReviewController);
reviewRoutes.patch("/:id", validateObjectId("id"), updateReview);
reviewRoutes.delete("/:id", protectAdminRoute, validateObjectId("id"), deleteReview);

module.exports = reviewRoutes;
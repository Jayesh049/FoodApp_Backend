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
const { protectRoute } = require('../controller/authController');

// Public routes
reviewRoutes.get("/best3", getTop3Reviews);
reviewRoutes.get("/plan/:plan", getPlanReviewsController);

// Protected routes (require authentication)
reviewRoutes.use(protectRoute); // Apply auth middleware to all routes below

// Create review for a plan (requires authentication)
reviewRoutes.post("/plan/:plan", createReviewController);

reviewRoutes.route("/")
    .get(getAllReviewController)
    .patch(updateReview)
    .delete(deleteReview);

// User-specific routes
reviewRoutes.get("/my-purchases", getUserPurchasedPlansController);
reviewRoutes.get("/can-review/:plan", canUserReviewController);

module.exports = reviewRoutes;
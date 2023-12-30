const express = require('express');
const reviewRoutes = express.Router();
const { createReviewController, getAllReviewController, getTop3Reviews, updateReview , deleteReview
} =
    require('../controller/reviewController');

reviewRoutes.get("/best3",getTop3Reviews);
reviewRoutes.route("/")
    .get(getAllReviewController)
    .post(createReviewController)
    .patch(updateReview)
    .delete(deleteReview)

module.exports = reviewRoutes;
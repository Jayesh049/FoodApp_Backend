const express = require('express');
const reviewRoutes = express.Router();

const { createReviewController , getAllReviewController} = require("../controller/reviewController");

reviewRoutes.route("/")
        .get(getAllReviewController)
        .post(createReviewController)

//logged in reviews
module.exports = reviewRoutes;

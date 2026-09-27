const reviewModel = require("../model/reviewModel");
const planModel = require("../model/planModel");
const bookingModel = require("../model/bookingModel");
const { moderateReviewText } = require("../utilities/reviewModeration");

const PURCHASED_BOOKING_STATUSES = ["confirmed", "preparing", "out_for_delivery", "delivered"];

async function createReviewController(req,res){
  try{
    const planId = req.params.plan;
    
    // Validate required fields
    if (!planId) {
      return res.status(400).json({ message: "Plan ID is required in URL" });
    }

    const rating = req.body.rating;
    const description = req.body.description || req.body.review;

    if (!rating || !description) {
      return res.status(400).json({
        message: "Rating and review text are required"
      });
    }

    const userId = req.userId || req.body.user;
    if (!userId) {
      return res.status(401).json({ message: "Login required to post a review" });
    }

    const hasPurchased = await bookingModel.findOne({
      user: userId,
      plan: planId,
      status: { $in: PURCHASED_BOOKING_STATUSES },
    });
    if (!hasPurchased) {
      return res.status(403).json({ message: "You must purchase this plan to review it" });
    }

    // Check if user already reviewed this plan
    const existingReview = await reviewModel.findOne({
      user: userId,
      plan: planId
    });

    if (existingReview) {
      return res.status(400).json({
        message: "You have already reviewed this plan"
      });
    }

    const moderation = moderateReviewText(description);
    if (!moderation.allowed) {
      return res.status(400).json({
        message: `Review rejected: ${moderation.reason}`,
      });
    }

    // Create review
    const reviewData = {
      ...req.body,
      description,
      user: userId,
      plan: planId
    };
    
    let review = await reviewModel.create(reviewData);
    let ratingValue = review.rating;
    let reviewId = review["_id"];
    
    // Update plan's average rating
    let currentPlan = await planModel.findById(planId);
    if (!currentPlan) {
      return res.status(404).json({
        message: "Plan not found"
      });
    }

    // Calculate new average rating
    let totalNoofRating = currentPlan.reviews.length;
    let prevAvg = currentPlan.averageRating;
    
    if (prevAvg) {
      let totalRatings = prevAvg * totalNoofRating;
      let newAvg = (totalRatings + ratingValue) / (totalNoofRating + 1);
      currentPlan.averageRating = Math.round(newAvg * 10) / 10; // Round to 1 decimal
    } else {
      currentPlan.averageRating = ratingValue;
    }

    // Add review to plan
    currentPlan.reviews.push(reviewId);
    await currentPlan.save();

    // Populate the review with user and plan details
    const populatedReview = await reviewModel.findById(reviewId)
      .populate({ path: "user", select: "name pic" })
      .populate({ path: "plan", select: "name price" });

    res.status(201).json({
      message: "Review created successfully",
      data: populatedReview,
    });
  }
  catch(err){
    console.log("Review creation error:", err);
    return res.status(500).json({
      message: err.message,
    });
  }
}
  
   async function getAllReviewController(req, res){
    try{
        let reviews = await reviewModel.find()
        .populate({path :"user" , select : "name pic"})
        .populate({path : "plan" , select : "price name"})

        res.status(200).json({
          reviews,
          result: "all results send"
        })
    }catch(err){
        console.log(err);
        res.status(500).json({message : err.message});
    }
  }

  async function getTop3Reviews(req, res) {
    try {
        let reviews = await reviewModel.find()
            .populate({ path: "user", select: "name pic " })
            .populate({ path: "plan", select: "price name" }).limit(3);
        res.status(200).json({
            reviews,
            result: "all results send"
        })
    } catch (err) {
        console.log(err)
        res.status(500).json({ message: err.message });
    }
}
  
async function updateReview(req,res){
  try{
  let planid=req.params.plan;
  let id=req.body.id;
  let dataToBeUpdated=req.body;
  let keys=[];
  for(let key in dataToBeUpdated){
    if(key==id) continue;
    keys.push(key);
  }
  let review=await reviewModel.findById(id);
  for(let i=0;i<keys.length;i++){
    review[keys[i]]=dataToBeUpdated[keys[i]];
  }
  await review.save();
  return res.json({
    message:'plan updated succesfully',
    data:review
});
  }
  catch(err){
    return res.json({
      message:err.message
  });
  }
}

async function deleteReview(req,res){
  try{
  let reviews =await reviewModel.find();
  console.log("reviewId",reviews);
  let review=await reviewModel.findByIdAndDelete(reviews);
  res.json({
    message: "review deleted",
    data: review,
  });
} 
catch (err) {
  return res.json({
    message: err.message,
  });
}
}
// Get reviews for a specific plan
async function getPlanReviewsController(req, res) {
  try {
    const planId = req.params.plan;
    
    const reviews = await reviewModel.find({ plan: planId })
      .populate({ path: "user", select: "name pic" })
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Plan reviews retrieved",
      count: reviews.length,
      reviews: reviews
    });
  } catch (err) {
    console.log("Get plan reviews error:", err);
    res.status(500).json({ message: err.message });
  }
}

// Get user's purchased plans (for review page)
async function getUserPurchasedPlansController(req, res) {
  try {
    const userId = req.userId; // From auth middleware
    
    const bookings = await require("../model/bookingModel").find({ 
      user: userId,
      status: { $in: ["delivered", "confirmed", "preparing", "out_for_delivery"] }
    })
    .populate({ path: "plan", select: "name image price" })
    .sort({ bookedAt: -1 });

    // Get unique plans (remove duplicates)
    const uniquePlans = [];
    const seenPlans = new Set();
    
    bookings.forEach(booking => {
      if (booking.plan && !seenPlans.has(booking.plan._id.toString())) {
        seenPlans.add(booking.plan._id.toString());
        uniquePlans.push({
          _id: booking.plan._id,
          name: booking.plan.name,
          image: booking.plan.image,
          price: booking.plan.price,
          purchasedAt: booking.bookedAt,
          quantity: booking.quantity
        });
      }
    });

    res.status(200).json({
      message: "User purchased plans retrieved",
      count: uniquePlans.length,
      plans: uniquePlans
    });
  } catch (err) {
    console.log("Get user purchased plans error:", err);
    res.status(500).json({ message: err.message });
  }
}

// Check if user can review a plan
async function canUserReviewController(req, res) {
  try {
    const userId = req.userId;
    const planId = req.params.plan;
    
    // Check if user has purchased this plan
    const hasPurchased = await require("../model/bookingModel").findOne({
      user: userId,
      plan: planId,
      status: { $in: ["delivered", "confirmed", "preparing", "out_for_delivery"] }
    });

    // Check if user already reviewed this plan
    const hasReviewed = await reviewModel.findOne({
      user: userId,
      plan: planId
    });

    res.status(200).json({
      canReview: !!hasPurchased && !hasReviewed,
      hasPurchased: !!hasPurchased,
      hasReviewed: !!hasReviewed,
      message: hasPurchased ? 
        (hasReviewed ? "You have already reviewed this plan" : "You can review this plan") :
        "You need to purchase this plan to review it"
    });
  } catch (err) {
    console.log("Can user review error:", err);
    res.status(500).json({ message: err.message });
  }
}

  module.exports = { 
        createReviewController,
        getAllReviewController,
        getTop3Reviews,
        deleteReview,
        updateReview,
        getPlanReviewsController,
        getUserPurchasedPlansController,
        canUserReviewController
  }
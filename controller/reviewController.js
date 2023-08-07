const reviewModel = require("../model/reviewModel");
const planModel = require("../model/planModel");
/*review add process -> enter description rating with yourself and then enter userid with the help of api/v1/user/
and for planid -> api/v1/plan ye sab cheeze enter karke we will create our review */

  async function createReviewController(req,res){
    try{
    // const id=req.params.plan;
    
    let review=await reviewModel.create(req.body);
    let rating = review.rating;
    let reviewId = review["_id"];
    let currentPlan=await planModel.findById(id);
    //replace with orig formula
    let totalNoofRating = currentPlan.reviews.length ;
    let prevAvg = currentPlan.averageRating;
    if(prevAvg){
      let totalRatings = prevAvg * totalNoofRating;
      let newAvg = (totalRatings + rating) / (totalNoofRating + 1);
      currentPlan.averageRating = newAvg;
    }else{
      currentPlan.averageRating = rating;
    }

    
          currentPlan.reviews.push(reviewId);

    await currentPlan.save();
    res.json({
      message: "review created",
      data: review,
    });
  }
  catch(err){
    return res.json({
      message: err.message,
    });
  }
  }
  
   async function getAllReviewController(req, res){
    try{
        let reviews = await reviewModel.find()
        .populate({path :"user" , select : "name pic"})
        .populate({path : "plan" , select : "price name"})
        //populate helps us to find all the data of that schema rule which was acquired by another model
        //for example user - > type : mongoose.Schema.ObjectId ab ye cheez ref ki wajah se mil paya so ye unke saare
        //details indepth dedeta hai
  
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
            // multiple different entries from diff models 
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
  //update average ratings 
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
  module.exports = { 
        createReviewController,
        getAllReviewController,
        getTop3Reviews,
        deleteReview,
        updateReview

  }
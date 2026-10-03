const logger = require("../utilities/logger");
const FoodplanModel = require("../model/planModel");
const { upsertPlanEmbedding } = require("./suggestController");
const fs = require("fs");
const path = require("path");

function parsePlanFields(body) {
  const name = body.name?.trim();
  const price = Number(body.price);
  const duration = Number(body.duration);
  const discount =
    body.discount === undefined || body.discount === "" || body.discount === null
      ? undefined
      : Number(body.discount);

  if (!name) {
    return { error: "Plan name is required" };
  }
  if (!Number.isFinite(price) || price <= 0) {
    return { error: "Valid price is required" };
  }
  if (!Number.isFinite(duration) || duration <= 0) {
    return { error: "Valid duration is required" };
  }
  if (discount !== undefined && (!Number.isFinite(discount) || discount >= price)) {
    return { error: "Discount must be a number less than price" };
  }

  const data = { name, price, duration };
  if (discount !== undefined) data.discount = discount;
  return { data };
}


async function getAllplansController(req, res, next){
  try{
    let plans = await FoodplanModel.find();
    if (String(req.query.diet || "").toLowerCase() === "veg") {
      const { filterVegetarianPlans } = require("../utilities/vegFilter");
      plans = filterVegetarianPlans(plans);
    }
    res.status(200).json({
        Allplans : plans
    })
  }catch(err){
    next(err);
  }
}

async function createPlanController(req, res, next){
    try {
        const parsed = parsePlanFields(req.body);
        if (parsed.error) {
            return res.status(400).json({ message: parsed.error });
        }

        const planObjData = { ...parsed.data };

        if(req.file){
            planObjData.image = req.file.path;
        }

        if(req.files && req.files.length > 0){
            const imagePaths = req.files.map(file => file.path);
            planObjData.images = imagePaths;
            if(!planObjData.image){
                planObjData.image = imagePaths[0];
            }
        }

        if(req.file && req.file.mimetype.startsWith('video/')){
            planObjData.video = req.file.path;
        }

        let newPlan = await FoodplanModel.create(planObjData);
        logger.info({ planId: newPlan && newPlan._id }, "plan created with images");

        const embedResult = await upsertPlanEmbedding(newPlan);

        res.status(201).json({
            result : "plan created",
            plan : newPlan,
            ragEmbedded: embedResult.ok,
            ragMessage: embedResult.ok
                ? "Plan added to AI search index"
                : embedResult.error || "RAG embed skipped (Ollama/index not ready)",
        });
    }catch(err){
        next(err);
    }
}

async function updatePlanController(req, res, next){
    try {
        const id = req.params.planRoutes;
        const plan = await FoodplanModel.findById(id);
        if (!plan) {
            return res.status(404).json({ message: "Plan not found" });
        }

        const updates = {};
        if (req.body.name !== undefined) updates.name = String(req.body.name).trim();
        if (req.body.price !== undefined) updates.price = Number(req.body.price);
        if (req.body.duration !== undefined) updates.duration = Number(req.body.duration);
        if (req.body.discount !== undefined && req.body.discount !== "") {
            updates.discount = Number(req.body.discount);
        }

        if (updates.price !== undefined && (!Number.isFinite(updates.price) || updates.price <= 0)) {
            return res.status(400).json({ message: "Valid price is required" });
        }
        if (updates.duration !== undefined && (!Number.isFinite(updates.duration) || updates.duration <= 0)) {
            return res.status(400).json({ message: "Valid duration is required" });
        }
        const effectivePrice = updates.price ?? plan.price;
        if (updates.discount !== undefined && updates.discount >= effectivePrice) {
            return res.status(400).json({ message: "Discount must be less than price" });
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: "nothing to update" });
        }

        Object.assign(plan, updates);
        await plan.save();

        const embedResult = await upsertPlanEmbedding(plan);

        res.status(200).json({
            plan,
            ragEmbedded: embedResult.ok,
        });
    }catch (err){
        next(err);
    }
}
async function deletePlanController(req, res, next){
    try {
        let id = req.params.planRoutes;
        let plan = await FoodplanModel.findById(id);
        
        if (!plan) {
            return res.status(404).json({
                result: "Plan not found"
            });
        }

        // Delete associated files
        const filesToDelete = [];
        
        // Add main image
        if (plan.image) {
            filesToDelete.push(plan.image);
        }
        
        // Add all images
        if (plan.images && plan.images.length > 0) {
            filesToDelete.push(...plan.images);
        }
        
        // Add video
        if (plan.video) {
            filesToDelete.push(plan.video);
        }

        // Delete files from filesystem
        filesToDelete.forEach(filePath => {
            const fullPath = path.join(__dirname, '..', filePath);
            if (fs.existsSync(fullPath)) {
                try {
                    fs.unlinkSync(fullPath);
                    logger.info({ filePath }, "deleted upload");
                } catch (fileErr) {
                    logger.warn({ err: fileErr, filePath }, "delete upload failed");
                }
            }
        });

        // Delete plan from database
        await FoodplanModel.findByIdAndDelete(id);
        
        res.status(200).json({
            result: "Plan deleted successfully",
            deletedPlan: {
                name: plan.name,
                deletedFiles: filesToDelete.length
            }
        });
    } catch (err) {
        next(err);
    }
}
async function getPlanController(req, res, next){
  try {
    const id = req.params.planRoutes;
    if (!id || !require('mongoose').Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        err: 'Invalid plan id',
        message: 'Plan id must be a valid ObjectId',
      });
    }
    const plan = await FoodplanModel.findById(id);
    if (!plan) {
      return res.status(404).json({
        err: 'Plan not found',
        message: 'No plan exists for this id',
      });
    }
    return res.status(200).json({
      result: 'plan found',
      plan,
    });
  } catch (err) {
    if (!res.headersSent) return next(err);
  }
}

async function getbestPlans(req, res, next) {
    try {
        let plans = await FoodplanModel.find().sort("-averageRating").limit(24);
        const { filterVegetarianPlans } = require("../utilities/vegFilter");
        plans = filterVegetarianPlans(plans).slice(0, 3);
        res.status(200).json({
            plans
        })
    } catch (err) {
        next(err)
    }
}

// Get all images for a specific plan
async function getPlanImagesController(req, res, next) {
    try {
        let id = req.params.planRoutes;
        let plan = await FoodplanModel.findById(id).select('name images image');
        
        if (!plan) {
            return res.status(404).json({
                result: "Plan not found"
            });
        }

        res.status(200).json({
            result: "Plan images retrieved",
            planName: plan.name,
            thumbnail: plan.image,
            images: plan.images || []
        });
    } catch (err) {
        next(err);
    }
}

// Update video for existing plan
async function updatePlanVideoController(req, res, next) {
    try {
        let id = req.params.planRoutes;
        let plan = await FoodplanModel.findById(id);
        
        if (!plan) {
            return res.status(404).json({
                result: "Plan not found"
            });
        }

        // Delete old video if exists
        if (plan.video) {
            const oldVideoPath = path.join(__dirname, '..', plan.video);
            if (fs.existsSync(oldVideoPath)) {
                try {
                    fs.unlinkSync(oldVideoPath);
                    logger.info({ video: plan.video }, "deleted old video");
                } catch (fileErr) {
                    logger.warn({ err: fileErr }, "delete old video failed");
                }
            }
        }

        // Update with new video
        if (req.file && req.file.mimetype.startsWith('video/')) {
            plan.video = req.file.path;
            await plan.save();
            
            res.status(200).json({
                result: "Video updated successfully",
                plan: {
                    _id: plan._id,
                    name: plan.name,
                    video: plan.video
                }
            });
        } else {
            res.status(400).json({
                result: "No video file provided or invalid video format"
            });
        }
    } catch (err) {
        next(err);
    }
}

// Update plan with images and video
async function updatePlanWithMediaController(req, res, next) {
    try {
        let id = req.params.planRoutes;
        let plan = await FoodplanModel.findById(id);
        
        if (!plan) {
            return res.status(404).json({
                result: "Plan not found"
            });
        }

        // Update basic fields
        if (req.body.name) plan.name = req.body.name;
        if (req.body.duration) plan.duration = req.body.duration;
        if (req.body.price) plan.price = req.body.price;
        if (req.body.discount) plan.discount = req.body.discount;

        // Handle new images
        if (req.files && req.files.length > 0) {
            // Delete old images
            if (plan.images && plan.images.length > 0) {
                plan.images.forEach(imagePath => {
                    const fullPath = path.join(__dirname, '..', imagePath);
                    if (fs.existsSync(fullPath)) {
                        try {
                            fs.unlinkSync(fullPath);
                            logger.info({ imagePath }, "deleted old image");
                        } catch (fileErr) {
                            logger.warn({ err: fileErr, imagePath }, "delete old image failed");
                        }
                    }
                });
            }

            // Add new images
            const imagePaths = req.files.map(file => file.path);
            plan.images = imagePaths;
            
            // Update main image if not already set
            if (!plan.image) {
                plan.image = imagePaths[0];
            }
        }

        // Handle new video
        if (req.file && req.file.mimetype.startsWith('video/')) {
            // Delete old video
            if (plan.video) {
                const oldVideoPath = path.join(__dirname, '..', plan.video);
                if (fs.existsSync(oldVideoPath)) {
                    try {
                        fs.unlinkSync(oldVideoPath);
                        logger.info({ video: plan.video }, "deleted old video");
                    } catch (fileErr) {
                        logger.warn({ err: fileErr }, "delete old video failed");
                    }
                }
            }
            plan.video = req.file.path;
        }

        await plan.save();
        
        res.status(200).json({
            result: "Plan updated successfully",
            plan: plan
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
        getAllplansController,  
        createPlanController,
        updatePlanController,
        deletePlanController,
        getPlanController,
        getbestPlans,
        getPlanImagesController,
        updatePlanVideoController,
        updatePlanWithMediaController
}
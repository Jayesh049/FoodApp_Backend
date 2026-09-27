const express = require('express');
const planRouter = express.Router();
const { getAllplansController,
    createPlanController,
    updatePlanController,
    deletePlanController,
    getPlanController,
    getbestPlans,
    getPlanImagesController,
    updatePlanVideoController,
    updatePlanWithMediaController
} =
    require('../controller/planController');

const { protectRoute, protectAdminRoute } = require('../controller/authController');
const { semanticSearchPlans } = require('../controller/suggestController');
const { upload, uploadMultiple, uploadVideo } = require('../middleware/upload');
const { validateObjectId } = require('../middleware/validateObjectId');

// Public read routes
planRouter.get("/semantic-search", semanticSearchPlans);
planRouter.route("/")
    .get(getAllplansController)
    .post(protectRoute, protectAdminRoute, upload.single('image'), createPlanController);

planRouter.post("/with-images", protectRoute, protectAdminRoute, uploadMultiple.array('images', 5), createPlanController);
planRouter.post("/with-video", protectRoute, protectAdminRoute, uploadVideo.single('video'), createPlanController);
planRouter.get("/sortByRating", getbestPlans);

planRouter.route("/:planRoutes")
    .get(validateObjectId("planRoutes"), getPlanController)
    .patch(protectRoute, protectAdminRoute, validateObjectId("planRoutes"), updatePlanController)
    .delete(protectRoute, protectAdminRoute, validateObjectId("planRoutes"), deletePlanController);

planRouter.get("/:planRoutes/images", validateObjectId("planRoutes"), getPlanImagesController);
planRouter.put("/:planRoutes/video", protectRoute, protectAdminRoute, validateObjectId("planRoutes"), uploadVideo.single('video'), updatePlanVideoController);
planRouter.put("/:planRoutes/media", protectRoute, protectAdminRoute, validateObjectId("planRoutes"), uploadMultiple.array('images', 5), uploadVideo.single('video'), updatePlanWithMediaController);

module.exports = planRouter;

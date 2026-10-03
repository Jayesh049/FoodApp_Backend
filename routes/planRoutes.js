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

const { validate } = require("../middleware/validate");
const { planWrite } = require("../utilities/schemas");
const { protectRoute, protectAdminRoute } = require('../controller/authController');
const { semanticSearchPlans } = require('../controller/suggestController');
const { upload, uploadMultiple, uploadVideo } = require('../middleware/upload');
const { validateObjectId } = require('../middleware/validateObjectId');
const { auditAfter } = require('../model/auditEventModel');

// Public read routes
planRouter.get("/semantic-search", semanticSearchPlans);
planRouter.route("/")
    .get(getAllplansController)
    .post(protectRoute, protectAdminRoute, validate(planWrite), auditAfter("plan.create"), upload.single('image'), createPlanController);

planRouter.post("/with-images", protectRoute, protectAdminRoute, auditAfter("plan.create"), uploadMultiple.array('images', 5), createPlanController);
planRouter.post("/with-video", protectRoute, protectAdminRoute, auditAfter("plan.create"), uploadVideo.single('video'), createPlanController);
planRouter.get("/sortByRating", getbestPlans);

planRouter.route("/:planRoutes")
    .get(validateObjectId("planRoutes"), getPlanController)
    .patch(protectRoute, protectAdminRoute, validate(planWrite), auditAfter("plan.update"), validateObjectId("planRoutes"), updatePlanController)
    .delete(protectRoute, protectAdminRoute, auditAfter("plan.delete"), validateObjectId("planRoutes"), deletePlanController);

planRouter.get("/:planRoutes/images", validateObjectId("planRoutes"), getPlanImagesController);
planRouter.put("/:planRoutes/video", protectRoute, protectAdminRoute, auditAfter("plan.update"), validateObjectId("planRoutes"), uploadVideo.single('video'), updatePlanVideoController);
planRouter.put("/:planRoutes/media", protectRoute, protectAdminRoute, auditAfter("plan.update"), validateObjectId("planRoutes"), uploadMultiple.array('images', 5), uploadVideo.single('video'), updatePlanWithMediaController);

module.exports = planRouter;

const express = require('express');
const planRouter = express.Router();
const { getAllplansController,
    createPlanController,
    updatePlanController,
    deletePlanController,
    getPlanController,
    getbestPlans
} =
    require('../controller/planController');

    const upload = require('../middleware/upload')

planRouter.route("/")
    .get(getAllplansController)
    .post(upload.single('image'),createPlanController)

    planRouter.get("/sortByRating",getbestPlans)


planRouter.route("/:planRoutes")
    .get(getPlanController)
    .patch(updatePlanController)
    .delete(deletePlanController)


module.exports = planRouter;

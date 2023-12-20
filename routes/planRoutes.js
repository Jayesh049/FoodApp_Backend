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
// plans -> get all the plans from db -> sensitive route -> protected route -> logged in i will only allow that person
// '/' iske through get post kar rahe h 
planRouter.route("/")
    .get(getAllplansController)
    .post(upload.single('image'),createPlanController)

    planRouter.get("/sortByRating",getbestPlans)

//ye humein id ke through mil jaegi
planRouter.route("/:planRoutes")
    .get(getPlanController)
    .patch(updatePlanController)
    .delete(deletePlanController)

// loggedin plan
module.exports = planRouter;

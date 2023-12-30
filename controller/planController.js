const FoodplanModel = require("../model/planModel");

async function getAllplansController(req , res){
  try{
    let plans = await FoodplanModel.find();
    res.status(200).json({
        Allplans : plans
    })
  }catch(err){
    console.log(err);
    res.status(500).json({err : err.message});
  }
}

async function createPlanController(req, res){
    try {
        let planObjData =req.body;

        if(req.file){
            req.body.image =req.file.path 
        }
        const isDataPresent = Object.keys(planObjData).length > 0;
        if(isDataPresent){
            let newPlan = await FoodplanModel.create(planObjData);
            console.log("10 planController" , newPlan);
            res.status(201).json({
                result : "plan created",
                plan : newPlan
            })
        }
        else {
            res.status(404).json({
                message : "data is incomplete"
            })
        }
    }catch(err){
        console.log(err);
        res.status(500).json({ err: err.message });
    }
}

async function updatePlanController(req, res){
    try {
        console.log("to update" , req.body);
        let planUpdateObjData = req.body;
        let id = req.params.planRoutes;
        
        const isDataPresent = Object.keys(planUpdateObjData).length > 0;
        if(isDataPresent){
            const plan = await FoodplanModel.findById(id);

            for(let key in planUpdateObjData){
                plan[key] = planUpdateObjData[key];
            }

            await plan.save();
            res.status(200).json({
                plan
            })
        }else{
            res.status(404).json({
                message : "nothing to update"
            })
        }
    }catch (err){
        console.log(err);
        res.status(500).json({ err: err.message });
    }
}
async function deletePlanController(req, res){
    try {
        let id = req.params.planRoutes;
        let plan = await FoodplanModel.findByIdAndDelete(id);
        res.status(200).json({
            result: "plan found",
            plan : plan
        });
    }catch (err){
        console.log(err);
        res.json(500).json({
            err : err.message
        })
    }
}
async function getPlanController(req, res){
  try {
    let id = req.params.planRoutes;
    let plan = await FoodplanModel.findById(id);
    res.status(200).json({
        result: "plan found",
        plan : plan
    });
}catch(err){
    console.log(err);
    res.json(500).json({
        err : err.message
    })
    }
}

async function getbestPlans(req, res) {
    try {
        let plans = await FoodplanModel.find().sort("-averageRating").limit(3);
        res.status(200).json({
            plans
        })
    } catch (err) {
        console.log(err);
        res.status(200).json({
            message: err.message
        })
    }

}

module.exports = {

        getAllplansController,  
        createPlanController,
        updatePlanController,
        deletePlanController,
        getPlanController,
        getbestPlans
}
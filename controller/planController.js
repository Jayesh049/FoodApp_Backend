const FoodplanModel = require("../model/planModel");

//with the help of mongoose find karke saare plans mangwa liye
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

//request se humne object bnaya fir with the help of mongoose humne create kar liya
async function createPlanController(req, res){
    try {
        let planObjData =req.body;

        if(req.file){
            req.body.image =req.file.path 
        }
        // console.log(req.body); debugging
        //Object.keys is used to check keys inside object
        const isDataPresent = Object.keys(planObjData).length > 0;
        if(isDataPresent){
            let newPlan = await FoodplanModel.create(planObjData);
            console.log("10 planController" , newPlan);
            res.status(201).json({
                result : "plan created",
                plan : newPlan
            })
        }//always remember to put else after if otherwise it gives you error
        else {
            res.status(404).json({
                message : "data is incomplete"
            })
        }
        //agr hum else nahi lagayenge toh hum log catch nahi kar payenge error ko
    }catch(err){
        console.log(err);
        res.status(500).json({ err: err.message });
    }
}

//jo object req ke through aaya and id nikal li toh kya wo data present hai agar present hai toh plan nikaalo
//  for loop lagaa kar update karo and then save karo this gives us full control 
async function updatePlanController(req, res){
    try {
        console.log("to update" , req.body);
        let planUpdateObjData = req.body;
        //always remember to find correct way id
        let id = req.params.planRoutes;
        
        const isDataPresent = Object.keys(planUpdateObjData).length > 0;
        if(isDataPresent){
            //get plan from db
            const plan = await FoodplanModel.findById(id);

            //update the plan
            for(let key in planUpdateObjData){
                plan[key] = planUpdateObjData[key];
            }

            //save to db -> validators will run
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
//delete by findByIdAndDelete with the help of mongoose rest same code as getPlanController
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
//id se humne plan nikaal li
async function getPlanController(req, res){
  try {
    let id = req.params.planRoutes;//isse hum id nikalte hai
    let plan = await FoodplanModel.findById(id);//id ke through user with the help of mongoose
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
        // plans = plans.slice(0, 3);
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
const  express = require("express");
const {   checkout,  paymentVerification } = require("../controller/paymentController") 

const paymentRouter = express.Router();

paymentRouter.route("/checkout").post(checkout);

paymentRouter.route("/paymentverification").post(paymentVerification);

module.exports = paymentRouter;
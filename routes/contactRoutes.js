const express = require("express");
const { sendContactController } = require("../controller/contactController");

const contactRouter = express.Router();

contactRouter.post("/send", sendContactController);

module.exports = contactRouter;

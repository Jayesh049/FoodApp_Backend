const express = require("express");
const mediaRouter = express.Router();

const { protectRoute, protectAdminRoute } = require("../controller/authController");
const { generateImage, bulkGenerateImages } = require("../controller/mediaController");

mediaRouter.use(protectRoute);
mediaRouter.use(protectAdminRoute);

mediaRouter.post("/generate-image", generateImage);
mediaRouter.post("/bulk-generate", bulkGenerateImages);

module.exports = mediaRouter;

const express = require("express");
const suggestRouter = express.Router();

const { protectRoute, protectAdminRoute } = require("../controller/authController");
const { querySuggestions, reindexSuggestions, getSuggestHealth } = require("../controller/suggestController");

// Public: end-user query + health check
suggestRouter.get("/health", getSuggestHealth);
suggestRouter.post("/query", querySuggestions);

// Admin: reindex embeddings
suggestRouter.post("/reindex", protectRoute, protectAdminRoute, reindexSuggestions);

module.exports = suggestRouter;

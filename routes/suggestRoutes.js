const express = require("express");
const rateLimit = require("express-rate-limit");
const suggestRouter = express.Router();

const { protectRoute, protectAdminRoute } = require("../controller/authController");
const {
  querySuggestions,
  reindexSuggestions,
  getSuggestHealth,
  phraseOwnOrders,
} = require("../controller/suggestController");

const suggestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many suggestion requests. Try again later." },
});

suggestRouter.get("/health", getSuggestHealth);
suggestRouter.post("/query", suggestLimiter, querySuggestions);
suggestRouter.post("/order", suggestLimiter, protectRoute, phraseOwnOrders);
suggestRouter.post("/reindex", protectRoute, protectAdminRoute, reindexSuggestions);

module.exports = suggestRouter;

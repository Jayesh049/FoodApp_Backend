const express = require("express");
const sectionRouter = express.Router();

const { protectRoute, protectAdminRoute } = require("../controller/authController");
const {
  listSections,
  listAllSectionsAdmin,
  createSection,
  updateSection,
  deleteSection,
} = require("../controller/sectionController");

// Public: show home sections
sectionRouter.get("/", listSections);

// Admin: list all (including inactive)
sectionRouter.get("/all", protectRoute, protectAdminRoute, listAllSectionsAdmin);

// Admin: manage sections
sectionRouter.post("/", protectRoute, protectAdminRoute, createSection);
sectionRouter.patch("/:id", protectRoute, protectAdminRoute, updateSection);
sectionRouter.delete("/:id", protectRoute, protectAdminRoute, deleteSection);

module.exports = sectionRouter;

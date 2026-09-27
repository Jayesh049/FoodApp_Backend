const mongoose = require("mongoose");

const sectionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    type: { type: String, default: "carousel", enum: ["carousel", "grid", "hero", "banner"] },
    imagePaths: [{ type: String }],
    planIds: [{ type: mongoose.Schema.ObjectId, ref: "FoodplanModel" }],
    ctaLabel: { type: String, trim: true, default: "View Plans" },
    ctaUrl: { type: String, trim: true, default: "/allPlans" },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const SectionModel = mongoose.model("HomeSection", sectionSchema);
module.exports = SectionModel;


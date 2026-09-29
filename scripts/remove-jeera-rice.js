require("dotenv").config();
require("../model/userModule");
const mongoose = require("mongoose");
const FoodplanModel = require("../model/planModel");

(async () => {
  if (mongoose.connection.readyState !== 1) {
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("DB timeout")), 30000);
      mongoose.connection.once("connected", () => {
        clearTimeout(t);
        resolve();
      });
      mongoose.connection.once("error", (e) => {
        clearTimeout(t);
        reject(e);
      });
    });
  }
  const result = await FoodplanModel.deleteMany({ name: "Jeera Rice" });
  console.log("removed plans", result.deletedCount);
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

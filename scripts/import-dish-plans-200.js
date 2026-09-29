/**
 * Wipe plans and import 200 dish-plans with 5-image galleries.
 * Requires generated files under uploads/dishes/{slug}/.
 *
 * Usage: node scripts/import-dish-plans-200.js
 *        node scripts/import-dish-plans-200.js --allow-partial
 */
require("dotenv").config();
require("../model/userModule");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const FoodplanModel = require("../model/planModel");
const {
  DISH_CATALOG_200,
  imagePathsForDish,
} = require("../utilities/dishCatalog200");

const UPLOADS_ROOT = path.join(__dirname, "..", "uploads");
const allowPartial = process.argv.includes("--allow-partial");

async function waitForDb() {
  if (mongoose.connection.readyState === 1) return;
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

function assertGallery(dish) {
  const relPaths = imagePathsForDish(dish);
  const missing = [];
  for (const rel of relPaths) {
    const abs = path.join(__dirname, "..", rel);
    if (!fs.existsSync(abs) || fs.statSync(abs).size < 500) {
      missing.push(rel);
    }
  }
  return { relPaths, missing };
}

(async () => {
  await waitForDb();
  console.log("Connected. Importing", DISH_CATALOG_200.length, "dish plans");

  const ready = [];
  const blocked = [];

  for (const dish of DISH_CATALOG_200) {
    const { relPaths, missing } = assertGallery(dish);
    if (missing.length) {
      blocked.push({ name: dish.name, missing });
      if (!allowPartial) continue;
      if (missing.length === 5) continue;
      const present = relPaths.filter((p) => !missing.includes(p));
      if (!present.length) continue;
      ready.push({ dish, relPaths: present });
    } else {
      ready.push({ dish, relPaths });
    }
  }

  if (!allowPartial && blocked.length) {
    console.error(
      `Missing images for ${blocked.length} dishes. Refusing import.`
    );
    console.error("First 5:", blocked.slice(0, 5));
    console.error("Re-run generate-dish-gallery-1000.js or pass --allow-partial");
    process.exit(1);
  }

  const deleted = await FoodplanModel.deleteMany({});
  console.log(`Removed ${deleted.deletedCount} existing plans`);

  let created = 0;
  for (const { dish, relPaths } of ready) {
    await FoodplanModel.create({
      name: dish.name.slice(0, 40),
      category: dish.category,
      price: dish.price,
      discount: dish.discount,
      duration: dish.duration,
      averageRating: dish.averageRating,
      description: dish.description.slice(0, 500),
      image: relPaths[0],
      images: relPaths,
      icon: dish.icon || "🌿",
    });
    created += 1;
    console.log(`+ ${dish.name} (${relPaths.length} photos)`);
  }

  console.log(`\nDone. Imported ${created} plans. Skipped ${blocked.length}.`);
  await mongoose.disconnect();
  if (!created) process.exit(1);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

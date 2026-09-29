/**
 * After visual approval: point one dish plan at its 5 gallery files.
 * Usage: node scripts/approve-dish-gallery.js paneer-butter-masala
 */
require("dotenv").config();
require("../model/userModule");
const mongoose = require("mongoose");
const FoodplanModel = require("../model/planModel");
const {
  DISH_CATALOG_200,
  imagePathsForDish,
} = require("../utilities/dishCatalog200");

const slug = process.argv[2];

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

(async () => {
  if (!slug) {
    console.error("Usage: node scripts/approve-dish-gallery.js <slug>");
    process.exit(1);
  }
  await waitForDb();
  const dish = DISH_CATALOG_200.find((d) => d.slug === slug);
  if (!dish) {
    console.error("Unknown slug:", slug);
    process.exit(1);
  }
  const images = imagePathsForDish(dish);
  const doc = {
    name: dish.name.slice(0, 40),
    category: dish.category,
    price: dish.price,
    discount: dish.discount,
    duration: dish.duration,
    averageRating: dish.averageRating,
    description: dish.description.slice(0, 500),
    image: images[0],
    images,
    icon: dish.icon || "🌿",
  };
  const updated = await FoodplanModel.findOneAndUpdate(
    { name: dish.name },
    { $set: doc },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  console.log("saved", updated.name, String(updated._id));
  console.log(updated.image);
  console.log("gallery", (updated.images || []).join(", "));
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

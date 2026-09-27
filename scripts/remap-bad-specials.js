/**
 * Remap known-bad special plans to trusted dish photos already on disk.
 */
require("../model/userModule");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const FoodplanModel = require("../model/planModel");
const { MAP_FILE, loadDownloadedImageMap } = require("../utilities/planImageResolver");

const REMAP = {
  "Paneer Malai Special": "uploads/dishes/paneer-malai-special.jpg",
  "Fruit Chaat Deluxe": "uploads/dishes/fruit-chaat-deluxe.jpg",
  "Fresh Garden Salad": "uploads/dishes/fresh-garden-salad.jpg",
  "Masala Dosa": "uploads/dishes/masala-dosa.jpg",
  "Chhole Bhature": "uploads/dishes/chhole-bhature.jpg",
  "Chole Bhature": "uploads/dishes/chole-bhature.jpg",
};

async function waitForDb() {
  if (mongoose.connection.readyState === 1) return;
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("db timeout")), 30000);
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

function exists(rel) {
  return fs.existsSync(path.join(__dirname, "..", rel.replace(/\//g, path.sep)));
}

(async () => {
  await waitForDb();
  const map = loadDownloadedImageMap();
  let updated = 0;
  for (const [name, image] of Object.entries(REMAP)) {
    if (!exists(image)) {
      console.warn("missing file", image);
      continue;
    }
    map[name] = image;
    const res = await FoodplanModel.updateMany(
      { name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}` } },
      { $set: { image, images: [image] } }
    );
    console.log(`${name} → ${image} (${res.modifiedCount} plans)`);
    updated += res.modifiedCount;
  }
  fs.writeFileSync(MAP_FILE, JSON.stringify(map, null, 2));
  console.log("Updated", updated, "plans");
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Apply downloaded dish images to plans (skips first 10).
 *
 * Usage: node scripts/fix-plan-images.js
 *        node scripts/fix-plan-images.js --rag
 */
require("../model/userModule");
const mongoose = require("mongoose");
const path = require("path");
const FoodplanModel = require("../model/planModel");
const {
  buildCanonicalImageMap,
  resolveImageForPlan,
  normalizeImagePath,
  listUploadImages,
  getMergedImageMap,
} = require("../utilities/planImageResolver");
const { upsertPlanEmbedding } = require("../controller/suggestController");

const KEEP_FIRST = 10;
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

async function waitForDb() {
  if (mongoose.connection.readyState === 1) return;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("DB connection timeout")), 30000);
    mongoose.connection.once("connected", () => {
      clearTimeout(timer);
      resolve();
    });
    mongoose.connection.once("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function main() {
  const runRag = process.argv.includes("--rag");
  await waitForDb();

  const plans = await FoodplanModel.find().sort({ _id: 1 });
  const imagePool = listUploadImages(UPLOADS_DIR);
  const imageMap = buildCanonicalImageMap(plans, KEEP_FIRST);
  const mergedCount = Object.keys(getMergedImageMap()).length;
  console.log(`Using ${mergedCount} dish image mappings (uploads/dish-image-map.json + curated).\n`);
  const poolCache = {};

  let updated = 0;
  const toReindex = [];

  for (let i = KEEP_FIRST; i < plans.length; i += 1) {
    const plan = plans[i];
    const correctImage = resolveImageForPlan(plan, imageMap, imagePool, poolCache);
    const current = normalizeImagePath(plan.image);

    if (correctImage && current !== correctImage) {
      plan.image = correctImage;
      plan.images = [correctImage];
      await plan.save();
      updated += 1;
      toReindex.push(plan);
      if (updated <= 10) {
        console.log(`  ${plan.name}: ${current} → ${correctImage}`);
      }
    }
  }

  console.log(`\nFixed ${updated} plan(s) after plan #${KEEP_FIRST} (of ${plans.length} total).`);
  if (updated > 10) console.log(`  (showing first 10 changes above)`);

  if (runRag && toReindex.length) {
    console.log(`\nRe-indexing ${toReindex.length} updated plans in RAG...`);
    let ok = 0;
    for (const plan of toReindex) {
      const result = await upsertPlanEmbedding(plan);
      if (result.ok) ok += 1;
    }
    console.log(`RAG: ${ok}/${toReindex.length} updated.\n`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("fix-plan-images failed:", err.message);
  process.exit(1);
});

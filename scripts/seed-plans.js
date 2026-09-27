/**
 * Seed food plans into MongoDB.
 *
 * Usage:
 *   node scripts/seed-plans.js              # insert up to 1000 plans (skip existing names)
 *   node scripts/seed-plans.js --rag          # also index all plans in RAG (slow)
 *   COUNT=500 node scripts/seed-plans.js      # custom count
 */
require("../model/userModule");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const FoodplanModel = require("../model/planModel");
const { generatePlanBatch, FOOD_CATEGORIES } = require("../utilities/foodCategories");
const { upsertPlanEmbedding } = require("../controller/suggestController");

const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
const BATCH_SIZE = 100;
const DEFAULT_COUNT = 1000;

function listUploadImages() {
  if (!fs.existsSync(UPLOADS_DIR)) return [];
  return fs
    .readdirSync(UPLOADS_DIR)
    .filter((f) => /\.(png|jpe?g)$/i.test(f))
    .map((f) => `uploads/${f}`);
}

async function waitForDb(maxAttempts = 5) {
  if (mongoose.connection.readyState === 1) return;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await new Promise((resolve, reject) => {
        if (mongoose.connection.readyState === 1) {
          resolve();
          return;
        }
        const onConnected = () => {
          cleanup();
          resolve();
        };
        const onError = (err) => {
          cleanup();
          reject(err);
        };
        const cleanup = () => {
          mongoose.connection.off("connected", onConnected);
          mongoose.connection.off("error", onError);
          clearTimeout(timer);
        };
        mongoose.connection.once("connected", onConnected);
        mongoose.connection.once("error", onError);
        const timer = setTimeout(() => {
          cleanup();
          reject(new Error("DB connection timeout (20s)"));
        }, 20000);
      });
      return;
    } catch (err) {
      if (attempt === maxAttempts) {
        const msg = err.message || String(err);
        console.error("\nCould not connect to MongoDB Atlas.");
        console.error("Error:", msg);
        if (msg.includes("ETIMEOUT") || msg.includes("querySrv")) {
          console.error("\nTry:");
          console.error("  1. Check Wi‑Fi / internet (open https://cloud.mongodb.com)");
          console.error("  2. Disable VPN or try another network");
          console.error("  3. In Atlas → Network Access → allow your IP (or 0.0.0.0/0 for dev)");
          console.error("  4. Resume cluster if it was paused (Atlas → Clusters)");
          console.error("  5. Flush DNS: ipconfig /flushdns  then retry\n");
        }
        throw err;
      }
      console.log(`DB connect attempt ${attempt}/${maxAttempts} failed, retrying in 3s...`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

async function insertPlans(targetCount) {
  const images = listUploadImages();
  if (!images.length) {
    throw new Error("No images in uploads/. Add at least one PNG/JPG first.");
  }

  const existing = await FoodplanModel.countDocuments();
  console.log(`Existing plans in DB: ${existing}`);

  const toGenerate = generatePlanBatch(targetCount, images);
  const existingNames = new Set(
    (await FoodplanModel.find({ name: { $in: toGenerate.map((p) => p.name) } }).select("name")).map(
      (p) => p.name
    )
  );

  const newPlans = toGenerate.filter((p) => !existingNames.has(p.name));
  if (!newPlans.length) {
    console.log("All seed plan names already exist — nothing to insert.");
    return { inserted: 0, skipped: toGenerate.length };
  }

  let inserted = 0;
  for (let i = 0; i < newPlans.length; i += BATCH_SIZE) {
    const batch = newPlans.slice(i, i + BATCH_SIZE);
    await FoodplanModel.insertMany(batch, { ordered: false });
    inserted += batch.length;
    console.log(`Inserted ${inserted}/${newPlans.length} plans...`);
  }

  return { inserted, skipped: toGenerate.length - newPlans.length };
}

async function indexAllPlans() {
  const plans = await FoodplanModel.find().select(
    "name price duration discount image images category icon"
  );
  console.log(`RAG indexing ${plans.length} plans (this may take a while)...`);

  let ok = 0;
  let fail = 0;
  for (let i = 0; i < plans.length; i += 1) {
    const result = await upsertPlanEmbedding(plans[i]);
    if (result.ok) ok += 1;
    else fail += 1;
    if ((i + 1) % 25 === 0 || i + 1 === plans.length) {
      console.log(`  Indexed ${i + 1}/${plans.length} (${ok} ok, ${fail} failed)`);
    }
  }

  return { ok, fail, total: plans.length };
}

async function main() {
  const targetCount = parseInt(process.env.COUNT || String(DEFAULT_COUNT), 10);
  const runRag = process.argv.includes("--rag");

  await waitForDb();

  console.log(`\n=== Seed ${targetCount} food plans (${FOOD_CATEGORIES.length} categories) ===\n`);
  const { inserted, skipped } = await insertPlans(targetCount);
  console.log(`Done: ${inserted} inserted, ${skipped} skipped (already existed).\n`);

  if (runRag) {
    const rag = await indexAllPlans();
    console.log(`RAG: ${rag.ok}/${rag.total} indexed, ${rag.fail} failed.\n`);
  } else {
    console.log("Tip: run with --rag to index plans for AI search, or use Admin AI → Reindex.\n");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});

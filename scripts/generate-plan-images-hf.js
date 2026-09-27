/**
 * Generate dish images via Hugging Face and apply to plans after the first 10.
 *
 * Usage:
 *   node scripts/generate-plan-images-hf.js
 *   node scripts/generate-plan-images-hf.js --rag
 *   node scripts/generate-plan-images-hf.js --limit=20
 *   node scripts/generate-plan-images-hf.js --download-fallback
 */
require("dotenv").config();
require("../model/userModule");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const FoodplanModel = require("../model/planModel");
const { FOOD_CATEGORIES } = require("../utilities/foodCategories");
const {
  extractBaseName,
  getMergedImageMap,
} = require("../utilities/planImageResolver");
const {
  getHfToken,
  generateAndSaveDishImage,
} = require("../utilities/hfImageGenerator");
const { upsertPlanEmbedding } = require("../controller/suggestController");

const KEEP_FIRST = 10;
const OUT_DIR = path.join(__dirname, "..", "uploads", "dishes", "hf");
const MAP_FILE = path.join(__dirname, "..", "uploads", "dish-image-map.json");

const CATEGORY_LABEL = Object.fromEntries(
  FOOD_CATEGORIES.map((c) => [c.id, c.label])
);

function parseLimit() {
  const arg = process.argv.find((a) => a.startsWith("--limit="));
  if (!arg) return Infinity;
  const n = Number(arg.split("=")[1]);
  return Number.isFinite(n) && n > 0 ? n : Infinity;
}

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

function loadMap() {
  if (!fs.existsSync(MAP_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(MAP_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveMap(map) {
  const dir = path.dirname(MAP_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(MAP_FILE, JSON.stringify(map, null, 2));
}

async function downloadFallbackImage(baseName, categoryId) {
  try {
    const {
      fetchImageForDish,
      slugify,
      DISHES_DIR,
    } = require("../utilities/dishImageDownloader");
    const result = await fetchImageForDish(baseName, categoryId);
    if (!result) return null;
    if (!fs.existsSync(DISHES_DIR)) fs.mkdirSync(DISHES_DIR, { recursive: true });
    const slug = slugify(baseName);
    const outRel = `uploads/dishes/${slug}.${result.ext}`;
    const outPath = path.join(DISHES_DIR, `${slug}.${result.ext}`);
    fs.writeFileSync(outPath, result.buffer);
    return { relative: outRel };
  } catch {
    return null;
  }
}

async function main() {
  const runRag = process.argv.includes("--rag");
  const useDownloadFallback = process.argv.includes("--download-fallback");
  const limit = parseLimit();

  if (!getHfToken()) {
    console.error("HF_TOKEN missing. Set it in .env");
    process.exit(1);
  }

  await waitForDb();

  const plans = await FoodplanModel.find().sort({ _id: 1 });
  console.log(`Loaded ${plans.length} plans. Keeping first ${KEEP_FIRST} unchanged.\n`);

  const targets = plans.slice(KEEP_FIRST);
  const byBase = new Map();
  for (const plan of targets) {
    const base = extractBaseName(plan.name);
    if (!base) continue;
    if (!byBase.has(base)) byBase.set(base, []);
    byBase.get(base).push(plan);
  }

  const uniqueBases = [...byBase.keys()].slice(0, limit === Infinity ? undefined : limit);
  console.log(`Unique dishes to image: ${uniqueBases.length} (of ${byBase.size})\n`);

  const imageMap = { ...getMergedImageMap(), ...loadMap() };
  let generated = 0;
  let failed = 0;
  const failures = [];

  for (const base of uniqueBases) {
    const sample = byBase.get(base)[0];
    const categoryLabel = CATEGORY_LABEL[sample.category] || sample.category || "";

    // Skip if we already have an HF image for this base
    const existing = imageMap[base];
    if (existing && String(existing).includes("/dishes/hf/")) {
      console.log(`  skip (cached HF): ${base}`);
      continue;
    }

    try {
      console.log(`  generating: ${base}...`);
      const { relative } = await generateAndSaveDishImage(base, categoryLabel, OUT_DIR);
      imageMap[base] = relative;
      generated += 1;
      console.log(`    → ${relative}`);
      // Be kind to rate limits
      await new Promise((r) => setTimeout(r, 1200));
    } catch (err) {
      console.warn(`    HF failed for ${base}: ${err.message}`);
      if (useDownloadFallback) {
        try {
          const dl = await downloadFallbackImage(base, sample.category);
          if (dl?.relative || dl?.path) {
            imageMap[base] = dl.relative || dl.path;
            console.log(`    download fallback → ${imageMap[base]}`);
          } else {
            failed += 1;
            failures.push(base);
          }
        } catch (e2) {
          failed += 1;
          failures.push(base);
          console.warn(`    download fallback failed: ${e2.message}`);
        }
      } else {
        failed += 1;
        failures.push(base);
      }
    }
  }

  saveMap(imageMap);
  console.log(`\nSaved map → ${MAP_FILE}`);
  console.log(`Generated ${generated}, failed ${failed}`);

  let updated = 0;
  const toReindex = [];
  for (const plan of targets) {
    const base = extractBaseName(plan.name);
    const nextImage = imageMap[base];
    if (!nextImage) continue;
    const current = String(plan.image || "").replace(/\\/g, "/");
    if (current === nextImage) continue;
    plan.image = nextImage;
    plan.images = [nextImage];
    await plan.save();
    updated += 1;
    toReindex.push(plan);
  }

  console.log(`Updated ${updated} plan image(s) after #${KEEP_FIRST}.`);

  if (runRag && toReindex.length) {
    console.log(`Re-indexing ${toReindex.length} plans in RAG...`);
    let ok = 0;
    for (const plan of toReindex) {
      const result = await upsertPlanEmbedding(plan);
      if (result.ok) ok += 1;
    }
    console.log(`RAG: ${ok}/${toReindex.length}`);
  }

  if (failures.length) {
    console.log(`\nFailed dishes (${failures.length}): ${failures.slice(0, 20).join(", ")}`);
  }

  await mongoose.disconnect();
  process.exit(failed && generated === 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

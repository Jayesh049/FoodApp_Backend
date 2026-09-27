/**
 * Audit and fix ALL plan images (including first 10).
 * Prefers uploads/dishes/* dish photos over legacy root uploads.
 *
 * Usage: node scripts/audit-fix-plan-media.js
 *        node scripts/audit-fix-plan-media.js --rag
 *        node scripts/audit-fix-plan-media.js --download-missing
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
  normalizeImagePath,
  MAP_FILE,
  loadDownloadedImageMap,
} = require("../utilities/planImageResolver");
const {
  fetchImageForDish,
  slugify,
  DISHES_DIR,
} = require("../utilities/dishImageDownloader");
const { upsertPlanEmbedding } = require("../controller/suggestController");

const UPLOADS_ROOT = path.join(__dirname, "..", "uploads");

const CATEGORY_BY_BASE = {};
FOOD_CATEGORIES.forEach((cat) => {
  cat.bases.forEach((base) => {
    CATEGORY_BY_BASE[base] = cat.id;
  });
});

function absFromRel(rel) {
  return path.join(__dirname, "..", String(rel).replace(/\//g, path.sep));
}

function fileExists(rel) {
  if (!rel) return false;
  try {
    return fs.existsSync(absFromRel(rel));
  } catch {
    return false;
  }
}

/** Prefer dish folder images over legacy root uploads (often wrong/portrait). */
function isLegacyRootUpload(rel) {
  const n = normalizeImagePath(rel) || "";
  return /^uploads\/[^/]+\.(png|jpe?g)$/i.test(n) && !n.includes("/dishes/");
}

function buildDiskDishMap() {
  const map = {};
  if (!fs.existsSync(DISHES_DIR)) return map;
  const files = fs.readdirSync(DISHES_DIR).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  const bySlug = Object.fromEntries(files.map((f) => [f.replace(/\.[^.]+$/, ""), f]));

  FOOD_CATEGORIES.forEach((cat) => {
    cat.bases.forEach((base) => {
      const slug = slugify(base);
      const file = bySlug[slug];
      if (file) map[base] = `uploads/dishes/${file}`;
    });
  });
  return map;
}

function saveMap(map) {
  const dir = path.dirname(MAP_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(MAP_FILE, JSON.stringify(map, null, 2));
}

async function ensureDishImage(base, categoryId, map) {
  if (map[base] && fileExists(map[base]) && !isLegacyRootUpload(map[base])) {
    return map[base];
  }

  if (!fs.existsSync(DISHES_DIR)) fs.mkdirSync(DISHES_DIR, { recursive: true });
  const result = await fetchImageForDish(base, categoryId || CATEGORY_BY_BASE[base]);
  if (!result) return map[base] && fileExists(map[base]) ? map[base] : null;

  const slug = slugify(base);
  const outRel = `uploads/dishes/${slug}.${result.ext}`;
  fs.writeFileSync(path.join(DISHES_DIR, `${slug}.${result.ext}`), result.buffer);
  map[base] = outRel;
  return outRel;
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

async function main() {
  const runRag = process.argv.includes("--rag");
  const downloadMissing = process.argv.includes("--download-missing");

  await waitForDb();

  const diskMap = buildDiskDishMap();
  const existingMap = loadDownloadedImageMap();
  // Disk dish photos win over stale map / curated portraits
  const map = { ...existingMap, ...diskMap };

  console.log(`Disk dish images matched: ${Object.keys(diskMap).length}`);
  console.log(`Working map size: ${Object.keys(map).length}\n`);

  const plans = await FoodplanModel.find().sort({ _id: 1 });
  console.log(`Plans: ${plans.length}`);

  const missingBases = new Set();
  for (const plan of plans) {
    const base = extractBaseName(plan.name);
    if (!base) continue;
    if (!map[base] || !fileExists(map[base]) || isLegacyRootUpload(map[base])) {
      missingBases.add(base);
    }
  }

  if (downloadMissing && missingBases.size) {
    console.log(`Downloading ${missingBases.size} missing/legacy dishes...\n`);
    for (const base of missingBases) {
      try {
        const rel = await ensureDishImage(base, CATEGORY_BY_BASE[base], map);
        console.log(`  ${base} → ${rel || "FAILED"}`);
        await new Promise((r) => setTimeout(r, 400));
      } catch (err) {
        console.warn(`  ${base} error: ${err.message}`);
      }
    }
  } else if (missingBases.size) {
    console.log(
      `${missingBases.size} bases still on legacy/missing paths. Re-run with --download-missing if needed.`
    );
    console.log(`  e.g. ${[...missingBases].slice(0, 8).join(", ")}`);
  }

  saveMap(map);

  let updated = 0;
  let alreadyOk = 0;
  let unresolved = 0;
  const reuseCount = {};
  const toReindex = [];
  const samples = [];

  for (const plan of plans) {
    const base = extractBaseName(plan.name);
    const next = base && map[base] && fileExists(map[base]) && !isLegacyRootUpload(map[base])
      ? normalizeImagePath(map[base])
      : null;

    if (!next) {
      unresolved += 1;
      continue;
    }

    reuseCount[next] = (reuseCount[next] || 0) + 1;
    const current = normalizeImagePath(plan.image);
    if (current === next) {
      alreadyOk += 1;
      continue;
    }

    plan.image = next;
    plan.images = [next];
    await plan.save();
    updated += 1;
    toReindex.push(plan);
    if (samples.length < 12) {
      samples.push(`${plan.name}: ${current} → ${next}`);
    }
  }

  console.log("\n--- Results ---");
  samples.forEach((s) => console.log(`  ${s}`));
  console.log(`Updated: ${updated}`);
  console.log(`Already OK: ${alreadyOk}`);
  console.log(`Unresolved: ${unresolved}`);

  const heavyReuse = Object.entries(reuseCount)
    .filter(([, n]) => n > 30)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  if (heavyReuse.length) {
    console.log("\nMost reused dish images (expected across rotations):");
    heavyReuse.forEach(([p, n]) => console.log(`  ${p}: ${n} plans`));
  }

  if (runRag && toReindex.length) {
    console.log(`\nRe-indexing ${toReindex.length} plans...`);
    let ok = 0;
    for (const plan of toReindex) {
      const r = await upsertPlanEmbedding(plan);
      if (r.ok) ok += 1;
    }
    console.log(`RAG: ${ok}/${toReindex.length}`);
  }

  await mongoose.disconnect();
  process.exit(unresolved && updated === 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

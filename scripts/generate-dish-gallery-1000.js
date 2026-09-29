/**
 * Generate 200 dishes × 5 shots = 1000 standalone PNGs via Hugging Face.
 *
 * Usage:
 *   node scripts/generate-dish-gallery-1000.js
 *   node scripts/generate-dish-gallery-1000.js --limit-dishes=5
 *   node scripts/generate-dish-gallery-1000.js --shots=01,02
 *   node scripts/generate-dish-gallery-1000.js --force
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const {
  DISH_CATALOG_200,
  SHOT_TYPES,
} = require("../utilities/dishCatalog200");
const {
  getHfToken,
  generateAndSaveGalleryShot,
} = require("../utilities/hfImageGenerator");

const UPLOADS_ROOT = path.join(__dirname, "..", "uploads");
const PROGRESS_FILE = path.join(UPLOADS_ROOT, "generation-progress.json");
const CATALOG_JSON = path.join(UPLOADS_ROOT, "dish-catalog-200.json");
const MAP_FILE = path.join(UPLOADS_ROOT, "dish-image-map.json");
const DELAY_MS = Number(process.env.HF_GEN_DELAY_MS || 1200);

function parseArgs() {
  const force = process.argv.includes("--force");
  const limitArg = process.argv.find((a) => a.startsWith("--limit-dishes="));
  const startArg = process.argv.find((a) => a.startsWith("--start-index="));
  const slugArg = process.argv.find((a) => a.startsWith("--slug="));
  const shotsArg = process.argv.find((a) => a.startsWith("--shots="));
  const limit = limitArg
    ? Math.max(1, Number(limitArg.split("=")[1]) || 200)
    : 200;
  const startIndex = startArg
    ? Math.max(0, Number(startArg.split("=")[1]) || 0)
    : 0;
  const slug = slugArg ? slugArg.split("=")[1].trim() : "";
  let shots = SHOT_TYPES;
  if (shotsArg) {
    const ids = shotsArg
      .split("=")[1]
      .split(",")
      .map((s) => s.trim().padStart(2, "0"));
    shots = SHOT_TYPES.filter((s) => ids.includes(s.id));
  }
  return { force, limit, startIndex, slug, shots };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadProgress() {
  if (!fs.existsSync(PROGRESS_FILE)) {
    return { completed: {}, failed: {}, startedAt: new Date().toISOString() };
  }
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8"));
  } catch {
    return { completed: {}, failed: {}, startedAt: new Date().toISOString() };
  }
}

function saveProgress(progress) {
  progress.updatedAt = new Date().toISOString();
  fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function shotKey(slug, shotId) {
  return `${slug}:${shotId}`;
}

async function generateWithRetry(dish, shot, force, seedSalt, attempts = 4) {
  const outPath = path.join(
    UPLOADS_ROOT,
    "dishes",
    dish.slug,
    `${dish.slug}-${shot.id}.png`
  );
  if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
    return {
      relative: `uploads/dishes/${dish.slug}/${dish.slug}-${shot.id}.png`,
      skipped: true,
    };
  }

  let lastErr;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      const result = await generateAndSaveGalleryShot(dish, shot, UPLOADS_ROOT, {
        seedSalt: force ? seedSalt : undefined,
      });
      return { ...result, skipped: false };
    } catch (err) {
      lastErr = err;
      const wait = Math.min(60000, 4000 * i);
      console.warn(
        `  retry ${i}/${attempts} ${dish.slug}-${shot.id}: ${err.message} (wait ${wait}ms)`
      );
      await sleep(wait);
    }
  }
  throw lastErr;
}

(async () => {
  if (!getHfToken()) {
    console.error("HF_TOKEN missing. Set it in Backend/.env");
    process.exit(1);
  }

  const { force, limit, startIndex, slug, shots } = parseArgs();
  let dishes = DISH_CATALOG_200;
  if (slug) {
    dishes = DISH_CATALOG_200.filter((d) => d.slug === slug);
    if (!dishes.length) {
      console.error(`No dish with slug=${slug}`);
      process.exit(1);
    }
  } else {
    dishes = DISH_CATALOG_200.slice(startIndex, startIndex + limit);
  }

  fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
  fs.writeFileSync(
    CATALOG_JSON,
    JSON.stringify(
      {
        count: DISH_CATALOG_200.length,
        shotTypes: SHOT_TYPES.map((s) => ({ id: s.id, key: s.key, label: s.label })),
        dishes: DISH_CATALOG_200,
      },
      null,
      2
    )
  );

  const progress = loadProgress();
  const imageMap = fs.existsSync(MAP_FILE)
    ? JSON.parse(fs.readFileSync(MAP_FILE, "utf8"))
    : {};
  const seedSalt = Date.now() % 100000;

  let done = 0;
  let skipped = 0;
  let failed = 0;
  const total = dishes.length * shots.length;

  console.log(
    `Generating ${dishes.length} dishes × ${shots.length} shots = ${total} images (force=${force}, seedSalt=${seedSalt})`
  );

  for (const dish of dishes) {
    const paths = [];
    for (const shot of shots) {
      const key = shotKey(dish.slug, shot.id);
      process.stdout.write(`[${done + skipped + failed + 1}/${total}] ${key} ... `);
      try {
        const result = await generateWithRetry(dish, shot, force, seedSalt);
        if (result.skipped) {
          skipped += 1;
          console.log("skip");
        } else {
          done += 1;
          console.log("ok");
          await sleep(DELAY_MS);
        }
        progress.completed[key] = {
          relative: result.relative,
          at: new Date().toISOString(),
        };
        delete progress.failed[key];
        paths.push(result.relative);
      } catch (err) {
        failed += 1;
        progress.failed[key] = { error: err.message, at: new Date().toISOString() };
        console.log(`FAIL: ${err.message}`);
      }
      saveProgress(progress);
    }

    if (paths.length === shots.length || paths.length === 5) {
      imageMap[dish.name] = paths[0];
      imageMap[`${dish.name}__gallery`] = paths;
    }
    fs.writeFileSync(MAP_FILE, JSON.stringify(imageMap, null, 2));
  }

  console.log(
    `\nDone. generated=${done} skipped=${skipped} failed=${failed} total_targets=${total}`
  );
  console.log(`Progress: ${PROGRESS_FILE}`);
  if (failed > 0) process.exitCode = 2;
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

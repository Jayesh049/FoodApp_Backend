/**
 * Generate dish galleries one-by-one; Playwright must APPROVE before next dish.
 *
 * Usage:
 *   node scripts/generate-approve-loop.js
 *   node scripts/generate-approve-loop.js --start=1
 *   node scripts/generate-approve-loop.js --start=2 --end=10
 *   node scripts/generate-approve-loop.js --force
 *
 * Dish index is 1-based (catalog order).
 */
require("dotenv").config();
const { spawnSync } = require("child_process");
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
const APPROVAL_LOG = path.join(UPLOADS_ROOT, "playwright-approvals.json");
const FE_ROOT = path.join(__dirname, "..", "..", "foodAppFrontend");
const DELAY_MS = Number(process.env.HF_GEN_DELAY_MS || 1200);

function parseArgs() {
  const force = process.argv.includes("--force");
  const startArg = process.argv.find((a) => a.startsWith("--start="));
  const endArg = process.argv.find((a) => a.startsWith("--end="));
  const start = startArg ? Math.max(1, Number(startArg.split("=")[1]) || 1) : 1;
  const end = endArg
    ? Math.min(200, Number(endArg.split("=")[1]) || 200)
    : 200;
  return { force, start, end };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function saveJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function galleryComplete(dish) {
  return SHOT_TYPES.every((shot) => {
    const p = path.join(
      UPLOADS_ROOT,
      "dishes",
      dish.slug,
      `${dish.slug}-${shot.id}.png`
    );
    return fs.existsSync(p) && fs.statSync(p).size > 1000;
  });
}

async function generateDish(dish, force) {
  const seedSalt = Date.now() % 100000;
  for (const shot of SHOT_TYPES) {
    const out = path.join(
      UPLOADS_ROOT,
      "dishes",
      dish.slug,
      `${dish.slug}-${shot.id}.png`
    );
    if (!force && fs.existsSync(out) && fs.statSync(out).size > 1000) {
      console.log(`  skip ${dish.slug}-${shot.id}`);
      continue;
    }
    process.stdout.write(`  gen ${dish.slug}-${shot.id} ... `);
    let lastErr;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        await generateAndSaveGalleryShot(dish, shot, UPLOADS_ROOT, {
          seedSalt: force ? seedSalt + attempt : undefined,
        });
        console.log("ok");
        lastErr = null;
        await sleep(DELAY_MS);
        break;
      } catch (err) {
        lastErr = err;
        console.warn(`retry ${attempt}: ${err.message}`);
        await sleep(4000 * attempt);
      }
    }
    if (lastErr) throw lastErr;
  }
}

function playwrightApprove(slug) {
  const env = {
    ...process.env,
    DISH_SLUG: slug,
    DISH_UPLOADS_ROOT: UPLOADS_ROOT,
  };
  const result = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    [
      "playwright",
      "test",
      "e2e/dish-gallery-approve.spec.js",
      "--reporter=list",
    ],
    {
      cwd: FE_ROOT,
      env,
      encoding: "utf8",
      shell: true,
    }
  );
  console.log(result.stdout || "");
  if (result.stderr) console.error(result.stderr);
  return result.status === 0;
}

(async () => {
  if (!getHfToken()) {
    console.error("HF_TOKEN missing");
    process.exit(1);
  }

  const { force, start, end } = parseArgs();
  const approvals = loadJson(APPROVAL_LOG, { dishes: {} });
  const progress = loadJson(PROGRESS_FILE, { completed: {}, failed: {} });

  console.log(`Loop dishes ${start}..${end} (force=${force})`);

  for (let i = start; i <= end; i += 1) {
    const dish = DISH_CATALOG_200[i - 1];
    if (!dish) break;

    console.log(`\n=== Dish ${i}/200: ${dish.name} (${dish.slug}) ===`);

    if (!force && approvals.dishes[dish.slug]?.status === "APPROVED") {
      console.log("Already Playwright-approved — skip");
      continue;
    }

    if (force || !galleryComplete(dish)) {
      await generateDish(dish, force || !galleryComplete(dish));
    } else {
      console.log("Gallery files present — running Playwright approval");
    }

    const ok = playwrightApprove(dish.slug);
    if (!ok) {
      console.warn(`Playwright REJECTED ${dish.slug} — regenerating once with --force`);
      await generateDish(dish, true);
      const ok2 = playwrightApprove(dish.slug);
      approvals.dishes[dish.slug] = {
        status: ok2 ? "APPROVED" : "REJECTED",
        index: i,
        name: dish.name,
        at: new Date().toISOString(),
        retried: true,
      };
      saveJson(APPROVAL_LOG, approvals);
      if (!ok2) {
        console.error(`Playwright REJECTED ${dish.slug} after retry — stopping loop`);
        process.exit(2);
      }
      console.log(`Playwright APPROVED ${dish.slug} after retry — continuing`);
    } else {
      approvals.dishes[dish.slug] = {
        status: "APPROVED",
        index: i,
        name: dish.name,
        at: new Date().toISOString(),
      };
      saveJson(APPROVAL_LOG, approvals);
      console.log(`Playwright APPROVED ${dish.slug} — continuing`);
    }

    for (const shot of SHOT_TYPES) {
      progress.completed[`${dish.slug}:${shot.id}`] = {
        at: new Date().toISOString(),
        approved: true,
      };
    }
    saveJson(PROGRESS_FILE, progress);
  }

  console.log("\nLoop finished.");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

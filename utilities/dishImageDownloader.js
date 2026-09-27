const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { FOOD_CATEGORIES } = require("./foodCategories");

const DISHES_DIR = path.join(__dirname, "..", "uploads", "dishes");
const MAP_FILE = path.join(__dirname, "..", "uploads", "dish-image-map.json");

function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getAllUniqueBases() {
  const bases = [];
  FOOD_CATEGORIES.forEach((cat) => {
    cat.bases.forEach((base) => {
      bases.push({ base, categoryId: cat.id, label: cat.label });
    });
  });
  return bases;
}

function searchQueryForDish(baseName, categoryId) {
  if (categoryId === "beverages") {
    return `${baseName} Indian drink beverage`;
  }
  if (categoryId === "dessert") {
    return `${baseName} Indian dessert sweet`;
  }
  return `${baseName} Indian food dish`;
}

async function fetchFromWikimedia(query) {
  const url = "https://commons.wikimedia.org/w/api.php";
  const { data } = await axios.get(url, {
    params: {
      action: "query",
      generator: "search",
      gsrsearch: query,
      gsrnamespace: 6,
      gsrlimit: 3,
      prop: "imageinfo",
      iiprop: "url",
      iiurlwidth: 512,
      format: "json",
      origin: "*",
    },
    timeout: 20000,
  });

  const pages = data?.query?.pages;
  if (!pages) return null;

  for (const page of Object.values(pages)) {
    const info = page.imageinfo?.[0];
    const imageUrl = info?.thumburl || info?.url;
    if (imageUrl && /\.(jpe?g|png|webp)/i.test(imageUrl)) {
      return imageUrl;
    }
  }
  return null;
}

async function fetchFromTheMealDb(baseName) {
  const { data } = await axios.get(
    `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(baseName)}`,
    { timeout: 15000 }
  );
  const meal = data?.meals?.[0];
  return meal?.strMealThumb || null;
}

async function fetchFromLoremFlickr(baseName) {
  const tag = encodeURIComponent(baseName.replace(/\s+/g, ","));
  const url = `https://loremflickr.com/512/512/${tag},food/all`;
  const res = await axios.get(url, {
    maxRedirects: 5,
    responseType: "arraybuffer",
    timeout: 25000,
    validateStatus: (s) => s >= 200 && s < 400,
  });
  const type = res.headers["content-type"] || "image/jpeg";
  if (!type.startsWith("image/")) return null;
  return { buffer: Buffer.from(res.data), ext: type.includes("png") ? "png" : "jpg" };
}

async function downloadBuffer(url) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 30000,
    maxRedirects: 5,
  });
  const type = res.headers["content-type"] || "image/jpeg";
  const ext = type.includes("png") ? "png" : "jpg";
  return { buffer: Buffer.from(res.data), ext };
}

async function fetchImageForDish(baseName, categoryId) {
  const query = searchQueryForDish(baseName, categoryId);

  try {
    const wikiUrl = await fetchFromWikimedia(query);
    if (wikiUrl) {
      return await downloadBuffer(wikiUrl);
    }
  } catch (err) {
    console.log(`  Wikimedia skip ${baseName}:`, err.message);
  }

  try {
    const mealUrl = await fetchFromTheMealDb(baseName);
    if (mealUrl) {
      return await downloadBuffer(mealUrl);
    }
  } catch (err) {
    console.log(`  TheMealDB skip ${baseName}:`, err.message);
  }

  // LoremFlickr often returns unrelated photos (cats, portraits) — do not use as fallback.
  console.log(`  No trusted source for ${baseName}`);
  return null;
}

function loadExistingMap() {
  if (!fs.existsSync(MAP_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(MAP_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveMap(map) {
  fs.writeFileSync(MAP_FILE, JSON.stringify(map, null, 2), "utf8");
}

async function downloadAllDishImages({ skipExisting = true, delayMs = 800 } = {}) {
  if (!fs.existsSync(DISHES_DIR)) {
    fs.mkdirSync(DISHES_DIR, { recursive: true });
  }

  const dishes = getAllUniqueBases();
  const map = loadExistingMap();
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const { base, categoryId } of dishes) {
    const slug = slugify(base);
    const relPath = `uploads/dishes/${slug}.jpg`;
    const absPath = path.join(DISHES_DIR, `${slug}.jpg`);

    if (skipExisting && map[base] && fs.existsSync(absPath)) {
      skipped += 1;
      console.log(`Skip (exists): ${base}`);
      continue;
    }

    console.log(`Downloading: ${base}...`);
    const result = await fetchImageForDish(base, categoryId);

    if (!result) {
      failed += 1;
      console.log(`  FAILED: ${base}`);
      continue;
    }

    const outPath = path.join(DISHES_DIR, `${slug}.${result.ext}`);
    const outRel = `uploads/dishes/${slug}.${result.ext}`;
    fs.writeFileSync(outPath, result.buffer);
    map[base] = outRel;
    downloaded += 1;
    console.log(`  OK → ${outRel}`);

    await new Promise((r) => setTimeout(r, delayMs));
  }

  saveMap(map);
  return { downloaded, skipped, failed, total: dishes.length, map };
}

module.exports = {
  getAllUniqueBases,
  slugify,
  fetchImageForDish,
  downloadAllDishImages,
  loadExistingMap,
  MAP_FILE,
  DISHES_DIR,
};

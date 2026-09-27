const fs = require("fs");
const path = require("path");

const MAP_FILE = path.join(__dirname, "..", "uploads", "dish-image-map.json");

/** Prefer dish-folder photos — legacy root uploads often contain wrong/portrait files. */
const CURATED_BASE_IMAGES = {
  Biryani: "uploads/dishes/biryani.jpg",
  "Paneer Tikka": "uploads/dishes/paneer-tikka.jpg",
  "Butter Chicken": "uploads/dishes/butter-chicken.jpg",
  "Dal Makhani": "uploads/dishes/dal-makhani.jpg",
  Naan: "uploads/dishes/naan.jpg",
  Rajma: "uploads/dishes/rajma.jpg",
  "Chole Bhature": "uploads/dishes/chole-bhature.jpg",
  "Chhole Bhature": "uploads/dishes/chhole-bhature.jpg",
  "Paneer Malai Special": "uploads/dishes/paneer-malai-special.jpg",
  Paratha: "uploads/dishes/paratha.jpg",
  Kadhi: "uploads/dishes/kadhi.jpg",
  "Malai Kofta": "uploads/dishes/malai-kofta.jpg",
  "Tandoori Roti": "uploads/dishes/tandoori-roti.jpg",
  "Shahi Paneer": "uploads/dishes/shahi-paneer.jpg",
  "Aloo Gobi": "uploads/dishes/aloo-gobi.jpg",
  Pulao: "uploads/dishes/pulao.jpg",
  Korma: "uploads/dishes/korma.jpg",
  "Seekh Kebab": "uploads/dishes/seekh-kebab.jpg",
  Raita: "uploads/dishes/raita.jpg",
  Samosa: "uploads/dishes/samosa.jpg",
  Kachori: "uploads/dishes/kachori.jpg",
  "Gulab Jamun Cup": "uploads/dishes/gulab-jamun-cup.jpg",
};

function loadDownloadedImageMap() {
  if (!fs.existsSync(MAP_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(MAP_FILE, "utf8"));
  } catch {
    return {};
  }
}

function getMergedImageMap() {
  return { ...CURATED_BASE_IMAGES, ...loadDownloadedImageMap() };
}

function normalizeImagePath(imagePath) {
  if (!imagePath) return imagePath;
  return String(imagePath).replace(/\\/g, "/");
}

/** Strip category code suffix e.g. "Biryani NI021" → "Biryani". */
function extractBaseName(planName) {
  return String(planName)
    .replace(/\s+(NI|SI|CH|DS|BV)\d{3}$/i, "")
    .trim();
}

function extractRotationIndex(planName) {
  const match = String(planName).match(/\s+(NI|SI|CH|DS|BV)(\d{3})$/i);
  return match ? parseInt(match[2], 10) : null;
}

/**
 * Build map: base dish name → image path.
 * Uses curated map, downloaded map, and early plan images when dish path missing.
 */
function buildCanonicalImageMap(plans, keepFirst = 10) {
  const map = { ...getMergedImageMap() };

  plans.forEach((plan, index) => {
    const base = extractBaseName(plan.name);
    const image = normalizeImagePath(plan.image);
    if (!base || !image) return;

    const rotation = extractRotationIndex(plan.name);
    const isFirstRotation = rotation !== null && rotation >= 1 && rotation <= 20;
    const isInKeepRange = index < keepFirst;
    const isDishFolder = image.includes("/dishes/");

    if ((!map[base] || !String(map[base]).includes("/dishes/")) && isDishFolder) {
      map[base] = image;
      return;
    }

    if (!map[base] && (isFirstRotation || isInKeepRange) && isDishFolder) {
      map[base] = image;
    }
  });

  return map;
}

function stablePoolImage(baseName, categoryId, imagePool, cache) {
  const key = `${categoryId || "any"}:${baseName}`;
  if (cache[key]) return cache[key];
  const dishPool = (imagePool || []).filter((p) => String(p).includes("/dishes/"));
  const pool = dishPool.length ? dishPool : imagePool;
  if (!pool || !pool.length) return null;
  const hash = baseName.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const image = pool[hash % pool.length];
  cache[key] = image;
  return image;
}

function resolveImageForPlan(plan, imageMap, imagePool, poolCache = {}) {
  const base = extractBaseName(plan.name);
  const merged = { ...getMergedImageMap(), ...imageMap };
  if (merged[base]) return merged[base];
  return stablePoolImage(base, plan.category, imagePool, poolCache);
}

function listUploadImages(uploadsDir) {
  if (!fs.existsSync(uploadsDir)) return [];
  const root = fs
    .readdirSync(uploadsDir)
    .filter((f) => /\.(png|jpe?g)$/i.test(f))
    .map((f) => `uploads/${f}`);
  const dishesDir = path.join(uploadsDir, "dishes");
  if (!fs.existsSync(dishesDir)) return root;
  const dishes = fs
    .readdirSync(dishesDir)
    .filter((f) => /\.(png|jpe?g)$/i.test(f))
    .map((f) => `uploads/dishes/${f}`);
  const hfDir = path.join(dishesDir, "hf");
  let hf = [];
  if (fs.existsSync(hfDir)) {
    hf = fs
      .readdirSync(hfDir)
      .filter((f) => /\.(png|jpe?g)$/i.test(f))
      .map((f) => `uploads/dishes/hf/${f}`);
  }
  // Prefer dish photos first so seed/pool picks food, not portraits
  return [...dishes, ...hf, ...root];
}

module.exports = {
  CURATED_BASE_IMAGES,
  MAP_FILE,
  loadDownloadedImageMap,
  getMergedImageMap,
  normalizeImagePath,
  extractBaseName,
  extractRotationIndex,
  buildCanonicalImageMap,
  resolveImageForPlan,
  stablePoolImage,
  listUploadImages,
};

/**
 * Wipe all plans and import one plan per folder from Pictures.
 * Usage: node scripts/import-plans-from-pictures.js
 */
require("../model/userModule");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const FoodplanModel = require("../model/planModel");

const PICTURES_DIR =
  process.env.PICTURES_DIR || path.join("C:", "Users", "DELL", "Pictures");
const UPLOADS_ROOT = path.join(__dirname, "..", "uploads", "user-plans");
const IMAGE_RE = /\.(jpe?g|png|webp|gif)$/i;

const CATALOG = {
  "Chhole Bhature": {
    name: "Chhole Bhature",
    category: "north_indian",
    price: 249,
    discount: 12,
    duration: 30,
    averageRating: 4.8,
    description:
      "Fluffy golden bhature with slow-cooked chhole — a North Indian classic, plated for everyday comfort.",
  },
  fruitChaat: {
    name: "Fruit Chaat",
    category: "dessert",
    price: 149,
    discount: 10,
    duration: 15,
    averageRating: 4.6,
    description:
      "Bright seasonal fruit tossed with chaat masala and a citrus lift — light, colourful, and refreshing.",
  },
  malai_paneer: {
    name: "Malai Paneer",
    category: "north_indian",
    price: 349,
    discount: 15,
    duration: 30,
    averageRating: 4.9,
    description:
      "Soft paneer in a silky malai gravy — rich, gentle spices, made for slow evenings.",
  },
  MasalaDosa: {
    name: "Masala Dosa",
    category: "south_indian",
    price: 199,
    discount: 10,
    duration: 21,
    averageRating: 4.7,
    description:
      "Crisp lace dosa wrapped around spiced potato, with sambar on the side — South Indian comfort, done right.",
  },
  mixVeg: {
    name: "Mix Veg",
    category: "north_indian",
    price: 229,
    discount: 10,
    duration: 28,
    averageRating: 4.5,
    description:
      "A colourful medley of garden vegetables in a home-style curry — wholesome and everyday-friendly.",
  },
  "naan curry": {
    name: "Naan Curry",
    category: "north_indian",
    price: 279,
    discount: 12,
    duration: 30,
    averageRating: 4.7,
    description:
      "Blistered butter naan beside a warm curry bowl — simple pairing, generous portions.",
  },
  "paneer tikka": {
    name: "Paneer Tikka",
    category: "north_indian",
    price: 329,
    discount: 14,
    duration: 30,
    averageRating: 4.9,
    description:
      "Char-kissed paneer tikka with peppers and onion — smoky, festive, and fully vegetarian.",
  },
  vegSalad: {
    name: "Veg Salad",
    category: "north_indian",
    price: 159,
    discount: 8,
    duration: 14,
    averageRating: 4.6,
    description:
      "Crisp greens and garden vegetables in a clean, bright bowl — fresh fuel for lighter days.",
  },
};

function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function titleFromFolder(folderName) {
  if (CATALOG[folderName]) return CATALOG[folderName].name;
  return String(folderName)
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function listImages(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => IMAGE_RE.test(f))
    .sort()
    .map((f) => path.join(dir, f));
}

function copyImages(folderName, absImages) {
  const slug = slugify(titleFromFolder(folderName));
  const destDir = path.join(UPLOADS_ROOT, slug);
  fs.mkdirSync(destDir, { recursive: true });

  return absImages.map((src, i) => {
    const ext = path.extname(src).toLowerCase() || ".png";
    const destName = `${slug}-${String(i + 1).padStart(2, "0")}${ext}`;
    fs.copyFileSync(src, path.join(destDir, destName));
    return `uploads/user-plans/${slug}/${destName}`.replace(/\\/g, "/");
  });
}

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
  if (!fs.existsSync(PICTURES_DIR)) {
    throw new Error(`Pictures folder not found: ${PICTURES_DIR}`);
  }

  await waitForDb();
  console.log("Connected. Source:", PICTURES_DIR);

  const deleted = await FoodplanModel.deleteMany({});
  console.log(`Removed ${deleted.deletedCount} existing plans`);

  if (fs.existsSync(UPLOADS_ROOT)) {
    fs.rmSync(UPLOADS_ROOT, { recursive: true, force: true });
  }
  fs.mkdirSync(UPLOADS_ROOT, { recursive: true });

  const folders = fs
    .readdirSync(PICTURES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  let created = 0;
  for (const folder of folders) {
    const images = listImages(path.join(PICTURES_DIR, folder));
    if (!images.length) {
      console.warn(`Skip (no images): ${folder}`);
      continue;
    }

    const meta = CATALOG[folder] || {
      name: titleFromFolder(folder),
      category: "north_indian",
      price: 199,
      discount: 10,
      duration: 30,
      averageRating: 4.5,
      description: `A carefully plated ${titleFromFolder(folder)} plan — fresh, vegetarian, and ready for your week.`,
    };

    const relImages = copyImages(folder, images);
    const plan = await FoodplanModel.create({
      name: meta.name.slice(0, 40),
      category: meta.category,
      price: meta.price,
      discount: meta.discount,
      duration: meta.duration,
      averageRating: meta.averageRating,
      description: meta.description,
      image: relImages[0],
      images: relImages,
      icon: "🌿",
    });

    created += 1;
    console.log(`+ ${plan.name} (${relImages.length} photos)`);
  }

  console.log(`\nDone. Imported ${created} plans from Pictures.`);
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

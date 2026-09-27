/**
 * Replace known-bad dish images (cats, wrong meat shots) with trusted downloads / copies.
 */
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const mongoose = require("mongoose");
require("../model/userModule");
const FoodplanModel = require("../model/planModel");

const DISHES = path.join(__dirname, "..", "uploads", "dishes");
const MAP_FILE = path.join(__dirname, "..", "uploads", "dish-image-map.json");
const UA = "FoodAppDishFix/1.0 (local; contact: local-dev)";

async function download(url, dest) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 45000,
    maxRedirects: 5,
    headers: { "User-Agent": UA },
  });
  fs.writeFileSync(dest, Buffer.from(res.data));
  console.log("wrote", path.basename(dest), Buffer.from(res.data).length, "bytes from", url.slice(0, 80));
}

async function fromMealDb(name) {
  try {
    const { data } = await axios.get(
      `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(name)}`,
      { timeout: 15000, headers: { "User-Agent": UA } }
    );
    return data?.meals?.[0]?.strMealThumb || null;
  } catch (err) {
    console.log("MealDB fail", name, err.message);
    return null;
  }
}

async function fromWikimedia(query) {
  try {
    const { data } = await axios.get("https://commons.wikimedia.org/w/api.php", {
      params: {
        action: "query",
        generator: "search",
        gsrsearch: query,
        gsrnamespace: 6,
        gsrlimit: 8,
        prop: "imageinfo",
        iiprop: "url",
        iiurlwidth: 800,
        format: "json",
        origin: "*",
      },
      timeout: 25000,
      headers: { "User-Agent": UA },
    });
    const pages = data?.query?.pages || {};
    for (const page of Object.values(pages)) {
      const info = page.imageinfo?.[0];
      const title = String(page.title || "").toLowerCase();
      if (/cat|statue|portrait|person|dog|meme/i.test(title)) continue;
      const imageUrl = info?.thumburl || info?.url;
      if (imageUrl && /\.(jpe?g|png|webp)/i.test(imageUrl)) return imageUrl;
    }
  } catch (err) {
    console.log("Wikimedia fail", query, err.message);
  }
  return null;
}

async function waitDb() {
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

(async () => {
  fs.mkdirSync(DISHES, { recursive: true });
  const shahi = path.join(DISHES, "shahi-paneer.jpg");

  const malaiDest = path.join(DISHES, "paneer-malai-special.jpg");
  fs.copyFileSync(shahi, malaiDest);
  console.log("copied shahi-paneer → paneer-malai-special");

  const chaatDest = path.join(DISHES, "fruit-chaat-deluxe.jpg");
  const chaatUrl =
    (await fromMealDb("Apple Frangipan Tart")) ||
    (await fromMealDb("Fruit")) ||
    (await fromWikimedia("fruit salad"));
  if (chaatUrl) await download(chaatUrl, chaatDest);
  else {
    fs.copyFileSync(path.join(DISHES, "fruit-tart.jpg"), chaatDest);
    console.log("fallback fruit-tart → fruit-chaat-deluxe");
  }

  const tikkaDest = path.join(DISHES, "paneer-tikka.jpg");
  const tikkaUrl =
    (await fromMealDb("Paneer Tikka")) ||
    (await fromWikimedia("paneer tikka")) ||
    (await fromMealDb("Vegetarian"));
  if (tikkaUrl) await download(tikkaUrl, tikkaDest);
  else {
    fs.copyFileSync(shahi, tikkaDest);
    console.log("fallback shahi-paneer → paneer-tikka");
  }

  const remaps = {
    "Paneer Malai Special": "uploads/dishes/paneer-malai-special.jpg",
    "Fruit Chaat Deluxe": "uploads/dishes/fruit-chaat-deluxe.jpg",
    "Paneer Tikka": "uploads/dishes/paneer-tikka.jpg",
  };

  await waitDb();
  const map = fs.existsSync(MAP_FILE)
    ? JSON.parse(fs.readFileSync(MAP_FILE, "utf8"))
    : {};
  for (const [name, image] of Object.entries(remaps)) {
    map[name] = image;
    const res = await FoodplanModel.updateMany(
      { name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}` } },
      { $set: { image, images: [image] } }
    );
    console.log(`${name}: ${res.modifiedCount} plans → ${image}`);
  }
  fs.writeFileSync(MAP_FILE, JSON.stringify(map, null, 2));
  await mongoose.disconnect();
  console.log("done");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

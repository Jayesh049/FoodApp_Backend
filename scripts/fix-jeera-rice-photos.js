/**
 * Fetch real Jeera Rice photos (whole cumin seeds visible) for gallery slots.
 */
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const DIR = path.join(__dirname, "..", "uploads", "dishes", "jeera-rice");
const UA = "FoodAppJeeraFix/1.0 (local; portfolio)";

const QUERIES = [
  "Jeera rice Indian",
  "Cumin rice basmati",
  "Jeera pulao",
  "Zeera rice",
  "Jeera rice cumin seeds",
];

async function wikiSearch(q) {
  const { data } = await axios.get("https://commons.wikimedia.org/w/api.php", {
    params: {
      action: "query",
      format: "json",
      generator: "search",
      gsrsearch: q,
      gsrnamespace: 6,
      gsrlimit: 10,
      prop: "imageinfo",
      iiprop: "url|mime|size",
      iiurlwidth: 1280,
    },
    timeout: 30000,
    headers: { "User-Agent": UA },
  });
  return Object.values(data?.query?.pages || {}).filter((p) => {
    const info = p.imageinfo?.[0];
    if (!info) return false;
    const mime = String(info.mime || "");
    return /image\/(jpeg|png|webp)/i.test(mime) && (info.size || 0) > 15000;
  });
}

async function download(url, dest) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 60000,
    maxRedirects: 5,
    headers: { "User-Agent": UA },
  });
  const buf = Buffer.from(res.data);
  if (buf.length < 15000) throw new Error("too small");
  fs.writeFileSync(dest, buf);
  return buf.length;
}

(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  const seen = new Set();
  const urls = [];

  for (const q of QUERIES) {
    try {
      const pages = await wikiSearch(q);
      for (const p of pages) {
        const info = p.imageinfo[0];
        const u = info.thumburl || info.url;
        const title = String(p.title || "").toLowerCase();
        // prefer rice / jeera / cumin related titles
        if (!/rice|jeera|cumin|zeera|pulao|biryani/i.test(title)) continue;
        if (u && !seen.has(u)) {
          seen.add(u);
          urls.push({ u, title });
        }
      }
      console.log(`query "${q}" → total candidates ${urls.length}`);
    } catch (e) {
      console.warn("search fail", q, e.message);
    }
  }

  // TheMealDB fallbacks
  for (const term of ["Rice", "Biryani", "Pulao"]) {
    try {
      const { data } = await axios.get(
        `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(term)}`,
        { timeout: 15000, headers: { "User-Agent": UA } }
      );
      for (const meal of data?.meals || []) {
        const name = String(meal.strMeal || "");
        if (!/rice|pulao|biryani/i.test(name)) continue;
        if (/chicken|lamb|mutton|fish|prawn|beef/i.test(name)) continue;
        const u = meal.strMealThumb;
        if (u && !seen.has(u)) {
          seen.add(u);
          urls.push({ u, title: name });
        }
      }
    } catch (e) {
      console.warn("mealdb fail", e.message);
    }
  }

  console.log("candidates:", urls.slice(0, 12).map((x) => x.title));

  let written = 0;
  for (const { u, title } of urls) {
    if (written >= 5) break;
    const dest = path.join(DIR, `jeera-rice-0${written + 1}.png`);
    try {
      const n = await download(u, dest);
      written += 1;
      console.log(`+ ${written} ${n}B from ${title}`);
    } catch (e) {
      console.warn("dl fail", title, e.message);
    }
  }

  if (written < 5) {
    console.error(`Only wrote ${written}/5 — need more sources`);
    process.exit(1);
  }
  console.log("Done.");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

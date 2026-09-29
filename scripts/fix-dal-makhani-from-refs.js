/**
 * Rebuild Dal Makhani gallery from Wikimedia references
 * matching classic cream-swirl / makhani look (not dal tadka).
 */
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const OUT = path.join(__dirname, "..", "uploads", "dishes", "dal-makhani");
const REF = path.join(__dirname, "..", "uploads", "_refs", "dal-makhani");
const UA = "FoodAppDalMakhani/1.0";

async function wikiSearch(q) {
  const { data } = await axios.get("https://commons.wikimedia.org/w/api.php", {
    params: {
      action: "query",
      format: "json",
      generator: "search",
      gsrsearch: q,
      gsrnamespace: 6,
      gsrlimit: 20,
      prop: "imageinfo",
      iiprop: "url|mime|size",
      iiurlwidth: 1280,
    },
    timeout: 30000,
    headers: { "User-Agent": UA },
  });
  return Object.values(data?.query?.pages || {});
}

async function download(url) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 60000,
    headers: { "User-Agent": UA },
    maxRedirects: 5,
  });
  return Buffer.from(res.data);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(REF, { recursive: true });

  const pages = await wikiSearch("Dal Makhani");
  const picked = [];
  const seen = new Set();

  for (const p of pages) {
    const title = String(p.title || "");
    // prefer pure dal makhani filenames; skip thalis / mixed platters
    if (!/dal\s*makhan/i.test(title)) continue;
    if (/parantha|bhindi|paneer|chicken|thali|platter|with naan and/i.test(title))
      continue;
    const info = p.imageinfo?.[0];
    if (!info) continue;
    const u = info.thumburl || info.url;
    if (!u || seen.has(u)) continue;
    seen.add(u);
    picked.push({ title, u, size: info.size || 0 });
  }

  // Sort: exact "Dal Makhani.jpg" style first, larger files preferred
  picked.sort((a, b) => {
    const score = (t) =>
      (/^file:dal makhani\.?jpe?g$/i.test(t) ? 100 : 0) +
      (/dal makhani 1/i.test(t) ? 50 : 0) +
      (/dal makhani \(1\)/i.test(t) ? 40 : 0);
    return score(b.title) - score(a.title) || b.size - a.size;
  });

  console.log(
    "candidates:",
    picked.slice(0, 10).map((p) => p.title)
  );

  let n = 0;
  for (const item of picked) {
    if (n >= 5) break;
    try {
      const buf = await download(item.u);
      if (buf.length < 20000) continue;
      n += 1;
      fs.writeFileSync(path.join(OUT, `dal-makhani-0${n}.png`), buf);
      fs.writeFileSync(path.join(REF, `ref-0${n}.jpg`), buf);
      console.log(`+ ${n} ${buf.length}B ${item.title}`);
    } catch (e) {
      console.warn("fail", item.title, e.message);
    }
  }

  if (n < 5) {
    console.error(`Only ${n}/5 — incomplete`);
    process.exit(1);
  }
  console.log("Gallery rebuilt from Wikimedia Dal Makhani references.");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

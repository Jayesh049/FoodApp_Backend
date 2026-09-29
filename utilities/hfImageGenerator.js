const fs = require("fs");
const path = require("path");
const axios = require("axios");

function getHfToken() {
  return process.env.HF_TOKEN || "";
}

function getPrimaryModel() {
  return (
    process.env.HF_IMAGE_MODEL ||
    "stabilityai/stable-diffusion-3-medium-diffusers"
  );
}

function getFallbackModel() {
  return (
    process.env.HF_IMAGE_FALLBACK_MODEL ||
    "stabilityai/stable-diffusion-3-medium-diffusers"
  );
}

function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function buildFoodPrompt(dishName, categoryLabel) {
  const cuisine = categoryLabel ? `${categoryLabel} cuisine, ` : "";
  return (
    `Professional food photography of ${dishName}, ${cuisine}` +
    "appetizing plated dish, natural lighting, shallow depth of field, " +
    "restaurant quality, high detail, centered composition, no text, no watermark"
  );
}

/**
 * FOODAPP brand prompt for a specific gallery shot (01–05).
 * Unique per (dish, shot) via explicit composition + dish name.
 */
function buildShotPrompt(dish, shot) {
  const { BRAND_POSITIVE } = require("./dishCatalog200");
  const name = typeof dish === "string" ? dish : dish.name;
  const cuisine =
    (typeof dish === "object" && dish.cuisineLabel) ||
    (typeof dish === "object" && dish.category) ||
    "";
  const composition =
    (typeof shot === "object" && shot.composition) ||
    String(shot || "hero food photography");
  const shotLabel =
    (typeof shot === "object" && (shot.label || shot.key || shot.id)) || "shot";

  return (
    `${BRAND_POSITIVE}. ` +
    `Single standalone photograph of vegetarian ${name}` +
    (cuisine ? ` (${cuisine})` : "") +
    `. Shot style: ${shotLabel}. Composition: ${composition}. ` +
    (typeof dish === "object" && dish.visualHint
      ? `Accurate dish look: ${dish.visualHint}. `
      : "") +
    `Correct signature color and ingredients for ${name}. ` +
    `Only one dish subject, no other main dishes, no collage layout.`
  );
}

function brandNegativePrompt() {
  const { BRAND_NEGATIVE } = require("./dishCatalog200");
  return BRAND_NEGATIVE;
}

/**
 * Stable numeric seed from dish slug + shot id (for providers that honor seed).
 */
function shotSeed(slug, shotId) {
  const s = `${slug}-${shotId}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 2147483647;
}

/**
 * Generate and save one gallery shot under uploads/dishes/{slug}/{slug}-0N.png
 */
async function generateAndSaveGalleryShot(dish, shot, uploadsRoot, options = {}) {
  const slug = dish.slug || slugify(dish.name);
  const shotId = shot.id || String(shot).padStart(2, "0");
  const outDir = path.join(uploadsRoot, "dishes", slug);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const filename = `${slug}-${shotId}.png`;
  const absPath = path.join(outDir, filename);
  const prompt = buildShotPrompt(dish, shot);
  const seedBase = shotSeed(slug, shotId);
  const seed =
    options.seedSalt != null
      ? (seedBase + Number(options.seedSalt)) % 2147483647
      : seedBase;

  const buffer = await generateImageBuffer(prompt, {
    width: options.width || 768,
    height: options.height || 768,
    steps: options.steps || 28,
    guidanceScale: options.guidanceScale ?? 7,
    negativePrompt: brandNegativePrompt(),
    seed,
  });

  fs.writeFileSync(absPath, buffer);
  const relative = path
    .relative(path.join(__dirname, ".."), absPath)
    .replace(/\\/g, "/");
  return { relative, absPath, prompt, seed };
}

async function callHfTextToImage(model, prompt, options = {}) {
  const token = getHfToken();
  if (!token) {
    throw new Error("HF_TOKEN is not configured");
  }

  const width = options.width || 512;
  const height = options.height || 512;
  const steps = options.steps || 4;
  const negativePrompt =
    options.negativePrompt ||
    "blurry, low quality, text, watermark, logo, cartoon, deformed";

  const endpoints = [
    `https://router.huggingface.co/hf-inference/models/${model}`,
    `https://router.huggingface.co/models/${model}`,
  ];

  let lastError;
  for (const url of endpoints) {
    try {
      const res = await axios.post(
        url,
        {
          inputs: prompt,
          parameters: {
            num_inference_steps: steps,
            guidance_scale: options.guidanceScale ?? 0,
            width,
            height,
            negative_prompt: negativePrompt,
            ...(options.seed != null ? { seed: options.seed } : {}),
          },
          options: { wait_for_model: true },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "image/png",
            "Content-Type": "application/json",
          },
          responseType: "arraybuffer",
          timeout: 5 * 60 * 1000,
          validateStatus: () => true,
        }
      );

      const contentType = String(res.headers["content-type"] || "");
      if (res.status >= 200 && res.status < 300 && contentType.includes("image")) {
        return Buffer.from(res.data);
      }

      // Some providers return application/json with base64
      if (res.status >= 200 && res.status < 300 && contentType.includes("json")) {
        try {
          const json = JSON.parse(Buffer.from(res.data).toString("utf8"));
          const b64 = json.image || json.images?.[0] || json.blob;
          if (typeof b64 === "string") {
            const raw = b64.replace(/^data:image\/\w+;base64,/, "");
            return Buffer.from(raw, "base64");
          }
        } catch {
          /* fall through */
        }
      }

      let message = `HF HTTP ${res.status} @ ${url}`;
      try {
        const json = JSON.parse(Buffer.from(res.data).toString("utf8"));
        message = json.error || json.message || JSON.stringify(json).slice(0, 300);
      } catch {
        message =
          Buffer.from(res.data).toString("utf8").slice(0, 300) || message;
      }
      lastError = new Error(message);

      if (res.status === 402 || /credits|billing|quota/i.test(message)) {
        throw new Error(
          `HF credits exhausted: ${message}. Top up Inference Providers credits or set SD_BASE_URL for local A1111.`
        );
      }

      if (res.status === 503 || /loading/i.test(message)) {
        await new Promise((r) => setTimeout(r, 8000));
        continue;
      }
      // Don't bother with dead DNS hosts after first failure of that host
      if (/ENOTFOUND/i.test(message)) continue;
    } catch (err) {
      lastError = err;
      if (err.code === "ENOTFOUND") continue;
    }
  }

  throw lastError || new Error("HF image generation failed");
}

/**
 * Free fallback when HF Inference credits are exhausted.
 */
async function generateViaPollinations(prompt, options = {}) {
  const width = options.width || 1024;
  const height = options.height || 1024;
  const seed = options.seed != null ? options.seed : Math.floor(Math.random() * 1e9);
  const encoded = encodeURIComponent(String(prompt).slice(0, 450));
  const url =
    `https://image.pollinations.ai/prompt/${encoded}` +
    `?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true`;

  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 3 * 60 * 1000,
    validateStatus: () => true,
    headers: { Accept: "image/*" },
  });
  const contentType = String(res.headers["content-type"] || "");
  if (res.status >= 200 && res.status < 300 && contentType.includes("image")) {
    return Buffer.from(res.data);
  }
  let message = `Pollinations HTTP ${res.status}`;
  try {
    message = Buffer.from(res.data).toString("utf8").slice(0, 300) || message;
  } catch {
    /* ignore */
  }
  throw new Error(message);
}

/**
 * Generate an image buffer from a prompt.
 * Tries HF primary → HF fallback → Pollinations (when HF credits depleted).
 */
async function generateImageBuffer(prompt, options = {}) {
  const primary = options.model || getPrimaryModel();
  const fallback = getFallbackModel();
  try {
    return await callHfTextToImage(primary, prompt, options);
  } catch (err) {
    const msg = String(err.message || "");
    const creditsGone = /credits exhausted|402|monthly included/i.test(msg);
    if (!creditsGone && fallback && fallback !== primary) {
      try {
        console.warn(`[HF] primary model failed (${err.message}); trying fallback ${fallback}`);
        return await callHfTextToImage(fallback, prompt, {
          ...options,
          steps: options.steps || 28,
          guidanceScale: options.guidanceScale ?? 7,
        });
      } catch (err2) {
        err = err2;
      }
    }
    console.warn(`[HF] unavailable — using Pollinations fallback (${err.message})`);
    return generateViaPollinations(prompt, options);
  }
}

/**
 * Generate and save a dish image. Returns relative path like uploads/dishes/hf/biryani.png
 */
async function generateAndSaveDishImage(dishName, categoryLabel, outDir) {
  const prompt = buildFoodPrompt(dishName, categoryLabel);
  const buffer = await generateImageBuffer(prompt, { width: 512, height: 512, steps: 4 });

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const filename = `${slugify(dishName) || "dish"}.png`;
  const absPath = path.join(outDir, filename);
  fs.writeFileSync(absPath, buffer);

  const relative = path
    .relative(path.join(__dirname, ".."), absPath)
    .replace(/\\/g, "/");
  return { relative, absPath, prompt };
}

module.exports = {
  getHfToken,
  getPrimaryModel,
  buildFoodPrompt,
  buildShotPrompt,
  brandNegativePrompt,
  shotSeed,
  generateImageBuffer,
  generateAndSaveDishImage,
  generateAndSaveGalleryShot,
  slugify,
};

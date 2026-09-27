const fs = require("fs");
const path = require("path");
const axios = require("axios");

function getHfToken() {
  return process.env.HF_TOKEN || require("../secrets").HF_TOKEN || "";
}

function getPrimaryModel() {
  return (
    process.env.HF_IMAGE_MODEL ||
    require("../secrets").HF_IMAGE_MODEL ||
    "stabilityai/sdxl-turbo"
  );
}

function getFallbackModel() {
  return (
    process.env.HF_IMAGE_FALLBACK_MODEL ||
    require("../secrets").HF_IMAGE_FALLBACK_MODEL ||
    "stabilityai/stable-diffusion-xl-base-1.0"
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
 * Generate an image buffer from a prompt. Tries primary then fallback model.
 */
async function generateImageBuffer(prompt, options = {}) {
  const primary = options.model || getPrimaryModel();
  const fallback = getFallbackModel();
  try {
    return await callHfTextToImage(primary, prompt, options);
  } catch (err) {
    if (fallback && fallback !== primary) {
      console.warn(`[HF] primary model failed (${err.message}); trying fallback ${fallback}`);
      return callHfTextToImage(fallback, prompt, {
        ...options,
        steps: options.steps || 4,
        guidanceScale: options.guidanceScale ?? 1,
      });
    }
    throw err;
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
  generateImageBuffer,
  generateAndSaveDishImage,
  slugify,
};

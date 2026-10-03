const fs = require("fs");
const path = require("path");
const axios = require("axios");
const logger = require("../utilities/logger");
const {
  getHfToken,
  generateImageBuffer,
} = require("../utilities/hfImageGenerator");

const SD_BASE_URL = process.env.SD_BASE_URL || "http://127.0.0.1:7860";

function safeNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function saveGeneratedBuffer(buffer) {
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const filename = `${Date.now()}_gen.png`;
  const outPath = path.join(uploadsDir, filename);
  fs.writeFileSync(outPath, buffer);
  return {
    path: `uploads/${filename}`,
    url: `/uploads/${filename}`,
  };
}

async function generateViaSd(body) {
  const payload = {
    prompt: body.prompt,
    negative_prompt: body.negativePrompt || "",
    width: safeNumber(body.width, 512),
    height: safeNumber(body.height, 512),
    steps: safeNumber(body.steps, 20),
    seed:
      body.seed === undefined || body.seed === null || body.seed === ""
        ? -1
        : safeNumber(body.seed, -1),
    cfg_scale: safeNumber(body.cfgScale, 7),
  };
  if (body.samplerName) payload.sampler_name = body.samplerName;

  const sdRes = await axios.post(`${SD_BASE_URL}/sdapi/v1/txt2img`, payload, {
    timeout: 5 * 60 * 1000,
  });
  const base64 = sdRes?.data?.images?.[0];
  if (!base64) {
    const err = new Error("Stable Diffusion did not return an image");
    err.raw = sdRes?.data;
    throw err;
  }
  return Buffer.from(base64, "base64");
}

async function generateViaHfOrSd(body) {
  const prompt = body.prompt;
  if (getHfToken()) {
    try {
      return await generateImageBuffer(prompt, {
        width: safeNumber(body.width, 512),
        height: safeNumber(body.height, 512),
        steps: safeNumber(body.steps, 4),
        negativePrompt: body.negativePrompt,
        guidanceScale: body.cfgScale != null ? safeNumber(body.cfgScale, 0) : 0,
      });
    } catch (hfErr) {
      logger.warn({ err: hfErr }, "HF image failed, trying Stable Diffusion");
    }
  }
  return generateViaSd(body);
}

async function generateImage(req, res, next) {
  try {
    const body = req.body || {};
    if (!body.prompt || typeof body.prompt !== "string") {
      return res.status(400).json({ message: "prompt is required" });
    }

    const buffer = await generateViaHfOrSd(body);
    const saved = saveGeneratedBuffer(buffer);

    return res.status(201).json({
      message: "Image generated",
      provider: getHfToken() ? "huggingface" : "stable-diffusion",
      ...saved,
    });
  } catch (err) {
    return next(err);
  }
}

async function bulkGenerateImages(req, res, next) {
  try {
    const { prompts, ...rest } = req.body || {};

    if (!Array.isArray(prompts) || prompts.length === 0) {
      return res.status(400).json({ message: "prompts[] is required" });
    }

    const results = [];
    for (const p of prompts) {
      try {
        const buffer = await generateViaHfOrSd({ ...rest, prompt: p });
        const saved = saveGeneratedBuffer(buffer);
        results.push({ prompt: p, ...saved });
      } catch (inner) {
        results.push({ prompt: p, error: inner.message });
      }
    }

    return res.status(201).json({
      message: "Bulk generation complete",
      count: results.filter((r) => r.url).length,
      results,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { generateImage, bulkGenerateImages };

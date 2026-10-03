const FoodplanModel = require("../model/planModel");
const reviewModel = require("../model/reviewModel");
const mongoose = require("mongoose");
const axios = require("axios");
const logger = require("../utilities/logger");

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text";
const OLLAMA_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || "llama3.1";
const {
  gatePlanIds,
  stripUnknownIds,
  ownBookingSummary,
  MAX_SUGGEST_QUERY,
} = require("../utilities/suggestGuard");
const FoodBookingModel = require("../model/bookingModel");

function ragCollection() {
  if (!mongoose.connection.db) {
    throw new Error("Database not connected");
  }
  return mongoose.connection.db.collection("rag_documents");
}

async function ollamaEmbed(text) {
  const res = await axios.post(
    `${OLLAMA_BASE_URL}/api/embeddings`,
    { model: OLLAMA_EMBED_MODEL, prompt: text },
    { timeout: 60_000 }
  );
  return res.data.embedding;
}

async function ollamaChat(messages) {
  const res = await axios.post(
    `${OLLAMA_BASE_URL}/api/chat`,
    { model: OLLAMA_CHAT_MODEL, messages, stream: false },
    { timeout: 120_000 }
  );
  return res.data?.message?.content;
}

async function vectorSearch(queryEmbedding, limit = 6) {
  const indexName = process.env.VECTOR_INDEX_NAME || "rag_embedding_index";
  const coll = ragCollection();

  const pipeline = [
    {
      $vectorSearch: {
        index: indexName,
        path: "embedding",
        queryVector: queryEmbedding,
        numCandidates: 100,
        limit,
      },
    },
    {
      $project: {
        _id: 0,
        sourceType: 1,
        sourceId: 1,
        title: 1,
        text: 1,
        image: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ];

  return coll.aggregate(pipeline).toArray();
}

function modelNameMatches(available, expected) {
  const base = expected.split(":")[0];
  return available.some(
    (name) => name === expected || name.startsWith(`${base}:`) || name === base
  );
}

async function checkOllamaHealth() {
  try {
    const res = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 5000 });
    const models = (res.data?.models || []).map((m) => m.name);
    return {
      reachable: true,
      embedModelAvailable: modelNameMatches(models, OLLAMA_EMBED_MODEL),
      chatModelAvailable: modelNameMatches(models, OLLAMA_CHAT_MODEL),
      models,
    };
  } catch (err) {
    return {
      reachable: false,
      embedModelAvailable: false,
      chatModelAvailable: false,
      error: err.message,
    };
  }
}

async function checkVectorIndexReady() {
  try {
    const coll = ragCollection();
    const docCount = await coll.countDocuments({ embedding: { $exists: true } });
    if (docCount === 0) {
      return { ready: false, docCount: 0, reason: "No embeddings indexed yet. Run POST /api/v1/suggest/reindex as admin." };
    }
    const dummyVector = new Array(EMBED_DIMENSIONS).fill(0);
    await vectorSearch(dummyVector, 1);
    return { ready: true, docCount };
  } catch (err) {
    return { ready: false, docCount: 0, reason: err.message };
  }
}

async function getRagStatus() {
  const ollama = await checkOllamaHealth();
  let vector = { ready: false, docCount: 0, reason: "Database not connected" };
  try {
    vector = await checkVectorIndexReady();
  } catch (err) {
    vector = { ready: false, docCount: 0, reason: err.message };
  }

  return {
    ollama,
    vectorIndexReady: vector.ready,
    docCount: vector.docCount,
    vectorIndexReason: vector.reason,
    embedModel: OLLAMA_EMBED_MODEL,
    chatModel: OLLAMA_CHAT_MODEL,
    indexName: process.env.VECTOR_INDEX_NAME || "rag_embedding_index",
    ragReady:
      ollama.reachable &&
      ollama.embedModelAvailable &&
      ollama.chatModelAvailable &&
      vector.ready,
  };
}

function planToRagText(plan) {
  const category = plan.category ? `Category: ${plan.category}` : "";
  return `Plan: ${plan.name}\n${category}\nPrice: ${plan.price}\nDuration: ${plan.duration}\nDiscount: ${plan.discount}\nImage: ${plan.image}\nImages: ${(plan.images || [])
    .slice(0, 5)
    .join(", ")}`;
}

async function upsertPlanEmbedding(plan) {
  try {
    const coll = ragCollection();
    const title = plan.name;
    const text = planToRagText(plan);
    const embedding = await ollamaEmbed(`${title}\n${text}`);

    await coll.updateOne(
      { sourceType: "plan", sourceId: plan._id.toString() },
      {
        $set: {
          sourceType: "plan",
          sourceId: plan._id.toString(),
          title,
          text,
          image: plan.image || (plan.images && plan.images[0]) || "",
          embedding,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
    return { ok: true };
  } catch (err) {
    logger.warn({ err }, "upsert plan embedding failed");
    return { ok: false };
  }
}

async function getSuggestHealth(req, res) {
  const status = await getRagStatus();
  return res.status(200).json(status);
}

async function logRagStartupStatus() {
  try {
    const status = await getRagStatus();
    if (!status.ragReady) {
      logger.warn({ status }, "RAG not fully ready");
    } else {
      logger.info({ docCount: status.docCount }, "RAG ready");
    }
  } catch (err) {
    logger.warn({ err }, "RAG startup check failed");
  }
}

const EMBED_DIMENSIONS = 768;

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function plansByName(query) {
  const safe = escapeRegex(String(query || "").slice(0, MAX_SUGGEST_QUERY));
  if (!safe) return [];
  const plans = await FoodplanModel.find({ name: new RegExp(safe, "i") }).limit(6);
  const { filterVegetarianPlans } = require("../utilities/vegFilter");
  return filterVegetarianPlans(plans);
}

async function querySuggestions(req, res, next) {
  try {
    const { query } = req.body || {};
    if (!query || typeof query !== "string") {
      return res.status(400).json({ message: "query is required" });
    }
    if (query.length > MAX_SUGGEST_QUERY) {
      return res.status(400).json({ message: "query is too long" });
    }

    let embedding;
    let degraded = false;
    try {
      embedding = await ollamaEmbed(query);
    } catch (err) {
      degraded = true;
      const plans = await plansByName(query);
      return res.status(200).json({
        query,
        answer: null,
        degraded: true,
        plans,
        citations: [],
        message: "Showing name matches because AI is unavailable.",
      });
    }

    let docs = [];
    try {
      docs = await vectorSearch(embedding, 6);
    } catch (e) {
      const plans = await plansByName(query);
      return res.status(200).json({
        query,
        answer: null,
        degraded: true,
        plans,
        citations: [],
        message: "Showing name matches because search index is unavailable.",
      });
    }

    const { isVegetarianPlan } = require("../utilities/vegFilter");
    const vegDocs = docs.filter((d) => {
      if (d.sourceType !== "plan") return true;
      return isVegetarianPlan(d.title || "");
    });

    const context = vegDocs
      .map((d, i) => `#${i + 1} (${d.sourceType}:${d.sourceId}) ${d.title}\n${d.text}`)
      .join("\n\n");

    const allowedIds = vegDocs.map((d) => String(d.sourceId));
    let answer;
    try {
      answer = stripUnknownIds(
        await ollamaChat([
          {
            role: "system",
            content:
              "You are a helpful vegetarian food-plan assistant. Recommend only vegetarian dishes. Use only the provided context. If context is insufficient, ask a clarifying question and suggest 2-3 next steps. Do not invent dish ids.",
          },
          {
            role: "user",
            content: `User query: ${query}\n\nContext:\n${context}`,
          },
        ]),
        allowedIds
      );
    } catch (err) {
      degraded = true;
      answer = null;
    }

    const citations = vegDocs
      .filter((d) => gatePlanIds(allowedIds, [d.sourceId]).length === 1)
      .map((d) => {
        const imageFromText = String(d.text || "").match(/Image:\s*(\S+)/);
        return {
          sourceType: d.sourceType,
          sourceId: d.sourceId,
          planId: d.sourceType === "plan" ? d.sourceId : undefined,
          title: d.title,
          score: d.score,
          image: d.image || (imageFromText ? imageFromText[1] : undefined),
        };
      });

    return res.status(200).json({
      query,
      answer,
      degraded,
      citations,
      plans: citations.filter((c) => c.planId).map((c) => c.planId),
    });
  } catch (err) {
    return next(err);
  }
}

async function semanticSearchPlans(req, res) {
  const q = (req.query.q || "").trim();

  try {
    if (q.length < 2) {
      return res.status(400).json({
        message: "Query must be at least 2 characters",
        query: q,
        plans: [],
      });
    }

    let embedding;
    try {
      embedding = await ollamaEmbed(q);
    } catch (err) {
      const plans = await plansByName(q);
      return res.status(200).json({
        query: q,
        plans,
        degraded: true,
        message: "Semantic search unavailable. Showing name matches.",
      });
    }

    let docs = [];
    try {
      docs = await vectorSearch(embedding, 10);
    } catch (err) {
      const plans = await plansByName(q);
      return res.status(200).json({
        query: q,
        plans,
        degraded: true,
        message: "Semantic search unavailable. Showing name matches.",
      });
    }

    const planDocs = docs.filter((d) => d.sourceType === "plan");
    if (planDocs.length === 0) {
      return res.status(200).json({ query: q, plans: [], scores: [] });
    }

    const planIds = planDocs.map((d) => d.sourceId);
    const plans = await FoodplanModel.find({ _id: { $in: planIds } });
    const { filterVegetarianPlans } = require("../utilities/vegFilter");
    const vegPlans = filterVegetarianPlans(plans);
    const planMap = new Map(vegPlans.map((p) => [p._id.toString(), p]));

    const results = planDocs
      .map((d) => ({
        plan: planMap.get(d.sourceId),
        score: d.score,
      }))
      .filter((r) => r.plan);

    return res.status(200).json({
      query: q,
      plans: results.map((r) => r.plan),
      scores: results.map((r) => ({
        planId: r.plan._id,
        score: r.score,
      })),
    });
  } catch (err) {
    logger.warn({ err }, "semantic search failed");
    return res.status(200).json({
      query: q,
      plans: [],
      message: "Semantic search unavailable",
    });
  }
}

async function reindexSuggestions(req, res, next) {
  try {
    const coll = ragCollection();

    const plans = await FoodplanModel.find().select("name price duration discount image images category icon");
    const reviews = await reviewModel
      .find()
      .select("description rating user plan createdAt")
      .limit(200);

    let upserts = 0;

    for (const p of plans) {
      const result = await upsertPlanEmbedding(p);
      if (result.ok) upserts += 1;
    }

    for (const r of reviews) {
      const title = `Review ${r._id.toString()}`;
      const text = `Review: ${r.description}\nRating: ${r.rating}\nPlan: ${r.plan}\nUser: ${r.user}`;
      const embedding = await ollamaEmbed(`${title}\n${text}`);

      await coll.updateOne(
        { sourceType: "review", sourceId: r._id.toString() },
        {
          $set: {
            sourceType: "review",
            sourceId: r._id.toString(),
            title,
            text,
            embedding,
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
      upserts += 1;
    }

    return res.status(200).json({
      message: "Reindex completed",
      upserts,
      plansIndexed: plans.length,
      reviewsIndexed: reviews.length,
    });
  } catch (err) {
    return next(err);
  }
}

async function phraseOwnOrders(req, res, next) {
  try {
    const rows = await FoodBookingModel.find({ user: req.userId })
      .sort({ bookedAt: -1 })
      .limit(8);
    const bookings = rows.map(ownBookingSummary);
    try {
      const answer = await ollamaChat([
        {
          role: "system",
          content:
            "Phrase only the orders in the JSON. Do not invent orders, prices, or other users.",
        },
        { role: "user", content: JSON.stringify(bookings) },
      ]);
      return res.status(200).json({ bookings, answer, degraded: false });
    } catch (err) {
      return res.status(200).json({ bookings, answer: null, degraded: true });
    }
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  querySuggestions,
  reindexSuggestions,
  getSuggestHealth,
  semanticSearchPlans,
  phraseOwnOrders,
  logRagStartupStatus,
  upsertPlanEmbedding,
};

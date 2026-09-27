# RAG Setup Guide (FoodApp Backend)

This guide covers manual setup for AI suggestions and semantic plan search.

## Prerequisites

- Backend running on port **3000**
- MongoDB Atlas cluster (vector search requires Atlas M10+ or free tier with vector search enabled)
- [Ollama](https://ollama.com/) installed locally

---

## 1. Install Ollama models

```bash
ollama pull nomic-embed-text
ollama pull llama3.1
ollama serve
```

Verify: open `http://127.0.0.1:11434/api/tags` — both models should appear.

Optional env overrides in `.env` or `secrets.js`:

```
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_EMBED_MODEL=nomic-embed-text
OLLAMA_CHAT_MODEL=llama3.1
```

---

## 2. Create MongoDB Vector Index (Atlas UI)

1. Open **MongoDB Atlas** → your cluster → **Search** (or Atlas Search / Vector Search)
2. Create a **Vector Search** index on database used by `DB_LINK`
3. Settings:

| Field | Value |
|-------|-------|
| Collection | `rag_documents` |
| Index name | `rag_embedding_index` |
| Field path | `embedding` |
| Dimensions | **768** (nomic-embed-text) |
| Similarity | **cosine** |

Example index definition (JSON):

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    }
  ]
}
```

If your index name differs, set:

```
VECTOR_INDEX_NAME=your_index_name
```

---

## 3. Set admin user (MongoDB Compass / Atlas)

Only admins can reindex and manage plans/sections/media:

```js
db.foodusermodels.updateOne(
  { email: "your-admin@gmail.com" },
  { $set: { role: "admin" } }
)
```

Collection name may vary (lowercase plural of model). Check your `FooduserModel` collection in Compass.

---

## 4. First-time indexing

1. Login as admin in the frontend
2. Call reindex (Postman or curl with JWT):

```bash
curl -X POST http://localhost:3000/api/v1/suggest/reindex \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

This embeds all plans + reviews into `rag_documents`.

---

## 5. Verify health

```bash
curl http://localhost:3000/api/v1/suggest/health
```

Or from the Backend folder:

```bash
npm run check-rag
```

Expected when ready:

```json
{
  "ollama": { "reachable": true, "embedModelAvailable": true, "chatModelAvailable": true },
  "vectorIndexReady": true,
  "docCount": 10,
  "ragReady": true
}
```

---

## 6. API endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/v1/suggest/health` | Public | Diagnostics |
| POST | `/api/v1/suggest/query` | Public | RAG chat suggestions |
| POST | `/api/v1/suggest/reindex` | Admin | Rebuild embeddings |
| GET | `/api/v1/plan/semantic-search?q=...` | Public | Plan-only vector search |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `501` vector search | Create Atlas vector index (step 2) |
| `503` Ollama | Run `ollama serve` and pull models |
| `403` on reindex | Set `role: "admin"` on your user |
| Empty semantic results | Run reindex after index is created |
| `docCount: 0` | Admin reindex required |

Server logs `[RAG] Not fully ready` on startup if something is missing — non-blocking.

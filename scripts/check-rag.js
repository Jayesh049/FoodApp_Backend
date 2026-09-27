/**
 * Quick RAG health check — run: node scripts/check-rag.js
 * Requires backend on PORT (default 3000).
 */
const http = require("http");

const port = process.env.PORT || 3000;
const url = `http://127.0.0.1:${port}/api/v1/suggest/health`;

http
  .get(url, (res) => {
    let data = "";
    res.on("data", (chunk) => {
      data += chunk;
    });
    res.on("end", () => {
      try {
        const json = JSON.parse(data);
        console.log("\n=== RAG Health ===\n");
        console.log("Ollama reachable:", json.ollama?.reachable);
        console.log("Embed model:", json.embedModel, "→", json.ollama?.embedModelAvailable ? "OK" : "MISSING");
        console.log("Chat model:", json.chatModel, "→", json.ollama?.chatModelAvailable ? "OK" : "MISSING");
        console.log("Vector index:", json.vectorIndexReady ? "OK" : "NOT READY");
        if (json.vectorIndexReason) console.log("  Reason:", json.vectorIndexReason);
        console.log("Documents:", json.docCount || 0);
        console.log("RAG overall:", json.ragReady ? "READY" : "NOT READY");
        console.log("\nSee Backend/docs/RAG_SETUP.md if not ready.\n");
        process.exit(json.ragReady ? 0 : 1);
      } catch (e) {
        console.error("Invalid JSON:", data);
        process.exit(1);
      }
    });
  })
  .on("error", (err) => {
    console.error("Could not reach backend at", url);
    console.error(err.message);
    process.exit(1);
  });

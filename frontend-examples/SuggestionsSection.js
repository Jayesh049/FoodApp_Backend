import React, { useState } from "react";
import axios from "axios";

// Drop-in component example:
// <SuggestionsSection />
export default function SuggestionsSection() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState([]);

  const runSuggest = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setAnswer("");
    setCitations([]);
    try {
      const res = await axios.post("http://localhost:3000/api/v1/suggest/query", {
        query: query.trim(),
      });
      setAnswer(res.data.answer || "");
      setCitations(res.data.citations || []);
    } catch (e) {
      console.error("suggest error:", e);
      setAnswer(e.response?.data?.message || "Suggestion failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
      <h2>Suggestions (RAG)</h2>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Type what you want (e.g. &quot;high protein under ₹300&quot;).
      </p>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask for recommendations..."
          style={{ flex: 1, padding: 10 }}
          onKeyDown={(e) => {
            if (e.key === "Enter") runSuggest();
          }}
        />
        <button onClick={runSuggest} disabled={loading || !query.trim()}>
          {loading ? "Thinking..." : "Suggest"}
        </button>
      </div>

      {answer ? (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd" }}>
          <h3 style={{ marginTop: 0 }}>Answer</h3>
          <div style={{ whiteSpace: "pre-wrap" }}>{answer}</div>
        </div>
      ) : null}

      {citations.length ? (
        <div style={{ marginTop: 16 }}>
          <h3>Citations</h3>
          <ul>
            {citations.map((c) => (
              <li key={`${c.sourceType}:${c.sourceId}`}>
                {c.title} ({c.sourceType}) — score:{" "}
                {typeof c.score === "number" ? c.score.toFixed(3) : c.score}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}


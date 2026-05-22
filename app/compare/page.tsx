"use client";

import { useEffect, useState } from "react";

export default function ComparePage() {
  const [prompt, setPrompt] = useState("");

  const [openai, setOpenai] = useState("");
  const [gemini, setGemini] = useState("");
  const [summary, setSummary] = useState("");
  const [best, setBest] = useState("");

  const [loading, setLoading] = useState(false);

  const [history, setHistory] = useState<any[]>([]);

  async function handleCompare() {
    try {
      setLoading(true);

      const res = await fetch("/api/compare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
        }),
      });

      if (!res.ok) {
        throw new Error("API request failed");
      }

      const data = await res.json();

      setOpenai(data.openai || "");
      setGemini(data.gemini || "");
      setSummary(data.summary || "");
      setBest(data.best_answer || "");

      // save result
      await fetch("/api/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          openai: data.openai,
          gemini: data.gemini,
          summary: data.summary,
          best: data.best_answer,
        }),
      });

      // reload history
      const historyRes = await fetch("/api/history");
      const historyData = await historyRes.json();

      setHistory(historyData);
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // load history
  useEffect(() => {
    fetch("/api/history")
      .then((res) => res.json())
      .then(setHistory)
      .catch(console.error);
  }, []);

  return (
    <div style={{ padding: 30 }}>
      <h1>Multi-AI Compare</h1>

      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Ask something..."
        style={{
          width: 400,
          padding: 8,
        }}
      />

      <button
        onClick={handleCompare}
        style={{
          marginLeft: 10,
          padding: "8px 12px",
        }}
      >
        Compare
      </button>

      {loading && <p>Thinking...</p>}

      <hr />

      <h2>OpenAI</h2>
      <p>{openai}</p>

      <h2>Gemini</h2>
      <p>{gemini}</p>

      <hr />

      <h2>Comparison Summary</h2>
      <p>{summary}</p>

      <h2>Best Answer</h2>
      <p>{best}</p>

      <hr />

      <h3>History</h3>

      <ul>
        {history.map((item: any) => (
          <li key={item.id}>
            <a href={`/result/${item.id}`}>
              {item.prompt}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
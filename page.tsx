"use client";

import { useEffect, useState } from "react";

export default function ComparePage() {
  const [prompt, setPrompt] = useState("");
  const [judge, setJudge] = useState("openai");

  const [openai, setOpenai] = useState("");
  const [gemini, setGemini] = useState("");
  const [summary, setSummary] = useState("");
  const [best, setBest] = useState("");
  
  const [loading, setLoading] = useState(false);

  const [history, setHistory] = useState([]);

  async function handleCompare() {
    setLoading(true);

    // ✅ STEP 1 — Get AI answers
    const compareRes = await fetch("/api/compare", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    const compareData = await compareRes.json();

    setOpenai(compareData.openai);
    setGemini(compareData.gemini);

    // ✅ STEP 2 — Judge answers
    const judgeRes = await fetch("/api/judge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        openaiText: compareData.openai,
        geminiText: compareData.gemini,
        judge,
      }),
    });
    
    const judgeData = await judgeRes.json();

    setSummary(judgeData.summary);
    setBest(judgeData.best_answer);

    setLoading(false);
    const saveRes = await fetch("/api/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        openai: compareData.openai,
        gemini: compareData.gemini,
        summary: judgeData.summary,
        best: judgeData.best_answer,
      }),
    });

    const saveData = await saveRes.json();

    console.log("Share link:", saveData.url);
  }
  // ✅ Load history on mount
    useEffect(() => {
      fetch("/api/history")
        .then(res => res.json())
        .then(setHistory);
    }, []);
  return (
    <div style={{ padding: 30 }}>
      <h1>Multi-AI Compare</h1>

      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Ask something..."
        style={{ width: 400, padding: 8 }}
      />

      <select
        value={judge}
        onChange={(e) => setJudge(e.target.value)}
        style={{ marginLeft: 10 }}
      >
        <option value="openai">OpenAI Judge</option>
        <option value="gemini">Gemini Judge</option>
      </select>

      <button
        onClick={handleCompare}
        style={{ marginLeft: 10 }}
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
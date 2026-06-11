"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type HistoryItem = {
  id: number;
  question: string;
  subject?: string;
  result: {
    estimatedScore?: string;
    overallCritique?: string;
    breakdown?: {
      knowledge: { score: number };
      application: { score: number };
      analysis: { score: number };
      evaluation: { score: number };
    };
  };
  createdAt: string;
};

const scoreColor = (s: number) =>
  s >= 4 ? "#4ade80" : s >= 3 ? "#facc15" : "#f87171";

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((d) => { setHistory(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  const deleteItem = async (id: number) => {
    await fetch(`/api/history/${id}`, { method: "DELETE" });
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const clearAll = async () => {
    await fetch("/api/history/clear", { method: "POST" });
    setHistory([]);
  };

  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e5e5e5", fontFamily: "var(--font-geist-sans, sans-serif)" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 20px" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>History</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 4 }}>Your past evaluations.</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {history.length > 0 && (
              <button onClick={clearAll} style={{ padding: "8px 14px", borderRadius: 10, fontSize: 13, background: "transparent", border: "0.5px solid #3a1a1a", color: "#f87171", cursor: "pointer" }}>
                Clear all
              </button>
            )}
            <Link href="/" style={{ padding: "8px 16px", borderRadius: 10, fontSize: 13, background: "#1a1a2e", border: "0.5px solid #2563eb", color: "#60a5fa", textDecoration: "none" }}>
              ← New chat
            </Link>
          </div>
        </div>

        {loading && <p style={{ color: "#555", fontSize: 14 }}>Loading...</p>}

        {!loading && history.length === 0 && (
          <div style={{ background: "#111", border: "0.5px solid #222", borderRadius: 16, padding: 32, textAlign: "center", color: "#555" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
            <p style={{ fontSize: 15 }}>No evaluations yet.</p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {history.map((item) => (
            <div key={item.id} style={{ background: "#111", border: "0.5px solid #1a1a1a", borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                    {item.subject && (
                      <span style={{ fontSize: 11, background: "#1a1a2e", border: "0.5px solid #2a2a4a", color: "#818cf8", borderRadius: 20, padding: "2px 10px" }}>
                        {item.subject}
                      </span>
                    )}
                    {item.result?.estimatedScore && (
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#4ade80" }}>
                        {item.result.estimatedScore}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: "#444", marginLeft: "auto" }}>
                      {new Date(item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, color: "#ccc", margin: "0 0 8px", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {item.question}
                  </p>
                  {item.result?.overallCritique && (
                    <p style={{ fontSize: 12, color: "#555", lineHeight: 1.6, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {item.result.overallCritique}
                    </p>
                  )}
                  {/* Mini score bars */}
                  {item.result?.breakdown && (
                    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                      {(["knowledge", "application", "analysis", "evaluation"] as const).map((key) => (
                        <div key={key} style={{ flex: 1, textAlign: "center" }}>
                          <div style={{ fontSize: 10, color: "#444", marginBottom: 3 }}>{key.slice(0, 2).toUpperCase()}</div>
                          <div style={{ height: 3, background: "#1a1a1a", borderRadius: 2 }}>
                            <div style={{ height: "100%", borderRadius: 2, background: scoreColor(item.result.breakdown![key].score), width: `${(item.result.breakdown![key].score / 5) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <button
                  onClick={() => deleteItem(item.id)}
                  style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12, background: "transparent", border: "0.5px solid #2a1a1a", color: "#f87171", cursor: "pointer" }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
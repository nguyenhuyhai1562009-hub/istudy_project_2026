"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type SubjectSummary = {
  sessions: number;
  averages: {
    knowledge: number;
    application: number;
    analysis: number;
    evaluation: number;
  };
  recentDefects: string[];
};

const LAYER_COLORS: Record<string, string> = {
  knowledge: "#60a5fa",
  application: "#a78bfa",
  analysis: "#facc15",
  evaluation: "#f87171",
};

const SUBJECT_ICONS: Record<string, string> = {
  economics: "📈",
  business: "🏢",
  physics: "⚡",
  maths: "∑",
  history: "📜",
  psychology: "🧠",
};

export default function WeaknessPage() {
  const [summary, setSummary] = useState<Record<string, SubjectSummary>>({});
  const [loading, setLoading] = useState(true);
  const [activeSubject, setActiveSubject] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/weakness")
      .then((r) => r.json())
      .then((d) => {
        setSummary(d);
        const first = Object.keys(d)[0];
        if (first) setActiveSubject(first);
        setLoading(false);
      });
  }, []);

  const subjects = Object.keys(summary);
  const active = activeSubject ? summary[activeSubject] : null;

  const radarData = active
    ? [
        { axis: "Knowledge", score: active.averages.knowledge },
        { axis: "Application", score: active.averages.application },
        { axis: "Analysis", score: active.averages.analysis },
        { axis: "Evaluation", score: active.averages.evaluation },
      ]
    : [];

  const weakest = active
    ? Object.entries(active.averages).sort((a, b) => a[1] - b[1])[0]
    : null;

  const strongest = active
    ? Object.entries(active.averages).sort((a, b) => b[1] - a[1])[0]
    : null;

  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e5e5e5", fontFamily: "var(--font-geist-sans, sans-serif)" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>Growth Analytics</h1>
            <p style={{ fontSize: 13, color: "#555", marginTop: 4 }}>Track your strengths and weaknesses over time.</p>
          </div>
          <Link href="/" style={{ padding: "8px 16px", borderRadius: 10, fontSize: 13, background: "#1a1a2e", border: "0.5px solid #2563eb", color: "#60a5fa", textDecoration: "none" }}>
            ← Back to chat
          </Link>
        </div>

        {loading && <p style={{ color: "#555", fontSize: 14 }}>Loading...</p>}

        {!loading && subjects.length === 0 && (
          <div style={{ background: "#111", border: "0.5px solid #222", borderRadius: 16, padding: 32, textAlign: "center", color: "#555" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
            <p style={{ fontSize: 15 }}>No data yet. Complete some evaluations first.</p>
            <Link href="/" style={{ display: "inline-block", marginTop: 16, padding: "8px 20px", borderRadius: 10, background: "#2563eb", color: "#fff", textDecoration: "none", fontSize: 13 }}>
              Start evaluating
            </Link>
          </div>
        )}

        {!loading && subjects.length > 0 && (
          <div style={{ display: "flex", gap: 20 }}>

            {/* Subject sidebar */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 160 }}>
              {subjects.map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveSubject(s)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, fontSize: 13, cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                    background: activeSubject === s ? "#1a1a2e" : "transparent",
                    border: `0.5px solid ${activeSubject === s ? "#2563eb" : "#1a1a1a"}`,
                    color: activeSubject === s ? "#93c5fd" : "#666",
                  }}
                >
                  <span>{SUBJECT_ICONS[s] || "📚"}</span>
                  <div>
                    <div style={{ fontWeight: 500, textTransform: "capitalize" }}>{s}</div>
                    <div style={{ fontSize: 11, color: "#444" }}>{summary[s].sessions} session{summary[s].sessions > 1 ? "s" : ""}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Main panel */}
            {active && activeSubject && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Summary cards */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div style={{ background: "#111", border: "0.5px solid #1a1a1a", borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Sessions</div>
                    <div style={{ fontSize: 28, fontWeight: 700 }}>{active.sessions}</div>
                  </div>
                  <div style={{ background: "#111", border: "0.5px solid #1a1a1a", borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Strongest</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#4ade80", textTransform: "capitalize" }}>{strongest?.[0]}</div>
                    <div style={{ fontSize: 13, color: "#555" }}>{strongest?.[1]}/5 avg</div>
                  </div>
                  <div style={{ background: "#111", border: "0.5px solid #1a1a1a", borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Needs work</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#f87171", textTransform: "capitalize" }}>{weakest?.[0]}</div>
                    <div style={{ fontSize: 13, color: "#555" }}>{weakest?.[1]}/5 avg</div>
                  </div>
                </div>

                {/* Radar chart */}
                <div style={{ background: "#111", border: "0.5px solid #1a1a1a", borderRadius: 12, padding: "16px" }}>
                  <div style={{ fontSize: 12, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Capability tower</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#1a1a1a" />
                      <PolarAngleAxis dataKey="axis" tick={{ fill: "#666", fontSize: 12 }} />
                      <Radar name="Score" dataKey="score" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.25} dot={{ fill: "#818cf8", r: 4 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Score bars */}
                <div style={{ background: "#111", border: "0.5px solid #1a1a1a", borderRadius: 12, padding: "16px" }}>
                  <div style={{ fontSize: 12, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>Average scores</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {(["knowledge", "application", "analysis", "evaluation"] as const).map((key) => (
                      <div key={key}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#666", marginBottom: 5 }}>
                          <span style={{ textTransform: "capitalize" }}>{key}</span>
                          <span style={{ color: LAYER_COLORS[key] }}>{active.averages[key]}/5</span>
                        </div>
                        <div style={{ height: 4, background: "#1a1a1a", borderRadius: 2 }}>
                          <div style={{ height: "100%", borderRadius: 2, background: LAYER_COLORS[key], width: `${(active.averages[key] / 5) * 100}%`, transition: "width 0.6s ease" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Defect tags */}
                {active.recentDefects.length > 0 && (
                  <div style={{ background: "#111", border: "0.5px solid #1a1a1a", borderRadius: 12, padding: "16px" }}>
                    <div style={{ fontSize: 12, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Recurring weaknesses</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {[...new Set(active.recentDefects)].map((d, i) => (
                        <span key={i} style={{ fontSize: 12, background: "#1a0a0a", border: "0.5px solid #3a1a1a", color: "#f87171", borderRadius: 20, padding: "4px 12px" }}>
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
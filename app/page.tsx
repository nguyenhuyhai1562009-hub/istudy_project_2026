"use client";

import { useState, useRef, useEffect } from "react";
import AnnotationOverlay from "@/components/AnnotationOverlay";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

type Breakdown = { score: number; feedback: string };
type Annotation = { keyword: string; type: string; context: string; suggestion: string };
type Improvement = { category: string; defect: string; fix: string };
type Citation = { claim: string; source: string; reference: string };

type EvalResult = {
  subject: string;
  estimatedScore: string;
  overallCritique: string;
  breakdown: {
    knowledge: Breakdown;
    application: Breakdown;
    analysis: Breakdown;
    evaluation: Breakdown;
  };
  annotations: Annotation[];
  improvements: Improvement[];
  citations?: Citation[];
};

type TrustResult = {
  reliabilityScore: number;
  hallucinationRisk: number;
  trustLabel: string;
  summary: string;
};

type Message =
  | { role: "user"; content: string; imagePreview?: string }
  | { role: "assistant"; type: "eval"; result: EvalResult; answer: string; trust?: TrustResult }
  | { role: "assistant"; type: "study"; content: string; mode: string }
  | { role: "assistant"; type: "text"; content: string };

type ChatPhase = "idle" | "has_question" | "has_eval";

type SubjectSummary = {
  sessions: number;
  averages: { knowledge: number; application: number; analysis: number; evaluation: number };
  recentDefects: string[];
};

type HistoryItem = {
  id: number;
  question: string;
  subject?: string;
  result: { estimatedScore?: string; overallCritique?: string; breakdown?: { knowledge: { score: number }; application: { score: number }; analysis: { score: number }; evaluation: { score: number } } };
  createdAt: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SUBJECTS = ["Economics", "Business", "Physics", "Maths", "History", "Psychology"];
const STUDY_MODES = [
  { key: "socratic", label: "Guide Me", icon: "🧭", desc: "Socratic hints only" },
  { key: "scaffold", label: "Base Concepts", icon: "🧱", desc: "Step-by-step theory" },
  { key: "exam_drill", label: "Exam Drill", icon: "🎯", desc: "Mark scheme focus" },
];
const LAYER_COLORS: Record<string, string> = {
  knowledge: "#60a5fa", application: "#a78bfa", analysis: "#facc15", evaluation: "#f87171",
};
const SUBJECT_ICONS: Record<string, string> = {
  economics: "📈", business: "🏢", physics: "⚡", maths: "∑", history: "📜", psychology: "🧠",
};

const sc = (s: number) => s >= 4 ? "#4ade80" : s >= 3 ? "#facc15" : "#f87171";

function getChips(phase: ChatPhase, lastResult?: EvalResult): string[] {
  if (phase === "idle") return [];
  if (phase === "has_question") return ["🔍 Explain the question", "🧭 Guide me (Socratic)", "🎯 Mark scheme breakdown"];
  const weakest = lastResult
    ? Object.entries(lastResult.breakdown).sort((a, b) => a[1].score - b[1].score)[0][0]
    : "Evaluation";
  return [`💡 Why is my ${weakest} score low?`, "📝 Show a model answer", "🔁 Give me a similar question"];
}

async function runSilentTrust(question: string, answer: string, subject: string): Promise<TrustResult | null> {
  try {
    const res = await fetch("/api/trust", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, answer, subject }) });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [tab, setTab] = useState<"chat" | "analytics" | "history">("chat");

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [question, setQuestion] = useState("");
  const [subject, setSubject] = useState("Economics");
  const [phase, setPhase] = useState<ChatPhase>("idle");
  const [lastResult, setLastResult] = useState<EvalResult | undefined>();
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("");
  const [error, setError] = useState("");
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrTarget, setOcrTarget] = useState<"question" | "answer">("answer");

  // Analytics state
  const [analyticsSummary, setAnalyticsSummary] = useState<Record<string, SubjectSummary>>({});
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [activeSubject, setActiveSubject] = useState<string | null>(null);

  // History state
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  // Load analytics/history when tab changes
  useEffect(() => {
    if (tab === "analytics" && Object.keys(analyticsSummary).length === 0) {
      setAnalyticsLoading(true);
      fetch("/api/weakness").then(r => r.json()).then(d => {
        setAnalyticsSummary(d);
        const first = Object.keys(d)[0];
        if (first) setActiveSubject(first);
        setAnalyticsLoading(false);
      });
    }
    if (tab === "history" && historyItems.length === 0) {
      setHistoryLoading(true);
      fetch("/api/history").then(r => r.json()).then(d => {
        setHistoryItems(Array.isArray(d) ? d : []);
        setHistoryLoading(false);
      });
    }
  }, [tab]);

  // Quote on text selection
  useEffect(() => {
    function onMouseUp() {
      const sel = window.getSelection()?.toString().trim();
      if (sel && sel.length > 10 && sel.length < 300) {
        setInput(`> "${sel}"\n\n`);
        textareaRef.current?.focus();
      }
    }
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, []);

  async function runOCR() {
    if (!imageFile) return;
    setLoading(true); setLoadingLabel("Extracting text...");
    try {
      const form = new FormData(); form.append("image", imageFile);
      const res = await fetch("/api/ocr", { method: "POST", body: form });
      const data = await res.json();
      if (!data.text) { setError("OCR failed."); return; }
      if (ocrTarget === "question") {
        setQuestion(data.text); setPhase("has_question");
        const dr = await fetch("/api/detect-subject", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: data.text }) });
        const dd = await dr.json();
        if (dd.subject && SUBJECTS.includes(dd.subject)) setSubject(dd.subject);
        setMessages(p => [...p, { role: "assistant", type: "text", content: `📄 Question extracted:\n\n${data.text}` }]);
      } else { setInput(data.text); }
      setImageFile(null); setImagePreview(null);
    } catch { setError("OCR failed."); }
    finally { setLoading(false); setLoadingLabel(""); }
  }

  function addMsg(msg: Message) { setMessages(p => [...p, msg]); }

  async function send(text?: string) {
    const content = (text || input).trim();
    if (!content) return;
    setInput(""); setError("");
    addMsg({ role: "user", content, imagePreview: imagePreview ?? undefined });
    setImageFile(null); setImagePreview(null);

    if (!question) {
      setQuestion(content); setPhase("has_question"); setLoading(true); setLoadingLabel("Detecting subject...");
      try {
        const dr = await fetch("/api/detect-subject", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: content }) });
        const dd = await dr.json();
        if (dd.subject && SUBJECTS.includes(dd.subject)) setSubject(dd.subject);
        addMsg({ role: "assistant", type: "text", content: `Subject detected: **${dd.subject || subject}**.\n\nPaste your answer to evaluate, or use a study mode to explore first.` });
      } finally { setLoading(false); setLoadingLabel(""); }
      return;
    }

    const studyChipMap: Record<string, string> = {
      "🧭 Guide me (Socratic)": "socratic", "🔁 Give me a similar question": "exam_drill",
      "🎯 Mark scheme breakdown": "exam_drill", "🔍 Explain the question": "scaffold",
    };
    const isStudyChip = studyChipMap[content] || activeMode;
    const isFollowUp = content.startsWith("💡") || content.startsWith("📝");

    if (isStudyChip || isFollowUp) {
      const mode = studyChipMap[content] || activeMode || "scaffold";
      setLoading(true); setLoadingLabel("Thinking...");
      try {
        const res = await fetch("/api/study", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: isFollowUp ? `${question}\n\nContext: ${content}` : question, subject, mode }) });
        const data = await res.json();
        addMsg({ role: "assistant", type: "study", content: data.text || data.error, mode: mode as string });
      } finally { setLoading(false); setLoadingLabel(""); setActiveMode(null); }
      return;
    }

    // Evaluate
    setLoading(true); setLoadingLabel("Evaluating...");
    try {
      const res = await fetch("/api/evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, response1: content, response2: "", evaluator: "Gemini", subject }) });
      const data: EvalResult = await res.json();
      if (!res.ok) { setError((data as any).error || "Evaluation failed."); return; }
      addMsg({ role: "assistant", type: "eval", result: data, answer: content });
      setLastResult(data); setPhase("has_eval");
      fetch("/api/weakness", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, scores: data.breakdown, improvements: data.improvements }) });
      setLoadingLabel("Verifying reliability...");
      const trust = await runSilentTrust(question, content, subject);
      if (trust && trust.hallucinationRisk > 30) {
        setMessages(prev => prev.map((m, i) => i === prev.length - 1 && m.role === "assistant" && m.type === "eval" ? { ...m, trust } : m) as Message[]);
      }
    } finally { setLoading(false); setLoadingLabel(""); }
  }

  const chips = getChips(phase, lastResult);
  const activeAnalytics = activeSubject ? analyticsSummary[activeSubject] : null;

  // ── Shared styles ──────────────────────────────────────────────────────────
  const S = {
    wrap: { display: "flex", flexDirection: "column" as const, height: "100vh", background: "#0a0a0a", color: "#e5e5e5", fontFamily: "var(--font-geist-sans, sans-serif)" },
    // Top nav bar
    nav: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", borderBottom: "0.5px solid #1a1a1a", background: "#0a0a0a", height: 48, flexShrink: 0 as const },
    navLeft: { display: "flex", alignItems: "center", gap: 0 },
    logo: { fontSize: 15, fontWeight: 600, color: "#e5e5e5", marginRight: 24, letterSpacing: "-0.01em" },
    tabBtn: (active: boolean) => ({
      padding: "0 16px", height: 48, fontSize: 13, cursor: "pointer", background: "transparent", border: "none",
      color: active ? "#e5e5e5" : "#555", borderBottom: `2px solid ${active ? "#4f46e5" : "transparent"}`,
      transition: "all 0.15s", fontFamily: "inherit",
    }),
    navRight: { display: "flex", alignItems: "center", gap: 8 },
    pill: (active: boolean) => ({
      padding: "3px 10px", borderRadius: 20, fontSize: 11, cursor: "pointer", border: "0.5px solid",
      background: active ? "#2563eb" : "transparent", borderColor: active ? "#2563eb" : "#222",
      color: active ? "#fff" : "#666", transition: "all 0.12s", fontFamily: "inherit",
    }),
    newChat: { padding: "5px 12px", borderRadius: 8, fontSize: 12, background: "transparent", border: "0.5px solid #222", color: "#666", cursor: "pointer", fontFamily: "inherit" },
  };

  return (
    <div style={S.wrap}>

      {/* ── Top nav ── */}
      <nav style={S.nav}>
        <div style={S.navLeft}>
          <span style={S.logo}>iStudy AI</span>
          {(["chat", "analytics", "history"] as const).map(t => (
            <button key={t} style={S.tabBtn(tab === t)} onClick={() => setTab(t)}>
              {t === "chat" ? "Chat" : t === "analytics" ? "Analytics" : "History"}
            </button>
          ))}
        </div>
        <div style={S.navRight}>
          {tab === "chat" && SUBJECTS.map(s => (
            <button key={s} style={S.pill(subject === s)} onClick={() => setSubject(s)}>{s}</button>
          ))}
          {tab === "chat" && (
            <button style={S.newChat} onClick={() => { setMessages([]); setQuestion(""); setPhase("idle"); setLastResult(undefined); setInput(""); }}>
              + New
            </button>
          )}
        </div>
      </nav>

      {/* ── Chat tab ── */}
      {tab === "chat" && (
        <>
          {/* Study mode toolbar */}
          <div style={{ display: "flex", gap: 6, padding: "7px 20px", borderBottom: "0.5px solid #111", background: "#0a0a0a", flexShrink: 0 }}>
            {STUDY_MODES.map(m => (
              <button key={m.key} onClick={() => setActiveMode(activeMode === m.key ? null : m.key)} title={m.desc}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer", border: "0.5px solid", transition: "all 0.12s", fontFamily: "inherit",
                  background: activeMode === m.key ? "#312e81" : "transparent", borderColor: activeMode === m.key ? "#4f46e5" : "#1e1e1e", color: activeMode === m.key ? "#c7d2fe" : "#555" }}>
                <span>{m.icon}</span>{m.label}
              </button>
            ))}
            {activeMode && <span style={{ fontSize: 11, color: "#444", alignSelf: "center", marginLeft: 4 }}>— {activeMode} mode active</span>}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
            {messages.length === 0 && (
              <div style={{ margin: "auto", textAlign: "center", maxWidth: 420, color: "#333" }}>
                <div style={{ fontSize: 36, marginBottom: 14 }}>📚</div>
                <p style={{ fontSize: 15, color: "#555", marginBottom: 6 }}>Paste your exam question to get started.</p>
                <p style={{ fontSize: 12, color: "#333" }}>Select text in any response to quote it. Upload an image for OCR.</p>
              </div>
            )}
            {messages.map((msg, i) => {
              if (msg.role === "user") return (
                <div key={i} style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ maxWidth: "68%", background: "#1a1a2e", border: "0.5px solid #2a2a4a", borderRadius: "16px 16px 4px 16px", padding: "10px 14px", fontSize: 14, lineHeight: 1.6, color: "#d0d0e8", whiteSpace: "pre-wrap" }}>
                    {msg.imagePreview && <img src={msg.imagePreview} alt="" style={{ maxHeight: 100, borderRadius: 6, marginBottom: 8, display: "block" }} />}
                    {msg.content}
                  </div>
                </div>
              );
              if (msg.role === "assistant" && msg.type === "text") return (
                <div key={i} style={{ display: "flex", gap: 10, maxWidth: "76%" }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#111", border: "0.5px solid #222", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0, marginTop: 2, color: "#666" }}>A</div>
                  <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: "4px 14px 14px 14px", padding: "10px 14px", fontSize: 14, lineHeight: 1.7, color: "#ccc", whiteSpace: "pre-wrap" }}>{msg.content}</div>
                </div>
              );
              if (msg.role === "assistant" && msg.type === "study") return (
                <div key={i} style={{ display: "flex", gap: 10, maxWidth: "76%" }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#111", border: "0.5px solid #222", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0, marginTop: 2, color: "#666" }}>A</div>
                  <div style={{ background: "#0f0f1a", border: "0.5px solid #1e1e3a", borderRadius: "4px 14px 14px 14px", padding: "12px 16px", fontSize: 14, lineHeight: 1.7, color: "#ccc", whiteSpace: "pre-wrap" }}>
                    <span style={{ display: "inline-block", fontSize: 11, background: "#1e1e3a", border: "0.5px solid #2e2e5a", color: "#818cf8", borderRadius: 6, padding: "2px 8px", marginBottom: 8 }}>
                      {STUDY_MODES.find(m => m.key === msg.mode)?.icon} {STUDY_MODES.find(m => m.key === msg.mode)?.label}
                    </span>
                    <div>{msg.content}</div>
                  </div>
                </div>
              );
              if (msg.role === "assistant" && msg.type === "eval") {
                const r = msg.result;
                return (
                  <div key={i} style={{ display: "flex", gap: 10 }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#111", border: "0.5px solid #222", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0, marginTop: 2, color: "#666" }}>A</div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                      {/* Score */}
                      <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 14, padding: "16px 18px" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 14 }}>
                          <div>
                            <div style={{ fontSize: 11, color: "#444", marginBottom: 4 }}>{r.subject}</div>
                            <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em" }}>{r.estimatedScore}</div>
                          </div>
                          <div style={{ fontSize: 13, color: "#777", lineHeight: 1.6, maxWidth: 400 }}>{r.overallCritique}</div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                          {(["knowledge", "application", "analysis", "evaluation"] as const).map(key => (
                            <div key={key} style={{ background: "#0a0a0a", border: "0.5px solid #161616", borderRadius: 10, padding: "10px 12px" }}>
                              <div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>{key}</div>
                              <div style={{ fontSize: 22, fontWeight: 700, color: sc(r.breakdown[key].score) }}>{r.breakdown[key].score}/5</div>
                              <div style={{ marginTop: 5, height: 2, background: "#1a1a1a", borderRadius: 1 }}>
                                <div style={{ height: "100%", borderRadius: 1, background: sc(r.breakdown[key].score), width: `${(r.breakdown[key].score / 5) * 100}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Annotations */}
                      {r.annotations?.length > 0 && (
                        <div style={{ background: "#0f0f0a", border: "0.5px solid #1e1e00", borderRadius: 12, padding: "12px 16px" }}>
                          <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Annotated answer</div>
                          <AnnotationOverlay text={msg.answer} annotations={r.annotations} />
                        </div>
                      )}
                      {/* Improvements */}
                      {r.improvements?.length > 0 && (
                        <div style={{ background: "#0d0d0d", border: "0.5px solid #1a1a1a", borderRadius: 12, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>How to improve</div>
                          {r.improvements.map((imp, j) => (
                            <div key={j} style={{ background: "#0a0a0a", border: "0.5px solid #161616", borderRadius: 10, padding: "10px 12px" }}>
                              <div style={{ fontSize: 10, color: "#60a5fa", textTransform: "uppercase", marginBottom: 3 }}>{imp.category}</div>
                              <div style={{ fontSize: 13, color: "#f87171", marginBottom: 3 }}>⚠ {imp.defect}</div>
                              <div style={{ fontSize: 13, color: "#4ade80" }}>✓ {imp.fix}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Citations */}
                      {r.citations && r.citations.length > 0 && (
                        <div style={{ background: "#0d0d0d", border: "0.5px solid #1a1a1a", borderRadius: 12, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                          <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Sources</div>
                          {r.citations.map((c, j) => (
                            <div key={j} style={{ background: "#0a0a0a", border: "0.5px solid #161616", borderRadius: 10, padding: "8px 12px" }}>
                              <div style={{ fontSize: 13, color: "#bbb" }}>"{c.claim}"</div>
                              <div style={{ fontSize: 11, color: "#60a5fa", marginTop: 3 }}>📚 {c.source}</div>
                              <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>{c.reference}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Trust warning */}
                      {msg.trust && msg.trust.hallucinationRisk > 30 && (
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "#1a1000", border: "0.5px solid #2a1e00", borderRadius: 10, padding: "10px 14px" }}>
                          <span style={{ fontSize: 14 }}>⚠️</span>
                          <div>
                            <div style={{ fontSize: 12, color: "#facc15", fontWeight: 500, marginBottom: 2 }}>Reliability flagged</div>
                            <div style={{ fontSize: 12, color: "#888" }}>{msg.trust.summary}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            })}
            {loading && (
              <div style={{ display: "flex", gap: 10, maxWidth: "76%" }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#111", border: "0.5px solid #222", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0, color: "#666" }}>A</div>
                <div style={{ background: "#111", border: "0.5px solid #1e1e1e", borderRadius: "4px 14px 14px 14px", padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "#444" }}>{loadingLabel || "Thinking..."}</span>
                  <span style={{ display: "inline-flex", gap: 3 }}>
                    {[0,1,2].map(d => <span key={d} style={{ width: 4, height: 4, borderRadius: "50%", background: "#333", animation: `pulse 1.2s ${d*0.2}s infinite` }} />)}
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Chips */}
          {chips.length > 0 && !loading && (
            <div style={{ padding: "8px 20px", display: "flex", gap: 6, flexWrap: "wrap", borderTop: "0.5px solid #111", flexShrink: 0 }}>
              {chips.map(chip => (
                <button key={chip} onClick={() => send(chip)}
                  style={{ padding: "5px 13px", borderRadius: 20, fontSize: 12, cursor: "pointer", background: "transparent", border: "0.5px solid #222", color: "#666", transition: "all 0.12s", fontFamily: "inherit" }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.borderColor="#3a3a5a"; (e.target as HTMLElement).style.color="#aaa"; }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.borderColor="#222"; (e.target as HTMLElement).style.color="#666"; }}>
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Error */}
          {error && <div style={{ margin: "0 20px 6px", background: "#160808", border: "0.5px solid #3a1010", borderRadius: 8, padding: "7px 12px", fontSize: 12, color: "#f87171", flexShrink: 0 }}>{error}</div>}

          {/* Input */}
          <div style={{ padding: "10px 20px 16px", borderTop: "0.5px solid #111", background: "#0a0a0a", flexShrink: 0 }}>
            {imagePreview && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "6px 10px", background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 8 }}>
                <img src={imagePreview} alt="" style={{ height: 40, borderRadius: 4, objectFit: "cover" }} />
                <select value={ocrTarget} onChange={e => setOcrTarget(e.target.value as any)}
                  style={{ background: "#0a0a0a", border: "0.5px solid #222", borderRadius: 6, padding: "3px 7px", fontSize: 11, color: "#888", fontFamily: "inherit" }}>
                  <option value="answer">→ Answer</option>
                  <option value="question">→ Question</option>
                </select>
                <button onClick={runOCR} disabled={loading} style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, background: "#312e81", border: "none", color: "#c7d2fe", cursor: "pointer", fontFamily: "inherit" }}>Extract</button>
                <button onClick={() => { setImageFile(null); setImagePreview(null); }} style={{ padding: "3px 8px", borderRadius: 6, fontSize: 11, background: "transparent", border: "0.5px solid #222", color: "#555", cursor: "pointer", fontFamily: "inherit" }}>✕</button>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 12, padding: "8px 8px 8px 12px" }}>
              <button onClick={() => fileRef.current?.click()} style={{ padding: "5px 7px", borderRadius: 7, background: "transparent", border: "0.5px solid #1e1e1e", color: "#444", cursor: "pointer", fontSize: 15, flexShrink: 0, alignSelf: "flex-end", marginBottom: 1 }}>📎</button>
              <input ref={fileRef} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (!f) return; setImageFile(f); setImagePreview(URL.createObjectURL(f)); }} style={{ display: "none" }} />
              <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={!question ? "Paste your exam question..." : phase === "has_question" ? "Paste your answer to evaluate..." : "Ask a follow-up..."}
                rows={1} style={{ flex: 1, background: "transparent", border: "none", outline: "none", resize: "none", fontSize: 14, color: "#e5e5e5", lineHeight: 1.6, fontFamily: "inherit", maxHeight: 140, overflowY: "auto" }}
                onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 140) + "px"; }} />
              <button onClick={() => send()} disabled={loading || !input.trim()}
                style={{ padding: "6px 14px", borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: "pointer", flexShrink: 0, alignSelf: "flex-end", border: "none", transition: "all 0.12s", fontFamily: "inherit",
                  background: input.trim() && !loading ? "#4f46e5" : "#141414", color: input.trim() && !loading ? "#fff" : "#333" }}>
                Send
              </button>
            </div>
            <div style={{ marginTop: 5, fontSize: 10, color: "#2a2a2a", textAlign: "center" }}>Enter to send · Shift+Enter for newline · Select text to quote</div>
          </div>
        </>
      )}

      {/* ── Analytics tab ── */}
      {tab === "analytics" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px" }}>
          {analyticsLoading && <p style={{ color: "#444", fontSize: 13 }}>Loading...</p>}
          {!analyticsLoading && Object.keys(analyticsSummary).length === 0 && (
            <div style={{ maxWidth: 400, margin: "60px auto", textAlign: "center", color: "#444" }}>
              <div style={{ fontSize: 36, marginBottom: 14 }}>📊</div>
              <p style={{ fontSize: 14 }}>No data yet. Complete some evaluations first.</p>
              <button onClick={() => setTab("chat")} style={{ marginTop: 16, padding: "8px 20px", borderRadius: 10, background: "#312e81", border: "none", color: "#c7d2fe", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                Start evaluating
              </button>
            </div>
          )}
          {!analyticsLoading && Object.keys(analyticsSummary).length > 0 && (
            <div style={{ display: "flex", gap: 20, maxWidth: 860, margin: "0 auto" }}>
              {/* Subject list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4, width: 160, flexShrink: 0 }}>
                {Object.keys(analyticsSummary).map(s => (
                  <button key={s} onClick={() => setActiveSubject(s)}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10, fontSize: 13, cursor: "pointer", textAlign: "left", transition: "all 0.12s", fontFamily: "inherit",
                      background: activeSubject === s ? "#1a1a2e" : "transparent", border: `0.5px solid ${activeSubject === s ? "#2a2a4a" : "#161616"}`, color: activeSubject === s ? "#93c5fd" : "#555" }}>
                    <span>{SUBJECT_ICONS[s] || "📚"}</span>
                    <div>
                      <div style={{ fontWeight: 500, textTransform: "capitalize", fontSize: 12 }}>{s}</div>
                      <div style={{ fontSize: 10, color: "#444" }}>{analyticsSummary[s].sessions} sessions</div>
                    </div>
                  </button>
                ))}
              </div>
              {/* Main panel */}
              {activeAnalytics && activeSubject && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Summary cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    {[
                      { label: "Sessions", value: activeAnalytics.sessions, color: "#e5e5e5", sub: null },
                      { label: "Strongest", value: Object.entries(activeAnalytics.averages).sort((a,b) => b[1]-a[1])[0][0], color: "#4ade80", sub: `${Object.entries(activeAnalytics.averages).sort((a,b) => b[1]-a[1])[0][1]}/5` },
                      { label: "Needs work", value: Object.entries(activeAnalytics.averages).sort((a,b) => a[1]-b[1])[0][0], color: "#f87171", sub: `${Object.entries(activeAnalytics.averages).sort((a,b) => a[1]-b[1])[0][1]}/5` },
                    ].map(card => (
                      <div key={card.label} style={{ background: "#111", border: "0.5px solid #161616", borderRadius: 12, padding: "14px 16px" }}>
                        <div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{card.label}</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: card.color, textTransform: "capitalize" }}>{card.value}</div>
                        {card.sub && <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>{card.sub} avg</div>}
                      </div>
                    ))}
                  </div>
                  {/* Radar */}
                  <div style={{ background: "#111", border: "0.5px solid #161616", borderRadius: 12, padding: "16px" }}>
                    <div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Capability radar</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <RadarChart data={[
                        { axis: "Knowledge", score: activeAnalytics.averages.knowledge },
                        { axis: "Application", score: activeAnalytics.averages.application },
                        { axis: "Analysis", score: activeAnalytics.averages.analysis },
                        { axis: "Evaluation", score: activeAnalytics.averages.evaluation },
                      ]}>
                        <PolarGrid stroke="#1a1a1a" />
                        <PolarAngleAxis dataKey="axis" tick={{ fill: "#555", fontSize: 11 }} />
                        <Radar dataKey="score" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.2} dot={{ fill: "#818cf8", r: 3 }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Score bars */}
                  <div style={{ background: "#111", border: "0.5px solid #161616", borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Average scores</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {(["knowledge", "application", "analysis", "evaluation"] as const).map(key => (
                        <div key={key}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#555", marginBottom: 4 }}>
                            <span style={{ textTransform: "capitalize" }}>{key}</span>
                            <span style={{ color: LAYER_COLORS[key] }}>{activeAnalytics.averages[key]}/5</span>
                          </div>
                          <div style={{ height: 3, background: "#161616", borderRadius: 2 }}>
                            <div style={{ height: "100%", borderRadius: 2, background: LAYER_COLORS[key], width: `${(activeAnalytics.averages[key]/5)*100}%`, transition: "width 0.5s ease" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Defect tags */}
                  {activeAnalytics.recentDefects.length > 0 && (
                    <div style={{ background: "#111", border: "0.5px solid #161616", borderRadius: 12, padding: "14px 16px" }}>
                      <div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Recurring weaknesses</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {[...new Set(activeAnalytics.recentDefects)].map((d, i) => (
                          <span key={i} style={{ fontSize: 12, background: "#160808", border: "0.5px solid #2a1010", color: "#f87171", borderRadius: 20, padding: "3px 12px" }}>{d}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── History tab ── */}
      {tab === "history" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px" }}>
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              {historyItems.length > 0 && (
                <button onClick={async () => { await fetch("/api/history/clear", { method: "POST" }); setHistoryItems([]); }}
                  style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12, background: "transparent", border: "0.5px solid #2a1010", color: "#f87171", cursor: "pointer", fontFamily: "inherit" }}>
                  Clear all
                </button>
              )}
            </div>
            {historyLoading && <p style={{ color: "#444", fontSize: 13 }}>Loading...</p>}
            {!historyLoading && historyItems.length === 0 && (
              <div style={{ textAlign: "center", color: "#444", marginTop: 60 }}>
                <div style={{ fontSize: 36, marginBottom: 14 }}>📭</div>
                <p style={{ fontSize: 14 }}>No evaluations yet.</p>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {historyItems.map(item => (
                <div key={item.id} style={{ background: "#111", border: "0.5px solid #161616", borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                    {item.subject && <span style={{ fontSize: 11, background: "#1a1a2e", border: "0.5px solid #2a2a4a", color: "#818cf8", borderRadius: 20, padding: "2px 10px" }}>{item.subject}</span>}
                    {item.result?.estimatedScore && <span style={{ fontSize: 13, fontWeight: 700, color: "#4ade80" }}>{item.result.estimatedScore}</span>}
                    <span style={{ fontSize: 11, color: "#333", marginLeft: "auto" }}>{new Date(item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p style={{ fontSize: 13, color: "#bbb", margin: "0 0 6px", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>{item.question}</p>
                  {item.result?.overallCritique && <p style={{ fontSize: 12, color: "#444", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>{item.result.overallCritique}</p>}
                  {item.result?.breakdown && (
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      {(["knowledge","application","analysis","evaluation"] as const).map(key => (
                        <div key={key} style={{ flex: 1 }}>
                          <div style={{ fontSize: 9, color: "#333", marginBottom: 3, textTransform: "uppercase" }}>{key.slice(0,2)}</div>
                          <div style={{ height: 2, background: "#161616", borderRadius: 1 }}>
                            <div style={{ height: "100%", borderRadius: 1, background: sc(item.result.breakdown![key].score), width: `${(item.result.breakdown![key].score/5)*100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={() => { setHistoryItems(p => p.filter(h => h.id !== item.id)); fetch(`/api/history/${item.id}`, { method: "DELETE" }); }}
                    style={{ marginTop: 10, padding: "4px 10px", borderRadius: 6, fontSize: 11, background: "transparent", border: "0.5px solid #1e1010", color: "#f87171", cursor: "pointer", fontFamily: "inherit" }}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:.2}50%{opacity:.8}}`}</style>
    </div>
  );
}
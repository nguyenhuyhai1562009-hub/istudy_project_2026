"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import AnnotationOverlay from "@/components/AnnotationOverlay";

// ─── Types ───────────────────────────────────────────────────────────────────

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
  | { role: "assistant"; type: "eval"; result: EvalResult; answer: string }
  | { role: "assistant"; type: "study"; content: string; mode: string }
  | { role: "assistant"; type: "text"; content: string; trust?: TrustResult };

type ChatPhase = "idle" | "has_question" | "has_eval";

const SUBJECTS = ["Economics", "Business", "Physics", "Maths", "History", "Psychology"];

const STUDY_MODES = [
  { key: "socratic", label: "Guide Me", icon: "🧭", desc: "Socratic hints only" },
  { key: "scaffold", label: "Base Concepts", icon: "🧱", desc: "Step-by-step theory" },
  { key: "exam_drill", label: "Exam Drill", icon: "🎯", desc: "Mark scheme focus" },
];

const scoreColor = (s: number) =>
  s >= 4 ? "#4ade80" : s >= 3 ? "#facc15" : "#f87171";

// ─── Silent Trust Guard ───────────────────────────────────────────────────────

async function runSilentTrust(
  question: string,
  answer: string,
  subject: string
): Promise<TrustResult | null> {
  try {
    const res = await fetch("/api/trust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, answer, subject }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Option Chips ─────────────────────────────────────────────────────────────

function getChips(phase: ChatPhase, lastResult?: EvalResult): string[] {
  if (phase === "idle") return [];
  if (phase === "has_question") return [
    "🔍 Explain the question",
    "🧭 Guide me (Socratic)",
    "🎯 Mark scheme breakdown",
  ];
  if (phase === "has_eval") {
    const weakest = lastResult
      ? Object.entries(lastResult.breakdown).sort((a, b) => a[1].score - b[1].score)[0][0]
      : "Evaluation";
    return [
      `💡 Why is my ${weakest} score low?`,
      "📝 Show a model answer",
      "🔁 Give me a similar question",
    ];
  }
  return [];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
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

  const [quoteText, setQuoteText] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Quote on text selection ────────────────────────────────────────────────
  useEffect(() => {
    function onMouseUp() {
      const sel = window.getSelection()?.toString().trim();
      if (sel && sel.length > 10 && sel.length < 300) {
        setQuoteText(sel);
        setInput(`> "${sel}"\n\n`);
        textareaRef.current?.focus();
      }
    }
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, []);

  // ── OCR ───────────────────────────────────────────────────────────────────
  async function runOCR() {
    if (!imageFile) return;
    setLoading(true);
    setLoadingLabel("Extracting text from image...");
    try {
      const form = new FormData();
      form.append("image", imageFile);
      const res = await fetch("/api/ocr", { method: "POST", body: form });
      const data = await res.json();
      if (!data.text) { setError("OCR failed."); return; }

      if (ocrTarget === "question") {
        setQuestion(data.text);
        setPhase("has_question");
        setInput("");
        // auto detect subject
        const dr = await fetch("/api/detect-subject", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: data.text }),
        });
        const dd = await dr.json();
        if (dd.subject && SUBJECTS.includes(dd.subject)) setSubject(dd.subject);
        addMessage({ role: "assistant", type: "text", content: `📄 Question extracted:\n\n${data.text}` });
      } else {
        setInput(data.text);
      }
      setImageFile(null);
      setImagePreview(null);
    } catch {
      setError("OCR request failed.");
    } finally {
      setLoading(false);
      setLoadingLabel("");
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function addMessage(msg: Message) {
    setMessages((prev) => [...prev, msg]);
  }

  // ── Send message / chip ───────────────────────────────────────────────────
  async function send(text?: string) {
    const content = (text || input).trim();
    if (!content) return;
    setInput("");
    setQuoteText("");
    setError("");

    addMessage({ role: "user", content, imagePreview: imagePreview ?? undefined });
    setImageFile(null);
    setImagePreview(null);

    // ── If no question set yet, treat this as the question ─────────────────
    if (!question) {
      setQuestion(content);
      setPhase("has_question");
      setLoading(true);
      setLoadingLabel("Detecting subject...");
      try {
        const dr = await fetch("/api/detect-subject", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: content }),
        });
        const dd = await dr.json();
        if (dd.subject && SUBJECTS.includes(dd.subject)) setSubject(dd.subject);
        addMessage({
          role: "assistant",
          type: "text",
          content: `Got it. Subject detected: **${dd.subject || subject}**.\n\nPaste your answer when ready, or use a study mode to explore first.`,
        });
      } finally {
        setLoading(false);
        setLoadingLabel("");
      }
      return;
    }

    // ── Study mode chips ───────────────────────────────────────────────────
    const studyChipMap: Record<string, string> = {
      "🧭 Guide me (Socratic)": "socratic",
      "🔁 Give me a similar question": "exam_drill",
      "🎯 Mark scheme breakdown": "exam_drill",
      "🔍 Explain the question": "scaffold",
    };

    if (studyChipMap[content] || activeMode) {
      const mode = studyChipMap[content] || activeMode || "scaffold";
      setLoading(true);
      setLoadingLabel("Thinking...");
      try {
        const res = await fetch("/api/study", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, subject, mode }),
        });
        const data = await res.json();
        addMessage({ role: "assistant", type: "study", content: data.text || data.error, mode });
      } finally {
        setLoading(false);
        setLoadingLabel("");
        setActiveMode(null);
      }
      return;
    }

    // ── Improvement chip ───────────────────────────────────────────────────
    if (content.startsWith("💡 Why is my") || content.startsWith("📝 Show a model answer")) {
      setLoading(true);
      setLoadingLabel("Thinking...");
      try {
        const res = await fetch("/api/study", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: `${question}\n\nContext: ${content}`,
            subject,
            mode: "exam_drill",
          }),
        });
        const data = await res.json();
        addMessage({ role: "assistant", type: "study", content: data.text || data.error, mode: "exam_drill" });
      } finally {
        setLoading(false);
        setLoadingLabel("");
      }
      return;
    }

    // ── Evaluate: content is the student's answer ──────────────────────────
    setLoading(true);
    setLoadingLabel("Evaluating...");
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          response1: content,
          response2: "",
          evaluator: "Gemini",
          subject,
        }),
      });
      const data: EvalResult = await res.json();
      if (!res.ok) { setError((data as any).error || "Evaluation failed."); return; }

      addMessage({ role: "assistant", type: "eval", result: data, answer: content });
      setLastResult(data);
      setPhase("has_eval");

      // save weakness data
      fetch("/api/weakness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, scores: data.breakdown, improvements: data.improvements }),
      });

      // silent trust guard
      setLoadingLabel("Verifying reliability...");
      const trust = await runSilentTrust(question, content, subject);
      if (trust && trust.hallucinationRisk > 30) {
        setMessages((prev) =>
          prev.map((m, i) =>
            i === prev.length - 1 && m.role === "assistant" && m.type === "eval"
              ? { ...m, trust }
              : m
          ) as Message[]
        );
      }
    } finally {
      setLoading(false);
      setLoadingLabel("");
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const chips = getChips(phase, lastResult);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0a0a0a", color: "#e5e5e5", fontFamily: "var(--font-geist-sans, sans-serif)" }}>

      {/* ── Header ── */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "0.5px solid #222", background: "#0a0a0a", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em" }}>iStudy AI</span>
          {/* Subject pills */}
          <div style={{ display: "flex", gap: 6 }}>
            {SUBJECTS.map((s) => (
              <button
                key={s}
                onClick={() => setSubject(s)}
                style={{
                  padding: "3px 10px", borderRadius: 20, fontSize: 12, cursor: "pointer", border: "0.5px solid",
                  background: subject === s ? "#2563eb" : "transparent",
                  borderColor: subject === s ? "#2563eb" : "#333",
                  color: subject === s ? "#fff" : "#888",
                  transition: "all 0.15s",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/weakness" style={{ padding: "6px 14px", borderRadius: 10, fontSize: 13, background: "transparent", border: "0.5px solid #333", color: "#aaa", textDecoration: "none" }}>Analytics</Link>
          <Link href="/history" style={{ padding: "6px 14px", borderRadius: 10, fontSize: 13, background: "transparent", border: "0.5px solid #333", color: "#aaa", textDecoration: "none" }}>History</Link>
          <button
            onClick={() => { setMessages([]); setQuestion(""); setPhase("idle"); setLastResult(undefined); setInput(""); }}
            style={{ padding: "6px 14px", borderRadius: 10, fontSize: 13, background: "#1a1a2e", border: "0.5px solid #2563eb", color: "#60a5fa", cursor: "pointer" }}
          >
            New chat
          </button>
        </div>
      </header>

      {/* ── Study mode toolbar ── */}
      <div style={{ display: "flex", gap: 6, padding: "8px 20px", borderBottom: "0.5px solid #1a1a1a", background: "#0d0d0d" }}>
        {STUDY_MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setActiveMode(activeMode === m.key ? null : m.key)}
            title={m.desc}
            style={{
              display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer", border: "0.5px solid", transition: "all 0.15s",
              background: activeMode === m.key ? "#4f46e5" : "transparent",
              borderColor: activeMode === m.key ? "#4f46e5" : "#2a2a2a",
              color: activeMode === m.key ? "#fff" : "#777",
            }}
          >
            <span>{m.icon}</span> {m.label}
          </button>
        ))}
        {activeMode && (
          <span style={{ fontSize: 11, color: "#555", alignSelf: "center", marginLeft: 4 }}>
            — next message uses {activeMode} mode
          </span>
        )}
      </div>

      {/* ── Message thread ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Empty state */}
        {messages.length === 0 && (
          <div style={{ margin: "auto", textAlign: "center", maxWidth: 480, color: "#444" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📚</div>
            <p style={{ fontSize: 16, color: "#666", marginBottom: 8 }}>Paste your exam question to get started.</p>
            <p style={{ fontSize: 13, color: "#444" }}>Or upload an image below — OCR will extract the text automatically.</p>
          </div>
        )}

        {messages.map((msg, i) => {
          if (msg.role === "user") return (
            <div key={i} style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{ maxWidth: "72%", background: "#1a1a2e", border: "0.5px solid #2a2a4a", borderRadius: "16px 16px 4px 16px", padding: "10px 14px", fontSize: 14, lineHeight: 1.6, color: "#d0d0e8", whiteSpace: "pre-wrap" }}>
                {msg.imagePreview && <img src={msg.imagePreview} alt="" style={{ maxHeight: 120, borderRadius: 8, marginBottom: 8, display: "block" }} />}
                {msg.content}
              </div>
            </div>
          );

          if (msg.role === "assistant" && msg.type === "text") return (
            <div key={i} style={{ display: "flex", gap: 10, maxWidth: "80%" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1e1e2e", border: "0.5px solid #333", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, marginTop: 2 }}>A</div>
              <div style={{ background: "#111", border: "0.5px solid #222", borderRadius: "4px 16px 16px 16px", padding: "10px 14px", fontSize: 14, lineHeight: 1.7, color: "#ccc", whiteSpace: "pre-wrap" }}>
                {msg.content}
                {msg.trust && msg.trust.hallucinationRisk > 30 && (
                  <span title={`Hallucination risk: ${msg.trust.hallucinationRisk}% — ${msg.trust.summary}`} style={{ marginLeft: 8, cursor: "help", fontSize: 13 }}>⚠️</span>
                )}
              </div>
            </div>
          );

          if (msg.role === "assistant" && msg.type === "study") return (
            <div key={i} style={{ display: "flex", gap: 10, maxWidth: "80%" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1e1e2e", border: "0.5px solid #333", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, marginTop: 2 }}>A</div>
              <div style={{ background: "#0f0f1a", border: "0.5px solid #2a2a4a", borderRadius: "4px 16px 16px 16px", padding: "12px 16px", fontSize: 14, lineHeight: 1.7, color: "#ccc", whiteSpace: "pre-wrap" }}>
                <span style={{ display: "inline-block", fontSize: 11, background: "#1e1e3a", border: "0.5px solid #3a3a6a", color: "#818cf8", borderRadius: 6, padding: "2px 8px", marginBottom: 8 }}>
                  {STUDY_MODES.find((m) => m.key === msg.mode)?.icon} {STUDY_MODES.find((m) => m.key === msg.mode)?.label}
                </span>
                <div>{msg.content}</div>
              </div>
            </div>
          );

          if (msg.role === "assistant" && msg.type === "eval") {
            const r = msg.result;
            return (
              <div key={i} style={{ display: "flex", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1e1e2e", border: "0.5px solid #333", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, marginTop: 2 }}>A</div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>

                  {/* Score card */}
                  <div style={{ background: "#111", border: "0.5px solid #222", borderRadius: 16, padding: "16px 20px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
                      <div>
                        <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>{r.subject}</div>
                        <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.03em" }}>{r.estimatedScore}</div>
                      </div>
                      <div style={{ fontSize: 13, color: "#999", lineHeight: 1.6, maxWidth: 420 }}>{r.overallCritique}</div>
                    </div>
                    {/* Breakdown bars */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                      {(["knowledge", "application", "analysis", "evaluation"] as const).map((key) => (
                        <div key={key} style={{ background: "#0a0a0a", border: "0.5px solid #1a1a1a", borderRadius: 10, padding: "10px 12px" }}>
                          <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{key}</div>
                          <div style={{ fontSize: 22, fontWeight: 700, color: scoreColor(r.breakdown[key].score) }}>{r.breakdown[key].score}/5</div>
                          <div style={{ marginTop: 6, height: 3, background: "#1a1a1a", borderRadius: 2 }}>
                            <div style={{ height: "100%", borderRadius: 2, background: scoreColor(r.breakdown[key].score), width: `${(r.breakdown[key].score / 5) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Annotation overlay */}
                  {r.annotations?.length > 0 && (
                    <div style={{ background: "#0f0f0f", border: "0.5px solid #1e1e00", borderRadius: 12, padding: "14px 16px" }}>
                      <div style={{ fontSize: 11, color: "#666", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Annotated answer</div>
                      <AnnotationOverlay text={msg.answer} annotations={r.annotations} />
                    </div>
                  )}

                  {/* Improvements */}
                  {r.improvements?.length > 0 && (
                    <div style={{ background: "#0d0d0d", border: "0.5px solid #1a1a1a", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>How to improve</div>
                      {r.improvements.map((imp, j) => (
                        <div key={j} style={{ background: "#0a0a0a", border: "0.5px solid #1e2a1e", borderRadius: 10, padding: "10px 12px" }}>
                          <div style={{ fontSize: 11, color: "#60a5fa", textTransform: "uppercase", marginBottom: 4 }}>{imp.category}</div>
                          <div style={{ fontSize: 13, color: "#f87171", marginBottom: 4 }}>⚠ {imp.defect}</div>
                          <div style={{ fontSize: 13, color: "#4ade80" }}>✓ {imp.fix}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Citations */}
                  {r.citations && r.citations.length > 0 && (
                    <div style={{ background: "#0d0d0d", border: "0.5px solid #1a1a1a", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Sources</div>
                      {r.citations.map((c, j) => (
                        <div key={j} style={{ background: "#0a0a0a", border: "0.5px solid #222", borderRadius: 10, padding: "10px 12px" }}>
                          <div style={{ fontSize: 13, color: "#ccc" }}>"{c.claim}"</div>
                          <div style={{ fontSize: 12, color: "#60a5fa", marginTop: 4 }}>📚 {c.source}</div>
                          <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{c.reference}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Silent trust warning */}
                  {(msg as any).trust && (msg as any).trust.hallucinationRisk > 30 && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "#1a1000", border: "0.5px solid #3a2000", borderRadius: 10, padding: "10px 14px" }}>
                      <span>⚠️</span>
                      <div>
                        <div style={{ fontSize: 12, color: "#facc15", fontWeight: 500, marginBottom: 2 }}>Reliability check flagged</div>
                        <div style={{ fontSize: 12, color: "#888" }}>{(msg as any).trust.summary}</div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            );
          }

          return null;
        })}

        {/* Loading indicator */}
        {loading && (
          <div style={{ display: "flex", gap: 10, maxWidth: "80%" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1e1e2e", border: "0.5px solid #333", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>A</div>
            <div style={{ background: "#111", border: "0.5px solid #222", borderRadius: "4px 16px 16px 16px", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, color: "#555" }}>{loadingLabel || "Thinking..."}</span>
              <span style={{ display: "inline-flex", gap: 3 }}>
                {[0, 1, 2].map((d) => (
                  <span key={d} style={{ width: 4, height: 4, borderRadius: "50%", background: "#444", animation: `pulse 1.2s ${d * 0.2}s infinite` }} />
                ))}
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Option chips ── */}
      {chips.length > 0 && !loading && (
        <div style={{ padding: "8px 20px", display: "flex", gap: 6, flexWrap: "wrap", borderTop: "0.5px solid #1a1a1a" }}>
          {chips.map((chip) => (
            <button
              key={chip}
              onClick={() => send(chip)}
              style={{ padding: "6px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer", background: "transparent", border: "0.5px solid #2a2a2a", color: "#888", transition: "all 0.15s" }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.borderColor = "#4a4a6a"; (e.target as HTMLElement).style.color = "#ccc"; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.borderColor = "#2a2a2a"; (e.target as HTMLElement).style.color = "#888"; }}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div style={{ margin: "0 20px 8px", background: "#1a0a0a", border: "0.5px solid #4a1a1a", borderRadius: 10, padding: "8px 14px", fontSize: 13, color: "#f87171" }}>
          {error}
        </div>
      )}

      {/* ── Input area ── */}
      <div style={{ padding: "12px 20px 20px", borderTop: "0.5px solid #1a1a1a", background: "#0a0a0a" }}>

        {/* Image preview + OCR controls */}
        {imagePreview && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "8px 12px", background: "#111", border: "0.5px solid #222", borderRadius: 10 }}>
            <img src={imagePreview} alt="" style={{ height: 48, borderRadius: 6, objectFit: "cover" }} />
            <div style={{ display: "flex", gap: 6 }}>
              <select
                value={ocrTarget}
                onChange={(e) => setOcrTarget(e.target.value as "question" | "answer")}
                style={{ background: "#0a0a0a", border: "0.5px solid #333", borderRadius: 6, padding: "4px 8px", fontSize: 12, color: "#aaa" }}
              >
                <option value="answer">→ Answer</option>
                <option value="question">→ Question</option>
              </select>
              <button onClick={runOCR} disabled={loading} style={{ padding: "4px 12px", borderRadius: 6, fontSize: 12, background: "#4f46e5", border: "none", color: "#fff", cursor: "pointer" }}>
                Extract
              </button>
              <button onClick={() => { setImageFile(null); setImagePreview(null); }} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, background: "transparent", border: "0.5px solid #333", color: "#666", cursor: "pointer" }}>
                ✕
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", background: "#111", border: "0.5px solid #222", borderRadius: 14, padding: "8px 8px 8px 14px" }}>
          {/* Image upload */}
          <button
            onClick={() => fileRef.current?.click()}
            title="Upload image for OCR"
            style={{ padding: "6px 8px", borderRadius: 8, background: "transparent", border: "0.5px solid #2a2a2a", color: "#555", cursor: "pointer", fontSize: 16, flexShrink: 0, alignSelf: "flex-end", marginBottom: 1 }}
          >
            📎
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setImageFile(f);
            setImagePreview(URL.createObjectURL(f));
          }} style={{ display: "none" }} />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={
              !question
                ? "Paste your exam question here..."
                : phase === "has_question"
                ? "Paste your answer to evaluate, or use a chip above..."
                : "Ask a follow-up question..."
            }
            rows={1}
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none", resize: "none", fontSize: 14, color: "#e5e5e5", lineHeight: 1.6,
              fontFamily: "var(--font-geist-sans, sans-serif)", maxHeight: 160, overflowY: "auto",
            }}
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 160) + "px";
            }}
          />

          {/* Send */}
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            style={{
              padding: "7px 14px", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer", flexShrink: 0, alignSelf: "flex-end",
              background: input.trim() && !loading ? "#2563eb" : "#1a1a1a",
              border: "none", color: input.trim() && !loading ? "#fff" : "#444", transition: "all 0.15s",
            }}
          >
            Send
          </button>
        </div>

        {quoteText && (
          <div style={{ marginTop: 6, fontSize: 11, color: "#555" }}>Quoting: "{quoteText.slice(0, 60)}..."</div>
        )}
        <div style={{ marginTop: 6, fontSize: 11, color: "#333", textAlign: "center" }}>
          Enter to send · Shift+Enter for new line · Select text to quote
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:.3} 50%{opacity:1} }
      `}</style>
    </div>
  );
}

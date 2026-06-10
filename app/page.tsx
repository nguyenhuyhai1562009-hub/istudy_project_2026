"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import AnnotationOverlay from "@/components/AnnotationOverlay";
import TrustPanel from "@/components/TrustPanel";

type Breakdown = { score: number; feedback: string; };
type Annotation = { keyword: string; type: string; context: string; suggestion: string; };
type Improvement = { category: string; defect: string; fix: string; };
type Citation = { claim: string; source: string; reference: string; };

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

const SUBJECTS = ["Economics", "Business", "Physics", "Maths", "History", "Psychology"];
const STUDY_MODES = [
  { key: "socratic", label: "🧭 Guide Me", desc: "Socratic hints" },
  { key: "scaffold", label: "🧱 Base Concepts", desc: "Step by step" },
  { key: "exam_drill", label: "🎯 Exam Drill", desc: "Mark scheme focus" },
];

export default function Home() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [subject, setSubject] = useState("Economics");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrMode, setOcrMode] = useState<"question" | "answer">("answer");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<EvalResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [studyMode, setStudyMode] = useState("socratic");
  const [studyLoading, setStudyLoading] = useState(false);
  const [studyResponse, setStudyResponse] = useState("");

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function runOCR() {
    if (!imageFile) return;
    setLoadingStep("Extracting text from image...");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      const res = await fetch("/api/ocr", { method: "POST", body: formData });
      const data = await res.json();
      if (data.text) {
        if (ocrMode === "answer") setAnswer(data.text);
        else setQuestion(data.text);
        const detectRes = await fetch("/api/detect-subject", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: data.text }),
        });
        const detectData = await detectRes.json();
        if (detectData.subject && SUBJECTS.includes(detectData.subject)) {
          setSubject(detectData.subject);
        }
      } else {
        setError("OCR failed to extract text.");
      }
    } catch {
      setError("OCR request failed.");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  }

  async function runStudyMode() {
    if (!question.trim()) { setError("Please enter a question first."); return; }
    setError("");
    setStudyLoading(true);
    setStudyResponse("");
    try {
      const res = await fetch("/api/study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, subject, mode: studyMode }),
      });
      const data = await res.json();
      if (data.text) setStudyResponse(data.text);
      else setError(data.error || "Study mode failed.");
    } catch {
      setError("Something went wrong.");
    } finally {
      setStudyLoading(false);
    }
  }

  async function runEvaluation() {
    if (!question.trim() || !answer.trim()) {
      setError("Please provide both a question and an answer.");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);
    setLoadingStep("Evaluating with Examiner AI...");
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, response1: answer, response2: "", evaluator: "Gemini", subject }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Evaluation failed."); return; }
      setResult(data);
      await fetch("/api/weakness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, scores: data.breakdown, improvements: data.improvements }),
      });
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  }

  const scoreColor = (s: number) =>
    s >= 4 ? "text-green-400" : s >= 3 ? "text-yellow-400" : "text-red-400";

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto p-6 space-y-6">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">iStudy AI</h1>
            <p className="text-gray-400 mt-1">Upload your answer. Get examiner-level feedback.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/weakness" className="bg-gray-900 border border-gray-800 px-4 py-3 rounded-xl hover:bg-gray-800 transition text-sm">
              Weaknesses
            </Link>
            <Link href="/history" className="bg-gray-900 border border-gray-800 px-4 py-3 rounded-xl hover:bg-gray-800 transition text-sm">
              History
            </Link>
          </div>
        </div>

        {/* INPUT PANEL */}
        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 space-y-5">

          {/* Subject */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Subject</label>
            <div className="flex gap-2 flex-wrap">
              {SUBJECTS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSubject(s)}
                  className={`px-4 py-2 rounded-lg text-sm transition ${
                    subject === s
                      ? "bg-blue-600 text-white"
                      : "bg-black border border-gray-800 text-gray-400 hover:border-gray-600"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Question */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Exam Question</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Paste the exam question here..."
              rows={3}
              className="w-full bg-black border border-gray-800 rounded-xl p-4 resize-none outline-none focus:border-blue-500 text-sm"
            />
          </div>

          {/* Answer */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Your Answer</label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Paste or type your answer here, or upload an image below..."
              rows={5}
              className="w-full bg-black border border-gray-800 rounded-xl p-4 resize-none outline-none focus:border-blue-500 text-sm"
            />
          </div>

          {/* OCR */}
          <div className="border border-dashed border-gray-700 rounded-xl p-4 space-y-3">
            <p className="text-sm text-gray-400">Or upload an image to extract text via OCR</p>
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={ocrMode}
                onChange={(e) => setOcrMode(e.target.value as "question" | "answer")}
                className="bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm"
              >
                <option value="answer">Extract into: Answer</option>
                <option value="question">Extract into: Question</option>
              </select>
              <button
                onClick={() => fileRef.current?.click()}
                className="bg-gray-800 hover:bg-gray-700 transition px-4 py-2 rounded-lg text-sm"
              >
                Choose Image
              </button>
              {imageFile && (
                <button
                  onClick={runOCR}
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-500 transition px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                >
                  Extract Text
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </div>
            {imagePreview && (
              <img src={imagePreview} alt="Preview" className="max-h-48 rounded-lg border border-gray-700 object-contain" />
            )}
          </div>

          {/* Study Mode */}
          <div className="bg-black border border-gray-800 rounded-xl p-4 space-y-3">
            <label className="text-sm text-gray-400 block">Study Mode — learn before submitting</label>
            <div className="flex gap-2 flex-wrap">
              {STUDY_MODES.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setStudyMode(m.key)}
                  className={`px-4 py-2 rounded-lg text-sm transition flex flex-col items-start ${
                    studyMode === m.key
                      ? "bg-purple-600 text-white"
                      : "bg-gray-900 border border-gray-800 text-gray-400 hover:border-gray-600"
                  }`}
                >
                  <span>{m.label}</span>
                  <span className="text-xs opacity-70">{m.desc}</span>
                </button>
              ))}
            </div>
            <button
              onClick={runStudyMode}
              disabled={studyLoading}
              className="bg-purple-700 hover:bg-purple-600 transition px-5 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              {studyLoading ? "Thinking..." : "Ask Study Mode"}
            </button>
            {studyResponse && (
              <div className="bg-[#111111] border border-purple-800/40 rounded-xl p-4 text-gray-200 text-sm leading-7 whitespace-pre-wrap">
                {studyResponse}
              </div>
            )}
          </div>

          <button
            onClick={runEvaluation}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 transition rounded-xl py-3 font-medium disabled:opacity-50"
          >
            {loading ? loadingStep : "Get Examiner Feedback"}
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-2xl p-4 text-sm">{error}</div>
        )}

        {/* RESULT */}
        {result && (
          <div className="space-y-5">

            {/* Score Header */}
            <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{result.subject}</p>
                <p className="text-5xl font-bold mt-1">{result.estimatedScore}</p>
              </div>
              <div className="text-right max-w-sm">
                <p className="text-gray-300 text-sm leading-6">{result.overallCritique}</p>
              </div>
            </div>

            {/* Smart Annotation Overlay */}
            {result.annotations?.length > 0 && answer && (
              <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-1">Smart Annotation Overlay</h3>
                <p className="text-xs text-gray-500 mb-4">Hover over highlighted text to see feedback</p>
                <div className="bg-black border border-gray-800 rounded-xl p-4">
                  <AnnotationOverlay text={answer} annotations={result.annotations} />
                </div>
              </div>
            )}

            {/* Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(["knowledge", "application", "analysis", "evaluation"] as const).map((key) => (
                <div key={key} className="bg-[#111111] border border-gray-800 rounded-2xl p-4">
                  <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">{key}</p>
                  <p className={`text-3xl font-bold ${scoreColor(result.breakdown[key].score)}`}>
                    {result.breakdown[key].score}/5
                  </p>
                  <p className="text-gray-400 text-xs mt-2 leading-5">{result.breakdown[key].feedback}</p>
                </div>
              ))}
            </div>

            {/* Annotations */}
            {result.annotations?.length > 0 && (
              <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 space-y-3">
                <h3 className="text-lg font-semibold mb-1">Annotations</h3>
                {result.annotations.map((a, i) => (
                  <div key={i} className="bg-black border border-yellow-800/40 rounded-xl p-4 space-y-1">
                    <p className="text-yellow-400 text-sm font-medium">"{a.keyword}"</p>
                    <p className="text-gray-400 text-xs">{a.context}</p>
                    <p className="text-gray-200 text-sm">💡 {a.suggestion}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Improvements */}
            {result.improvements?.length > 0 && (
              <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 space-y-3">
                <h3 className="text-lg font-semibold mb-1">How to Improve</h3>
                {result.improvements.map((imp, i) => (
                  <div key={i} className="bg-black border border-blue-800/40 rounded-xl p-4 space-y-2">
                    <p className="text-blue-400 text-xs uppercase tracking-wide font-medium">{imp.category}</p>
                    <p className="text-red-300 text-sm">⚠ {imp.defect}</p>
                    <p className="text-green-300 text-sm">✓ {imp.fix}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Citations */}
            {result.citations && result.citations.length > 0 && (
              <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 space-y-3">
                <h3 className="text-lg font-semibold mb-1">Sources & References</h3>
                {result.citations.map((c, i) => (
                  <div key={i} className="bg-black border border-gray-700 rounded-xl p-4 space-y-1">
                    <p className="text-gray-200 text-sm">"{c.claim}"</p>
                    <p className="text-blue-400 text-xs">📚 {c.source}</p>
                    <p className="text-gray-500 text-xs">{c.reference}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Trust Check */}
            <TrustPanel question={question} answer={answer} subject={subject} />

          </div>
        )}
      </div>
    </main>
  );
}
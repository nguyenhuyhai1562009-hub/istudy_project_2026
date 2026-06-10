"use client";

import Link from "next/link";
import { useState } from "react";

type EvalResult = {
  agreements?: string[];
  contradictions?: string[];
  hallucinationRisk?: {
    response1: number;
    response2: number;
  };
  reliabilityScore?: {
    response1: number;
    response2: number;
  };
  bestAnswer?: "response1" | "response2" | "mixed";
  finalSynthesis?: string;
};

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export default function Home() {
  const [question, setQuestion] = useState("");
  const [model1, setModel1] = useState("ChatGPT");
  const [model2, setModel2] = useState("Gemini");
  const [evaluator, setEvaluator] = useState("Gemini");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [error, setError] = useState("");
  const [ai1, setAi1] = useState("");
  const [ai2, setAi2] = useState("");
  const [result, setResult] = useState<EvalResult | null>(null);

  async function generateEvaluation() {
    if (loading) return;
    if (!question.trim()) {
      setError("Please enter a question.");
      return;
    }

    try {
      setError("");
      setLoading(true);
      setResult(null);

      // RESPONSE 1
      setLoadingStep(`Generating ${model1} response...`);
      const response1Request = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: question, model: model1 }),
      });
      const response1Data = await response1Request.json();
      const r1 = response1Data.text;
      setAi1(r1);

      // DELAY between requests
      await delay(3000);

      // RESPONSE 2
      setLoadingStep(`Generating ${model2} response...`);
      const response2Request = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: question, model: model2 }),
      });
      const response2Data = await response2Request.json();
      const r2 = response2Data.text;
      setAi2(r2);

      // DELAY before evaluation
      await delay(3000);

      // EVALUATION
      setLoadingStep("Evaluating responses...");
      const evaluationRequest = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, response1: r1, response2: r2, evaluator }),
      });
      const evaluationData = await evaluationRequest.json();

      if (!evaluationRequest.ok) {
        console.error("FULL ERROR:", evaluationData);
        setError(JSON.stringify(evaluationData, null, 2));
        setLoading(false);
        return;
      }

      setResult(evaluationData);
    } catch (error) {
      console.error(error);
      setError("Something went wrong.");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto p-6 space-y-6">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Multi-Model AI Evaluation System</h1>
            <p className="text-gray-400 mt-2">Compare, evaluate, verify, and synthesize AI-generated responses.</p>
          </div>
          <Link href="/history" className="bg-gray-900 border border-gray-800 px-5 py-3 rounded-xl hover:bg-gray-800 transition">
            History
          </Link>
        </div>

        {/* INPUT PANEL */}
        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 space-y-5">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question for AI evaluation..."
            rows={4}
            className="w-full bg-black border border-gray-800 rounded-xl p-4 resize-none outline-none focus:border-blue-500"
          />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select value={model1} onChange={(e) => setModel1(e.target.value)} className="bg-black border border-gray-800 rounded-xl p-3">
              <option>ChatGPT</option>
              <option>Gemini</option>
            </select>
            <select value={model2} onChange={(e) => setModel2(e.target.value)} className="bg-black border border-gray-800 rounded-xl p-3">
              <option>Gemini</option>
              <option>ChatGPT</option>
            </select>
            <select value={evaluator} onChange={(e) => setEvaluator(e.target.value)} className="bg-black border border-gray-800 rounded-xl p-3">
              <option>Gemini</option>
              <option>ChatGPT</option>
            </select>
            <button
              onClick={generateEvaluation}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 transition rounded-xl px-6 py-3 font-medium disabled:opacity-50"
            >
              {loading ? "Running..." : "Compare"}
            </button>
          </div>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="bg-blue-900/20 border border-blue-700 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <p>{loadingStep}</p>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-2xl p-5">{error}</div>
        )}

        {/* AI RESPONSES */}
        {(ai1 || ai2) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#111111] border border-gray-800 rounded-2xl p-5">
              <div className="flex justify-between mb-4">
                <h2 className="text-xl font-semibold">{model1}</h2>
                {result?.bestAnswer === "response1" && (
                  <span className="bg-green-600 text-xs px-3 py-1 rounded-full">Best</span>
                )}
              </div>
              <p className="text-gray-300 leading-7 text-sm">{ai1}</p>
            </div>
            <div className="bg-[#111111] border border-gray-800 rounded-2xl p-5">
              <div className="flex justify-between mb-4">
                <h2 className="text-xl font-semibold">{model2}</h2>
                {result?.bestAnswer === "response2" && (
                  <span className="bg-green-600 text-xs px-3 py-1 rounded-full">Best</span>
                )}
              </div>
              <p className="text-gray-300 leading-7 text-sm">{ai2}</p>
            </div>
          </div>
        )}

        {/* EVALUATION */}
        {result && (
          <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">AI Evaluation Report</h2>
              <div className="bg-blue-600/20 border border-blue-500 text-blue-300 px-4 py-2 rounded-full text-sm">
                Evaluated by {evaluator}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {([{ label: model1, key: "response1" }, { label: model2, key: "response2" }] as const).map(({ label, key }) => (
                <div key={key} className="bg-black border border-gray-800 rounded-2xl p-5 space-y-5">
                  <h3 className="text-lg font-semibold">{label}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Reliability</span>
                      <span>{result.reliabilityScore?.[key] ?? 0}%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: `${result.reliabilityScore?.[key] ?? 0}%` }} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Hallucination Risk</span>
                      <span>{result.hallucinationRisk?.[key] ?? 0}%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500" style={{ width: `${result.hallucinationRisk?.[key] ?? 0}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-4">Agreements</h3>
              <div className="space-y-3">
                {(result.agreements || []).map((item, index) => (
                  <div key={index} className="bg-black border border-gray-800 rounded-xl p-4 text-gray-300">• {item}</div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-4">Contradictions</h3>
              <div className="space-y-3">
                {(result.contradictions || []).map((item, index) => (
                  <div key={index} className="bg-black border border-gray-800 rounded-xl p-4 text-gray-300">• {item}</div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-900/30 to-emerald-800/10 border border-green-700 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-4">Final Synthesized Answer</h2>
              <p className="text-gray-100 leading-8">{result.finalSynthesis}</p>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}

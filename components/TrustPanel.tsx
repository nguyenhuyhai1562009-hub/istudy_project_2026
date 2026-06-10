"use client";

import { useState } from "react";

type Claim = {
  claim: string;
  verdict: "Accurate" | "Uncertain" | "Incorrect";
  explanation: string;
  severity: "low" | "medium" | "high";
};

type TrustResult = {
  overallReliability: string;
  reliabilityScore: number;
  hallucinationRisk: number;
  trustLabel: string;
  claims: Claim[];
  verificationSuggestions: string[];
  summary: string;
};

type Props = {
  question: string;
  answer: string;
  subject: string;
};

const VERDICT_COLORS: Record<string, string> = {
  Accurate: "text-green-400 border-green-800/40",
  Uncertain: "text-yellow-400 border-yellow-800/40",
  Incorrect: "text-red-400 border-red-800/40",
};

const TRUST_COLORS: Record<string, string> = {
  "High Trust": "text-green-400 border-green-700",
  "Medium Trust": "text-yellow-400 border-yellow-700",
  "Low Trust": "text-red-400 border-red-700",
};

export default function TrustPanel({ question, answer, subject }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrustResult | null>(null);
  const [error, setError] = useState("");

  async function runTrustCheck() {
    if (!answer.trim()) { setError("No answer to check."); return; }
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/trust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer, subject }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Trust check failed."); return; }
      setResult(data);
    } catch {
      setError("Request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Trust Check & Reliability</h3>
          <p className="text-gray-500 text-xs mt-1">Analyze factual accuracy and hallucination risk</p>
        </div>
        <button
          onClick={runTrustCheck}
          disabled={loading}
          className="bg-orange-600 hover:bg-orange-500 transition px-5 py-2 rounded-xl text-sm disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Run Trust Check"}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {result && (
        <div className="space-y-4">
          {/* Score summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-black border border-gray-800 rounded-xl p-4 text-center">
              <p className="text-gray-500 text-xs mb-1">Reliability</p>
              <p className="text-2xl font-bold text-green-400">{result.reliabilityScore}%</p>
            </div>
            <div className="bg-black border border-gray-800 rounded-xl p-4 text-center">
              <p className="text-gray-500 text-xs mb-1">Hallucination Risk</p>
              <p className="text-2xl font-bold text-red-400">{result.hallucinationRisk}%</p>
            </div>
            <div className={`bg-black border rounded-xl p-4 text-center ${TRUST_COLORS[result.trustLabel] || "border-gray-800 text-gray-400"}`}>
              <p className="text-gray-500 text-xs mb-1">Trust Label</p>
              <p className="text-sm font-bold">{result.trustLabel}</p>
            </div>
          </div>

          {/* Summary */}
          <p className="text-gray-300 text-sm leading-6">{result.summary}</p>

          {/* Claims */}
          {result.claims?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Claim Analysis</p>
              {result.claims.map((c, i) => (
                <div key={i} className={`bg-black border rounded-xl p-4 space-y-1 ${VERDICT_COLORS[c.verdict] || "border-gray-800"}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-gray-200 text-sm">"{c.claim}"</p>
                    <span className={`text-xs font-medium ml-3 shrink-0 ${VERDICT_COLORS[c.verdict]?.split(" ")[0]}`}>
                      {c.verdict}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs leading-5">{c.explanation}</p>
                </div>
              ))}
            </div>
          )}

          {/* Verification suggestions */}
          {result.verificationSuggestions?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide">How to Verify</p>
              {result.verificationSuggestions.map((s, i) => (
                <div key={i} className="bg-black border border-gray-800 rounded-xl p-3 text-gray-400 text-xs">
                  → {s}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
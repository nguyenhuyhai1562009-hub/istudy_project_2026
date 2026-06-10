import { kv } from "@vercel/kv";
import Link from "next/link";

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

type HistoryItem = {
  id: number;
  question: string;
  response1: string;
  subject: string;
  result: EvalResult;
  createdAt: string;
};

const scoreColor = (s: number) =>
  s >= 4 ? "text-green-400" : s >= 3 ? "text-yellow-400" : "text-red-400";

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const history = await kv.lrange<HistoryItem>("history", 0, -1);
  const item = history?.find((h) => String(h.id) === id);

  if (!item) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-gray-400">Result not found.</p>
          <Link href="/history" className="bg-blue-600 hover:bg-blue-500 transition px-5 py-3 rounded-xl text-sm">
            Back to History
          </Link>
        </div>
      </main>
    );
  }

  const { result, question, response1, subject, createdAt } = item;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto p-6 space-y-6">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs mb-1">{new Date(createdAt).toLocaleString()}</p>
            <h1 className="text-3xl font-bold line-clamp-2">{question}</h1>
          </div>
          <Link href="/history" className="bg-gray-900 border border-gray-800 px-4 py-3 rounded-xl hover:bg-gray-800 transition text-sm shrink-0">
            Back
          </Link>
        </div>

        {/* Score Header */}
        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">{subject}</p>
            <p className="text-5xl font-bold mt-1">{result.estimatedScore}</p>
          </div>
          <div className="text-right max-w-sm">
            <p className="text-gray-300 text-sm leading-6">{result.overallCritique}</p>
          </div>
        </div>

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

        {/* Student Answer */}
        {response1 && (
          <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-3">Student Answer</h3>
            <p className="text-gray-300 text-sm leading-7 whitespace-pre-wrap">{response1}</p>
          </div>
        )}

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

      </div>
    </main>
  );
}
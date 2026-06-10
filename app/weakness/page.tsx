"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
  knowledge: "bg-blue-500",
  application: "bg-purple-500",
  analysis: "bg-yellow-500",
  evaluation: "bg-red-500",
};

export default function WeaknessPage() {
  const [summary, setSummary] = useState<Record<string, SubjectSummary>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/weakness")
      .then((res) => res.json())
      .then((data) => { setSummary(data); setLoading(false); });
  }, []);

  const subjects = Object.keys(summary);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">Weakness Detection</h1>
            <p className="text-gray-400 mt-2">Your knowledge gaps across subjects.</p>
          </div>
          <Link href="/" className="bg-blue-600 hover:bg-blue-500 transition px-5 py-3 rounded-xl text-sm">
            New Evaluation
          </Link>
        </div>

        {loading && <p className="text-gray-500">Loading...</p>}

        {!loading && subjects.length === 0 && (
          <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 text-gray-500">
            No data yet. Complete some evaluations first.
          </div>
        )}

        <div className="space-y-5">
          {subjects.map((subject) => {
            const data = summary[subject];
            const weakest = Object.entries(data.averages).sort((a, b) => a[1] - b[1])[0];

            return (
              <div key={subject} className="bg-[#111111] border border-gray-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold capitalize">{subject}</h2>
                    <p className="text-gray-500 text-sm">{data.sessions} session{data.sessions > 1 ? "s" : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">Weakest area</p>
                    <span className="text-red-400 text-sm font-medium capitalize">{weakest[0]} ({weakest[1]}/5)</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {(["knowledge", "application", "analysis", "evaluation"] as const).map((key) => (
                    <div key={key}>
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span className="capitalize">{key}</span>
                        <span>{data.averages[key]}/5</span>
                      </div>
                      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${LAYER_COLORS[key]}`}
                          style={{ width: `${(data.averages[key] / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {data.recentDefects.length > 0 && (
                  <div className="mt-4 flex gap-2 flex-wrap">
                    {[...new Set(data.recentDefects)].map((d, i) => (
                      <span key={i} className="text-xs bg-red-900/30 border border-red-800/50 text-red-300 px-2 py-1 rounded-lg">
                        {d}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
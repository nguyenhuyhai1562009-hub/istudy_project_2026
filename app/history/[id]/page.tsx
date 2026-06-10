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
  };
  createdAt: string;
};

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    fetch("/api/history")
      .then((res) => res.json())
      .then((data) => setHistory(Array.isArray(data) ? data : []));
  }, []);

  const deleteChat = async (id: number) => {
    await fetch(`/api/history/${id}`, { method: "DELETE" });
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const clearAll = async () => {
    await fetch("/api/history/clear", { method: "POST" });
    setHistory([]);
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">History</h1>
            <p className="text-gray-400 mt-2">Your saved evaluations.</p>
          </div>
          <div className="flex gap-3">
            {history.length > 0 && (
              <button
                onClick={clearAll}
                className="bg-red-900/40 border border-red-800 hover:bg-red-900 transition px-4 py-3 rounded-xl text-sm"
              >
                Clear All
              </button>
            )}
            <Link href="/" className="bg-blue-600 hover:bg-blue-500 transition px-5 py-3 rounded-xl text-sm">
              New Chat
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          {history.length === 0 && (
            <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 text-gray-500">
              No saved evaluations yet.
            </div>
          )}
          {history.map((item) => (
            <div key={item.id} className="bg-[#111111] border border-gray-800 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {item.subject && (
                      <span className="text-xs bg-blue-900/40 border border-blue-800 text-blue-300 px-2 py-1 rounded-lg">
                        {item.subject}
                      </span>
                    )}
                    {item.result?.estimatedScore && (
                      <span className="text-xs bg-green-900/40 border border-green-800 text-green-300 px-2 py-1 rounded-lg">
                        {item.result.estimatedScore}
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-semibold mb-2 text-gray-100 line-clamp-2">{item.question}</h2>
                  <p className="text-gray-400 text-sm leading-6 line-clamp-3">{item.result?.overallCritique}</p>
                  <p className="text-gray-600 text-xs mt-3">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => deleteChat(item.id)}
                  className="bg-red-600 hover:bg-red-500 transition px-4 py-2 rounded-xl text-sm"
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
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type HistoryItem = {
  id: number;

  question: string;

  result: {
    finalSynthesis: string;
  };

  createdAt: string;
};

export default function HistoryPage() {

  const [history, setHistory] =
    useState<HistoryItem[]>([]);

  useEffect(() => {

    fetch("/api/history")
      .then((res) => res.json())
      .then((data) => {

        setHistory(data);

      });

  }, []);

  const deleteChat =
    async (id: number) => {

      await fetch(
        `/api/history/delete/${id}`,
        {
          method: "DELETE",
        }
      );

      setHistory((prev) =>
        prev.filter(
          (item) =>
            item.id !== id
        )
      );

    };

  return (
    <main className="min-h-screen bg-black text-white">

      <div className="max-w-5xl mx-auto p-6">

        <div className="flex items-center justify-between mb-8">

          <div>

            <h1 className="text-5xl font-bold">
              History
            </h1>

            <p className="text-gray-400 mt-2">
              Saved AI evaluations.
            </p>

          </div>

          <Link
            href="/"
            className="
              bg-blue-600
              hover:bg-blue-500
              transition
              px-5
              py-3
              rounded-xl
            "
          >
            New Chat
          </Link>

        </div>

        <div className="space-y-4">

          {history.length === 0 && (

            <div className="
              bg-[#111111]
              border
              border-gray-800
              rounded-2xl
              p-6
              text-gray-500
            ">
              No saved chats.
            </div>

          )}

          {history.map((item) => (

            <div
              key={item.id}
              className="
                bg-[#111111]
                border
                border-gray-800
                rounded-2xl
                p-6
              "
            >

              <h2 className="text-xl font-semibold mb-3">
                {item.question}
              </h2>

              <p className="text-gray-300 leading-7">
                {item.result?.finalSynthesis}
              </p>

              <div className="mt-4 text-sm text-gray-500">
                {new Date(
                  item.createdAt
                ).toLocaleString()}
              </div>

              <div className="mt-5 flex gap-3">

                <Link
                  href={`/result/${item.id}`}
                  className="
                    bg-blue-600
                    hover:bg-blue-500
                    transition
                    px-4
                    py-2
                    rounded-xl
                    text-sm
                  "
                >
                  Open
                </Link>

                <button
                  onClick={() =>
                    deleteChat(item.id)
                  }
                  className="
                    bg-red-600
                    hover:bg-red-500
                    transition
                    px-4
                    py-2
                    rounded-xl
                    text-sm
                  "
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
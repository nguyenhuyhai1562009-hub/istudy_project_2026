"use client";

import Link from "next/link";

import {
  useEffect,
  useState,
} from "react";

type HistoryItem = {
  id: number;

  question: string;

  createdAt: string;

  evaluator: string;

  result?: {
    bestAnswer?: string;
    finalSynthesis?: string;
  };
};

export default function HistoryPage() {

  const [history, setHistory] =
    useState<HistoryItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  // --------------------
  // FETCH HISTORY
  // --------------------

  async function fetchHistory() {

    try {

      const res = await fetch(
        "/api/history"
      );

      const data =
        await res.json();

      console.log(data);

      setHistory(data);

    } catch (error) {

      console.error(error);

    } finally {

      setLoading(false);

    }

  }

  useEffect(() => {

    fetchHistory();

  }, []);

  // --------------------
  // DELETE ONE CHAT
  // --------------------

  async function deleteChat(
    id: number
  ) {

    try {

      await fetch(
        `/api/history/${id}`,
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

    } catch (error) {

      console.error(error);

    }

  }

  return (

    <main className="
      min-h-screen
      bg-black
      text-white
    ">

      <div className="
        max-w-6xl
        mx-auto
        p-6
        space-y-6
      ">

        {/* HEADER */}

        <div className="
          flex
          justify-between
          items-center
        ">

          <div>

            <h1 className="
              text-4xl
              font-bold
            ">
              History
            </h1>

            <p className="
              text-gray-400
              mt-2
            ">
              Saved AI evaluations.
            </p>

          </div>
        </div>

        {/* LOADING */}

        {loading && (

          <div className="
            bg-[#111111]
            border
            border-gray-800
            rounded-2xl
            p-6
          ">
            Loading...
          </div>

        )}

        {/* EMPTY */}

        {!loading &&
          history.length === 0 && (

          <div className="
            bg-[#111111]
            border
            border-gray-800
            rounded-2xl
            p-10
            text-center
          ">

            <h2 className="
              text-2xl
              font-semibold
            ">
              No Chats Found
            </h2>

          </div>

        )}

        {/* HISTORY */}

        <div className="
          space-y-4
        ">

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

              <div className="
                flex
                justify-between
                gap-6
                flex-wrap
              ">

                {/* LEFT */}

                <div className="
                  flex-1
                  space-y-4
                ">

                  <div className="
                    flex
                    gap-3
                    flex-wrap
                  ">

                    <div className="
                      bg-blue-600/20
                      border
                      border-blue-500
                      text-blue-300
                      text-xs
                      px-3
                      py-1
                      rounded-full
                    ">
                      {
                        item.evaluator
                      }
                    </div>

                    <div className="
                      bg-green-600/20
                      border
                      border-green-500
                      text-green-300
                      text-xs
                      px-3
                      py-1
                      rounded-full
                    ">
                      {
                        item.result
                          ?.bestAnswer
                      }
                    </div>

                  </div>

                  <h2 className="
                    text-xl
                    font-semibold
                  ">
                    {
                      item.question
                    }
                  </h2>

                  <p className="
                    text-gray-400
                    text-sm
                    leading-7
                  ">
                    {
                      item.result
                        ?.finalSynthesis
                    }
                  </p>

                  <p className="
                    text-gray-600
                    text-xs
                  ">
                    {
                      new Date(
                        item.createdAt
                      ).toLocaleString()
                    }
                  </p>

                </div>

                {/* BUTTONS */}

                <div className="
                  flex
                  items-center
                  gap-3
                ">

                  <Link
                    href={`/result/${item.id}`}
                    className="
                      bg-blue-600
                      hover:bg-blue-500
                      transition
                      px-5
                      py-3
                      rounded-xl
                      text-sm
                      font-medium
                    "
                  >
                    Open Chat
                  </Link>

                  <button
                    onClick={() =>
                      deleteChat(
                        item.id
                      )
                    }
                    className="
                      bg-red-600
                      hover:bg-red-500
                      transition
                      px-5
                      py-3
                      rounded-xl
                      text-sm
                      font-medium
                    "
                  >
                    Delete
                  </button>

                </div>

              </div>

            </div>

          ))}

        </div>

      </div>

    </main>

  );

}
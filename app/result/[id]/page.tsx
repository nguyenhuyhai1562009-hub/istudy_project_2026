import fs from "fs";
import path from "path";

import Link from "next/link";

type PageProps = {
  params: {
    id: string;
  };
};

export default function ResultPage({
  params,
}: PageProps) {

  const filePath = path.join(
    process.cwd(),
    "data",
    "history.json"
  );

  // --------------------
  // FILE CHECK
  // --------------------

  if (!fs.existsSync(filePath)) {

    return (

      <main className="
        min-h-screen
        bg-black
        text-white
        p-10
      ">

        <div className="
          max-w-3xl
          mx-auto
          bg-[#111111]
          border
          border-gray-800
          rounded-2xl
          p-8
        ">

          <h1 className="text-3xl font-bold">
            History Not Found
          </h1>

        </div>

      </main>

    );

  }

  // --------------------
  // LOAD HISTORY
  // --------------------

  const raw = fs.readFileSync(
    filePath,
    "utf-8"
  );

  const history = JSON.parse(
    raw || "[]"
  );

  // --------------------
  // FIND ITEM
  // --------------------

  const item = history.find(
    (entry: any) =>
      String(entry.id) === params.id
  );

  if (!item) {

    return (

      <main className="
        min-h-screen
        bg-black
        text-white
        p-10
      ">

        <div className="
          max-w-3xl
          mx-auto
          bg-[#111111]
          border
          border-gray-800
          rounded-2xl
          p-8
        ">

          <h1 className="text-3xl font-bold">
            Result Not Found
          </h1>

        </div>

      </main>

    );

  }

  // --------------------
  // SAFE RESULT
  // --------------------

  const result = item.result || {};

  const agreements =
    result.agreements || [];

  const contradictions =
    result.contradictions || [];

  // --------------------
  // UI
  // --------------------

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
          items-center
          justify-between
        ">

          <div>

            <h1 className="
              text-4xl
              font-bold
            ">
              Saved Evaluation
            </h1>

            <p className="
              text-gray-400
              mt-2
            ">
              Detailed AI comparison report.
            </p>

          </div>

          <Link
            href="/history"
            className="
              bg-gray-900
              border
              border-gray-800
              px-5
              py-3
              rounded-xl
              hover:bg-gray-800
              transition
            "
          >
            Back
          </Link>

        </div>

        {/* QUESTION */}

        <div className="
          bg-[#111111]
          border
          border-gray-800
          rounded-2xl
          p-6
        ">

          <h2 className="
            text-2xl
            font-bold
            mb-4
          ">
            Question
          </h2>

          <p className="
            text-gray-300
            leading-8
          ">
            {item.question}
          </p>

        </div>

        {/* RESPONSES */}

        <div className="
          grid
          grid-cols-1
          md:grid-cols-2
          gap-4
        ">

          {/* RESPONSE 1 */}

          <div className="
            bg-[#111111]
            border
            border-gray-800
            rounded-2xl
            p-6
          ">

            <h2 className="
              text-2xl
              font-semibold
              mb-4
            ">
              Response 1
            </h2>

            <p className="
              text-gray-300
              leading-8
              text-sm
            ">
              {item.response1}
            </p>

          </div>

          {/* RESPONSE 2 */}

          <div className="
            bg-[#111111]
            border
            border-gray-800
            rounded-2xl
            p-6
          ">

            <h2 className="
              text-2xl
              font-semibold
              mb-4
            ">
              Response 2
            </h2>

            <p className="
              text-gray-300
              leading-8
              text-sm
            ">
              {item.response2}
            </p>

          </div>

        </div>

        {/* AGREEMENTS */}

        <div className="
          bg-[#111111]
          border
          border-gray-800
          rounded-2xl
          p-6
        ">

          <h2 className="
            text-2xl
            font-bold
            mb-4
          ">
            Agreements
          </h2>

          <div className="space-y-3">

            {agreements.length === 0 && (

              <div className="
                text-gray-500
              ">
                No agreements found.
              </div>

            )}

            {agreements.map(
              (
                agreement: string,
                index: number
              ) => (

                <div
                  key={index}
                  className="
                    bg-black
                    border
                    border-gray-800
                    rounded-xl
                    p-4
                    text-sm
                  "
                >
                  • {agreement}
                </div>

              )
            )}

          </div>

        </div>

        {/* CONTRADICTIONS */}

        <div className="
          bg-[#111111]
          border
          border-gray-800
          rounded-2xl
          p-6
        ">

          <h2 className="
            text-2xl
            font-bold
            mb-4
          ">
            Contradictions
          </h2>

          <div className="space-y-3">

            {contradictions.length === 0 && (

              <div className="
                text-gray-500
              ">
                No contradictions found.
              </div>

            )}

            {contradictions.map(
              (
                contradiction: string,
                index: number
              ) => (

                <div
                  key={index}
                  className="
                    bg-black
                    border
                    border-gray-800
                    rounded-xl
                    p-4
                    text-sm
                  "
                >
                  • {contradiction}
                </div>

              )
            )}

          </div>

        </div>

        {/* FINAL SYNTHESIS */}

        <div className="
          bg-gradient-to-br
          from-green-900/30
          to-emerald-800/10
          border
          border-green-700
          rounded-2xl
          p-6
        ">

          <h2 className="
            text-2xl
            font-bold
            mb-4
          ">
            Final Synthesized Answer
          </h2>

          <p className="
            text-gray-100
            leading-8
          ">
            {
              result.finalSynthesis ||
              "No synthesis available."
            }
          </p>

        </div>

      </div>

    </main>

  );

}
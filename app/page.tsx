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

export default function Home() {

  const [question, setQuestion] =
    useState("");

  const [model1, setModel1] =
    useState("ChatGPT");

  const [model2, setModel2] =
    useState("Gemini");

  const [evaluator, setEvaluator] =
    useState("Gemini");

  const [loading, setLoading] =
    useState(false);

  const [loadingStep, setLoadingStep] =
    useState("");

  const [error, setError] =
    useState("");

  const [ai1, setAi1] =
    useState("");

  const [ai2, setAi2] =
    useState("");

  const [result, setResult] =
    useState<EvalResult | null>(null);

  // ------------------------
  // GENERATE
  // ------------------------

  async function generateEvaluation() {

    if (!question.trim()) {

      setError(
        "Please enter a question."
      );

      return;

    }

    try {

      setLoading(true);

      setError("");

      setResult(null);

      // ------------------------
      // MOCK AI RESPONSES
      // ------------------------

      setLoadingStep(
        "Generating AI responses..."
      );

      const response1 = `
${model1} response:
Artificial Intelligence is a system capable of reasoning, learning, and processing information.
`;

      const response2 = `
${model2} response:
AI refers to machines simulating human intelligence and problem-solving abilities.
`;

      setAi1(response1);

      setAi2(response2);

      // ------------------------
      // EVALUATION
      // ------------------------

      setLoadingStep(
        `Evaluating with ${evaluator}...`
      );

      const res = await fetch(
        "/api/evaluate",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({

            question,

            response1,

            response2,

            evaluator,

          }),
        }
      );

      const data =
        await res.json();

      setLoadingStep(
        "Synthesizing final answer..."
      );

      setResult(data);

    } catch (err) {

      console.error(err);

      setError(
        "Evaluation failed."
      );

    } finally {

      setLoading(false);

      setLoadingStep("");

    }

  }

  return (

    <main className="min-h-screen bg-black text-white">

      <div className="max-w-7xl mx-auto p-6 space-y-6">

        {/* ------------------------ */}
        {/* HEADER */}
        {/* ------------------------ */}

        <div className="flex items-center justify-between">

          <div>

            <h1 className="text-4xl font-bold">
              Multi-Model AI
              Evaluation System
            </h1>

            <p className="text-gray-400 mt-2">
              Compare, evaluate,
              verify, and synthesize
              AI-generated responses.
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
            History
          </Link>

        </div>

        {/* ------------------------ */}
        {/* INPUT PANEL */}
        {/* ------------------------ */}

        <div
          className="
            bg-[#111111]
            border
            border-gray-800
            rounded-2xl
            p-6
            space-y-5
          "
        >

          {/* QUESTION */}

          <textarea
            value={question}

            onChange={(e) =>
              setQuestion(
                e.target.value
              )
            }

            placeholder="
Ask a question for AI evaluation...
"

            rows={4}

            className="
              w-full
              bg-black
              border
              border-gray-800
              rounded-xl
              p-4
              resize-none
              outline-none
              focus:border-blue-500
            "
          />

          {/* SELECTORS */}

          <div className="
            grid
            grid-cols-1
            md:grid-cols-4
            gap-4
          ">

            {/* MODEL 1 */}

            <select
              value={model1}

              onChange={(e) =>
                setModel1(
                  e.target.value
                )
              }

              className="
                bg-black
                border
                border-gray-800
                rounded-xl
                p-3
              "
            >
              <option>
                ChatGPT
              </option>

              <option>
                Gemini
              </option>

            </select>

            {/* MODEL 2 */}

            <select
              value={model2}

              onChange={(e) =>
                setModel2(
                  e.target.value
                )
              }

              className="
                bg-black
                border
                border-gray-800
                rounded-xl
                p-3
              "
            >
              <option>
                Gemini
              </option>

              <option>
                ChatGPT
              </option>

            </select>

            {/* EVALUATOR */}

            <select
              value={evaluator}

              onChange={(e) =>
                setEvaluator(
                  e.target.value
                )
              }

              className="
                bg-black
                border
                border-gray-800
                rounded-xl
                p-3
              "
            >
              <option>
                Gemini
              </option>

              <option>
                ChatGPT
              </option>

            </select>

            {/* BUTTON */}

            <button

              onClick={
                generateEvaluation
              }

              disabled={loading}

              className="
                bg-blue-600
                hover:bg-blue-500
                transition
                rounded-xl
                px-6
                py-3
                font-medium
                disabled:opacity-50
              "
            >
              {loading
                ? "Running..."
                : "Compare"}
            </button>

          </div>

        </div>

        {/* ------------------------ */}
        {/* LOADING */}
        {/* ------------------------ */}

        {loading && (

          <div
            className="
              bg-blue-900/20
              border
              border-blue-700
              rounded-2xl
              p-5
              flex
              items-center
              gap-4
            "
          >

            <div
              className="
                w-5
                h-5
                border-2
                border-white
                border-t-transparent
                rounded-full
                animate-spin
              "
            />

            <p>
              {loadingStep}
            </p>

          </div>

        )}

        {/* ------------------------ */}
        {/* ERROR */}
        {/* ------------------------ */}

        {error && (

          <div
            className="
              bg-red-900/20
              border
              border-red-700
              rounded-2xl
              p-5
            "
          >
            {error}
          </div>

        )}

        {/* ------------------------ */}
        {/* AI RESPONSES */}
        {/* ------------------------ */}

        {(ai1 || ai2) && (

          <div className="
            grid
            grid-cols-1
            md:grid-cols-2
            gap-4
          ">

            {/* RESPONSE 1 */}

            <div
              className="
                bg-[#111111]
                border
                border-gray-800
                rounded-2xl
                p-5
              "
            >

              <div className="
                flex
                justify-between
                mb-4
              ">

                <h2 className="
                  text-xl
                  font-semibold
                ">
                  {model1}
                </h2>

                {result?.bestAnswer ===
                  "response1" && (

                  <span
                    className="
                      bg-green-600
                      text-xs
                      px-3
                      py-1
                      rounded-full
                    "
                  >
                    Best
                  </span>

                )}

              </div>

              <p className="
                text-gray-300
                leading-7
                text-sm
              ">
                {ai1}
              </p>

            </div>

            {/* RESPONSE 2 */}

            <div
              className="
                bg-[#111111]
                border
                border-gray-800
                rounded-2xl
                p-5
              "
            >

              <div className="
                flex
                justify-between
                mb-4
              ">

                <h2 className="
                  text-xl
                  font-semibold
                ">
                  {model2}
                </h2>

                {result?.bestAnswer ===
                  "response2" && (

                  <span
                    className="
                      bg-green-600
                      text-xs
                      px-3
                      py-1
                      rounded-full
                    "
                  >
                    Best
                  </span>

                )}

              </div>

              <p className="
                text-gray-300
                leading-7
                text-sm
              ">
                {ai2}
              </p>

            </div>

          </div>

        )}

        {/* ------------------------ */}
        {/* EVALUATION */}
        {/* ------------------------ */}

        {result && (

          <div
            className="
              bg-[#111111]
              border
              border-gray-800
              rounded-2xl
              p-6
              space-y-8
            "
          >

            {/* HEADER */}

            <div className="
              flex
              items-center
              justify-between
            ">

              <h2 className="
                text-2xl
                font-bold
              ">
                AI Evaluation Report
              </h2>

              <div
                className="
                  bg-blue-600/20
                  border
                  border-blue-500
                  text-blue-300
                  px-4
                  py-2
                  rounded-full
                  text-sm
                "
              >
                Evaluated by
                {" "}
                {evaluator}
              </div>

            </div>

            {/* SCORE SECTION */}

            <div className="
              grid
              grid-cols-1
              md:grid-cols-2
              gap-4
            ">

              {/* MODEL 1 */}

              <div
                className="
                  bg-black
                  border
                  border-gray-800
                  rounded-2xl
                  p-5
                  space-y-5
                "
              >

                <h3 className="
                  text-lg
                  font-semibold
                ">
                  {model1}
                </h3>

                {/* RELIABILITY */}

                <div className="
                  space-y-2
                ">

                  <div className="
                    flex
                    justify-between
                    text-sm
                  ">

                    <span className="
                      text-gray-400
                    ">
                      Reliability
                    </span>

                    <span>
                      {result
                        .reliabilityScore
                        ?.response1 ?? 0}%
                    </span>

                  </div>

                  <div className="
                    w-full
                    h-3
                    bg-gray-800
                    rounded-full
                    overflow-hidden
                  ">

                    <div
                      className="
                        h-full
                        bg-green-500
                      "

                      style={{
                        width:
`${result.reliabilityScore?.response1 ?? 0}%`,
                      }}
                    />

                  </div>

                </div>

                {/* HALLUCINATION */}

                <div className="
                  space-y-2
                ">

                  <div className="
                    flex
                    justify-between
                    text-sm
                  ">

                    <span className="
                      text-gray-400
                    ">
                      Hallucination Risk
                    </span>

                    <span>
                      {result
                        .hallucinationRisk
                        ?.response1 ?? 0}%
                    </span>

                  </div>

                  <div className="
                    w-full
                    h-3
                    bg-gray-800
                    rounded-full
                    overflow-hidden
                  ">

                    <div
                      className="
                        h-full
                        bg-red-500
                      "

                      style={{
                        width:
`${result.hallucinationRisk?.response1 ?? 0}%`,
                      }}
                    />

                  </div>

                </div>

              </div>

              {/* MODEL 2 */}

              <div
                className="
                  bg-black
                  border
                  border-gray-800
                  rounded-2xl
                  p-5
                  space-y-5
                "
              >

                <h3 className="
                  text-lg
                  font-semibold
                ">
                  {model2}
                </h3>

                {/* RELIABILITY */}

                <div className="
                  space-y-2
                ">

                  <div className="
                    flex
                    justify-between
                    text-sm
                  ">

                    <span className="
                      text-gray-400
                    ">
                      Reliability
                    </span>

                    <span>
                      {result
                        .reliabilityScore
                        ?.response2 ?? 0}%
                    </span>

                  </div>

                  <div className="
                    w-full
                    h-3
                    bg-gray-800
                    rounded-full
                    overflow-hidden
                  ">

                    <div
                      className="
                        h-full
                        bg-green-500
                      "

                      style={{
                        width:
`${result.reliabilityScore?.response2 ?? 0}%`,
                      }}
                    />

                  </div>

                </div>

                {/* HALLUCINATION */}

                <div className="
                  space-y-2
                ">

                  <div className="
                    flex
                    justify-between
                    text-sm
                  ">

                    <span className="
                      text-gray-400
                    ">
                      Hallucination Risk
                    </span>

                    <span>
                      {result
                        .hallucinationRisk
                        ?.response2 ?? 0}%
                    </span>

                  </div>

                  <div className="
                    w-full
                    h-3
                    bg-gray-800
                    rounded-full
                    overflow-hidden
                  ">

                    <div
                      className="
                        h-full
                        bg-red-500
                      "

                      style={{
                        width:
`${result.hallucinationRisk?.response2 ?? 0}%`,
                      }}
                    />

                  </div>

                </div>

              </div>

            </div>

            {/* AGREEMENTS */}

            <div>

              <h3 className="
                text-xl
                font-semibold
                mb-4
              ">
                Agreements
              </h3>

              <div className="
                space-y-3
              ">

                {(result.agreements || [])
                  .map((item, index) => (

                  <div
                    key={index}

                    className="
                      bg-black
                      border
                      border-gray-800
                      rounded-xl
                      p-4
                      text-gray-300
                    "
                  >
                    • {item}
                  </div>

                ))}

              </div>

            </div>

            {/* CONTRADICTIONS */}

            <div>

              <h3 className="
                text-xl
                font-semibold
                mb-4
              ">
                Contradictions
              </h3>

              <div className="
                space-y-3
              ">

                {(result.contradictions || [])
                  .map((item, index) => (

                  <div
                    key={index}

                    className="
                      bg-black
                      border
                      border-gray-800
                      rounded-xl
                      p-4
                      text-gray-300
                    "
                  >
                    • {item}
                  </div>

                ))}

              </div>

            </div>

            {/* FINAL SYNTHESIS */}

            <div
              className="
                bg-gradient-to-br
                from-green-900/30
                to-emerald-800/10
                border
                border-green-700
                rounded-2xl
                p-6
              "
            >

              <h2 className="
                text-2xl
                font-bold
                mb-4
              ">
                Final Synthesized
                Answer
              </h2>

              <p className="
                text-gray-100
                leading-8
              ">
                {result.finalSynthesis}
              </p>

            </div>

          </div>

        )}

      </div>

    </main>

  );

}
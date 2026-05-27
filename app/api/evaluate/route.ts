import { NextResponse } from "next/server";

import fs from "fs";
import path from "path";

export const runtime = "nodejs";

// --------------------
// HISTORY FILE
// --------------------

const filePath = path.join(
  process.cwd(),
  "data",
  "history.json"
);

// --------------------
// ENSURE DATA FOLDER
// --------------------

fs.mkdirSync(
  path.join(process.cwd(), "data"),
  {
    recursive: true,
  }
);

// --------------------
// LOAD HISTORY
// --------------------

function loadHistory() {

  try {

    if (!fs.existsSync(filePath)) {
      return [];
    }

    const raw = fs.readFileSync(
      filePath,
      "utf-8"
    );

    return JSON.parse(raw || "[]");

  } catch {

    return [];

  }

}

// --------------------
// SAVE HISTORY
// --------------------

function saveHistory(data: any[]) {

  fs.writeFileSync(
    filePath,
    JSON.stringify(data, null, 2)
  );

}

// --------------------
// ROUTE
// --------------------

export async function POST(
  req: Request
) {

  try {

    const body =
      await req.json();

    const question =
      body.question || "";

    const response1 =
      body.response1 || "";

    const response2 =
      body.response2 || "";

    const evaluator =
      body.evaluator || "Gemini";

    // --------------------
    // MOCK EVALUATION
    // --------------------

    const evaluation = {

      agreements: [
        "Both responses discuss AI systems.",
        "Both answers mention reasoning."
      ],

      contradictions: [
        "Response styles differ."
      ],

      hallucinationRisk: {
        response1: 20,
        response2: 35,
      },

      reliabilityScore: {
        response1: 88,
        response2: 80,
      },

      bestAnswer: "response1",

      finalSynthesis:
        "Both answers describe AI reasonably well. Response 1 provides slightly clearer reasoning.",

    };

    // --------------------
    // SAVE HISTORY
    // --------------------

    const history =
      loadHistory();

    history.unshift({

      id: Date.now(),

      question,

      response1,

      response2,

      evaluator,

      result: evaluation,

      createdAt:
        new Date().toISOString(),

    });

    saveHistory(history);

    console.log(
      "CHAT SAVED"
    );

    return NextResponse.json(
      evaluation
    );

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        error:
          "Evaluation failed",
      },
      {
        status: 500,
      }
    );

  }

}/*import { NextResponse } from "next/server";

import fs from "fs";
import path from "path";

import { GoogleGenerativeAI }
from "@google/generative-ai";

export const runtime = "nodejs";

// --------------------
// GEMINI
// --------------------

const geminiApiKey =
  process.env.GEMINI_API_KEY;

const genAI =
  geminiApiKey
    ? new GoogleGenerativeAI(
        geminiApiKey
      )
    : null;

// --------------------
// HISTORY FILE
// --------------------

const filePath = path.join(
  process.cwd(),
  "data",
  "history.json"
);

// --------------------
// ENSURE DATA FOLDER
// --------------------

fs.mkdirSync(
  path.join(process.cwd(), "data"),
  {
    recursive: true,
  }
);

// --------------------
// ENSURE HISTORY FILE
// --------------------

if (!fs.existsSync(filePath)) {

  fs.writeFileSync(
    filePath,
    "[]",
    "utf-8"
  );

}

// --------------------
// SAFE JSON EXTRACTOR
// --------------------

function extractJSON(
  text: string
) {

  if (!text) return null;

  const cleaned = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {

    return JSON.parse(
      cleaned
    );

  } catch {

    const start =
      cleaned.indexOf("{");

    const end =
      cleaned.lastIndexOf("}");

    if (
      start !== -1 &&
      end !== -1
    ) {

      try {

        return JSON.parse(
          cleaned.slice(
            start,
            end + 1
          )
        );

      } catch {

        return null;

      }

    }

    return null;

  }

}

// --------------------
// FALLBACK
// --------------------

function fallback(
  raw: string
) {

  return {

    agreements: [],

    contradictions: [],

    hallucinationRisk: {
      response1: 50,
      response2: 50,
    },

    reliabilityScore: {
      response1: 50,
      response2: 50,
    },

    bestAnswer: "mixed",

    finalSynthesis:
      "Failed to parse model output.",

    rawOutput: raw,

  };

}

function localFallbackEvaluation(
  question: string,
  response1: string,
  response2: string
) {
  const bestAnswer =
    response1.length > response2.length
      ? "response1"
      : response2.length > response1.length
      ? "response2"
      : "mixed";

  return {
    agreements: [],
    contradictions: [],
    hallucinationRisk: {
      response1: 50,
      response2: 50,
    },
    reliabilityScore: {
      response1: 50,
      response2: 50,
    },
    bestAnswer,
    finalSynthesis:
      "Gemini API key missing or unavailable. Returning fallback evaluation.",
    rawOutput:
      "No Gemini API key available.",
  };
}

// --------------------
// LOAD HISTORY
// --------------------

function loadHistory() {

  try {

    const raw =
      fs.readFileSync(
        filePath,
        "utf-8"
      );

    return JSON.parse(
      raw || "[]"
    );

  } catch (error) {

    console.error(
      "LOAD HISTORY ERROR:",
      error
    );

    return [];

  }

}

// --------------------
// SAVE HISTORY
// --------------------

function saveHistory(
  data: any[]
) {

  try {

    fs.writeFileSync(
      filePath,
      JSON.stringify(
        data,
        null,
        2
      )
    );

    console.log(
      "CHAT SAVED"
    );

  } catch (error) {

    console.error(
      "SAVE HISTORY ERROR:",
      error
    );

  }

}

// --------------------
// POST ROUTE
// --------------------

export async function POST(
  req: Request
) {

  try {

    const body =
      await req.json();

    const question =
      body.question || "";

    const response1 =
      body.response1 || "";

    const response2 =
      body.response2 || "";

    const evaluator =
      body.evaluator || "Gemini";

    let evaluation;

    if (!genAI) {
      evaluation = localFallbackEvaluation(
        question,
        response1,
        response2
      );
    } else {
      // --------------------
      // GEMINI MODEL
      // --------------------

      const model =
        genAI.getGenerativeModel({
          model:
            "gemini-1.5-flash",
        });

      // --------------------
      // PROMPT
      // --------------------

      const prompt = `
You are an AI evaluator.

Analyze BOTH responses carefully.

QUESTION:
${question}

RESPONSE 1:
${response1}

RESPONSE 2:
${response2}

Return ONLY valid JSON.

Format:

{
  "agreements": [],
  "contradictions": [],
  "hallucinationRisk": {
    "response1": 0,
    "response2": 0
  },
  "reliabilityScore": {
    "response1": 0,
    "response2": 0
  },
  "bestAnswer": "response1",
  "finalSynthesis": ""
}

Rules:
- scores must be 0-100
- bestAnswer:
  response1
  response2
  mixed

ONLY RETURN JSON.
`;

      // --------------------
      // GENERATE RESPONSE
      // --------------------

      const result =
        await model.generateContent(
          prompt
        );

      const text =
        result.response.text();

      // --------------------
      // PARSE RESPONSE
      // --------------------

      const parsed =
        extractJSON(text);

      evaluation =
        parsed || fallback(text);
    }

    // --------------------
    // LOAD HISTORY
    // --------------------

    const history =
      loadHistory();

    // --------------------
    // CREATE ENTRY
    // --------------------

    const newEntry = {

      id: Date.now(),

      question,

      response1,
      response2,

      evaluator,

      result: evaluation,

      createdAt:
        new Date().toISOString(),

    };

    // --------------------
    // SAVE ENTRY
    // --------------------

    history.unshift(
      newEntry
    );

    console.log(
      "SAVING CHAT..."
    );

    saveHistory(
      history
    );

    // --------------------
    // RETURN RESPONSE
    // --------------------

    return NextResponse.json(
      evaluation
    );

  } catch (error) {

    console.error(
      "EVALUATE ROUTE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Evaluation failed.",
      },
      {
        status: 500,
      }
    );

  }

}*/
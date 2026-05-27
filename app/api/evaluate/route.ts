import { NextResponse } from "next/server";

import fs from "fs";
import path from "path";

import {
  GoogleGenerativeAI,
} from "@google/generative-ai";

export const runtime = "nodejs";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error(
    "Missing GEMINI_API_KEY environment variable."
  );
}

// --------------------
// GEMINI
// --------------------

const genAI =
  new GoogleGenerativeAI(
    apiKey
  );

// --------------------
// HISTORY FILE
// --------------------

const filePath = path.join(
  process.cwd(),
  "data",
  "history.json"
);

// --------------------
// ENSURE DATA
// --------------------

fs.mkdirSync(
  path.join(
    process.cwd(),
    "data"
  ),
  {
    recursive: true,
  }
);

if (!fs.existsSync(filePath)) {

  fs.writeFileSync(
    filePath,
    "[]"
  );

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

    return JSON.parse(raw);

  } catch {

    return [];

  }

}

// --------------------
// SAVE HISTORY
// --------------------

function saveHistory(
  data: any[]
) {

  fs.writeFileSync(
    filePath,
    JSON.stringify(
      data,
      null,
      2
    )
  );

}

// --------------------
// JSON PARSER
// --------------------

function extractJSON(
  text: string
) {

  try {

    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(cleaned);

  } catch {

    return null;

  }

}

// --------------------
// POST
// --------------------

export async function POST(
  req: Request
) {

  try {

    console.log(
      "EVALUATE ROUTE START"
    );

    const body =
      await req.json();

    console.log(
      "BODY:",
      body
    );

    const question =
      body.question || "";

    const response1 =
      body.response1 || "";

    const response2 =
      body.response2 || "";

    const evaluator =
      body.evaluator || "Gemini";

    // --------------------
    // MODEL
    // --------------------

    const model =
      genAI.getGenerativeModel({
        model: "gemini-1.5-flash-8b",
      });

    // --------------------
    // PROMPT
    // --------------------

    const prompt = `
You are an AI evaluator.

Return ONLY valid JSON.

QUESTION:
${question}

RESPONSE 1:
${response1}

RESPONSE 2:
${response2}

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
`;

    console.log(
      "CALLING GEMINI..."
    );

    const result =
      await model.generateContent(
        prompt
      );

    console.log(
      "GEMINI SUCCESS"
    );

    const text =
      result.response.text();

    console.log(
      "RAW GEMINI:",
      text
    );

    const parsed =
      extractJSON(text);

    if (!parsed) {

      return NextResponse.json(
        {
          error:
            "Gemini returned invalid JSON.",
          raw: text,
        },
        {
          status: 500,
        }
      );

    }

    console.log(
      "SAVING HISTORY..."
    );

    const history =
      loadHistory();

    history.unshift({

      id: Date.now(),

      question,

      response1,

      response2,

      evaluator,

      result: parsed,

      createdAt:
        new Date().toISOString(),

    });

    saveHistory(history);

    console.log(
      "HISTORY SAVED"
    );

    return NextResponse.json(
      parsed
    );

  } catch (error) {

    console.error(
      "EVALUATE ROUTE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : String(error),

        stack:
          error instanceof Error
            ? error.stack
            : null,
      },
      {
        status: 500,
      }
    );

  }

}
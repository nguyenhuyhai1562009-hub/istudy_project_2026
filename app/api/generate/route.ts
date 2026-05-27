import { NextResponse } from "next/server";

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
// POST
// --------------------

export async function POST(
  req: Request
) {

  try {

    console.log(
      "GENERATE ROUTE START"
    );

    const body =
      await req.json();

    const prompt =
      body.prompt || "";

    console.log(
      "PROMPT:",
      prompt
    );

    const model =
      genAI.getGenerativeModel({
        model: "gemini-1.5-flash-8b",
      });

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
      "RAW RESPONSE:",
      text
    );

    if (!text) {

      return NextResponse.json(
        {
          error:
            "Empty AI response",
        },
        {
          status: 500,
        }
      );

    }

    return NextResponse.json({
      text,
    });

  } catch (error) {

    console.error(
      "GENERATE ROUTE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Generation failed.",
      },
      {
        status: 500,
      }
    );

  }

}
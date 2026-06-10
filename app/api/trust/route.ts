import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

const genAI = new GoogleGenerativeAI(apiKey);

function extractJSON(text: string) {
  try {
    return JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
  } catch { return null; }
}

export async function POST(req: Request) {
  try {
    const { question, answer, subject } = await req.json();
    if (!question || !answer) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent(`
You are an academic fact-checker and reliability analyst for A-Level ${subject} content.

Analyze the following student answer for factual accuracy, hallucinations, and reliability.

QUESTION: ${question}
STUDENT ANSWER: ${answer}

Evaluate each major claim in the answer. Return ONLY valid JSON matching this schema:

{
  "overallReliability": "Reliable" | "Uncertain" | "Likely Hallucination",
  "reliabilityScore": 85,
  "hallucinationRisk": 15,
  "trustLabel": "High Trust" | "Medium Trust" | "Low Trust",
  "claims": [
    {
      "claim": "Exact claim from the answer",
      "verdict": "Accurate" | "Uncertain" | "Incorrect",
      "explanation": "Why this claim is accurate, uncertain, or incorrect",
      "severity": "low" | "medium" | "high"
    }
  ],
  "verificationSuggestions": [
    "Specific suggestion on how to verify a claim"
  ],
  "summary": "Overall reliability summary in 2-3 sentences"
}
`);

    const text = result.response.text();
    const parsed = extractJSON(text);
    if (!parsed) return NextResponse.json({ error: "Invalid JSON from Gemini", raw: text }, { status: 500 });

    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Trust check failed" },
      { status: 500 }
    );
  }
}
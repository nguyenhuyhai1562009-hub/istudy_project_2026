import { NextResponse } from "next/server";
import { geminiGenerate } from "@/lib/gemini";
export const runtime = "nodejs";

function extractJSON(text: string) {
  try { return JSON.parse(text.replace(/```json/g,"").replace(/```/g,"").trim()); } catch { return null; }
}

export async function POST(req: Request) {
  try {
    const { question, subject, breakdown, overallCritique } = await req.json();
    if (!question) return NextResponse.json({ chips: [] });

    const weakest = breakdown
      ? Object.entries(breakdown).sort((a: any, b: any) => a[1].score - b[1].score)[0]
      : null;

    const prompt = `You are generating 3 short follow-up question suggestions for a student who just got their ${subject} exam answer evaluated.

QUESTION: ${question}
OVERALL FEEDBACK: ${overallCritique || "N/A"}
WEAKEST AREA: ${weakest ? `${weakest[0]} (${(weakest[1] as any).score}/5)` : "N/A"}

Generate exactly 3 short, natural follow-up questions a student would actually click to ask next. Each must be phrased EXACTLY as the student would type it (first person, casual but clear), under 10 words, with one relevant emoji prefix.

Return ONLY valid JSON, no markdown:
{"chips": ["emoji + short question 1", "emoji + short question 2", "emoji + short question 3"]}`;

    const text = await geminiGenerate(prompt);
    const parsed = extractJSON(text);
    if (!parsed?.chips || !Array.isArray(parsed.chips)) {
      return NextResponse.json({ chips: [] });
    }
    return NextResponse.json({ chips: parsed.chips.slice(0, 3) });
  } catch (error) {
    console.error("[suggest-chips]", error);
    return NextResponse.json({ chips: [] });
  }
}
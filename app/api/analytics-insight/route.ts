import { NextResponse } from "next/server";
import { geminiGenerate } from "@/lib/gemini";
export const runtime = "nodejs";

function extractJSON(text: string) {
  try { return JSON.parse(text.replace(/```json/g,"").replace(/```/g,"").trim()); } catch { return null; }
}

export async function POST(req: Request) {
  try {
    const { subject, averages, sessions, recentDefects } = await req.json();
    if (!subject || !averages) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const prompt = `You are an educational analyst reviewing a student's performance pattern in ${subject} across ${sessions} graded exam sessions.

SCORES (out of 5): Knowledge=${averages.knowledge}, Application=${averages.application}, Analysis=${averages.analysis}, Evaluation=${averages.evaluation}
RECURRING ISSUES: ${(recentDefects || []).join(", ") || "none recorded"}

TASK:
1. Write one honest, specific sentence (max 30 words) summarizing overall performance — direct, not generic praise.
2. Write a short "learner profile" statement (max 25 words) characterizing HOW this student seems to learn and process information, based on the score pattern (e.g. "Strong factual recall but struggles translating knowledge into structured argument").
3. Recommend exactly ONE primary learning method from this exact list only: "Flashcards", "Timed Essays", "Socratic Questions", "Mind Mapping", "Teach-back Method". Pick the one that most directly targets their weakest area. Justify briefly using their actual score pattern, max 25 words.
4. For EACH of the 4 categories (knowledge, application, analysis, evaluation), write a one-sentence hover description (max 20 words) explaining what that score level means for THIS student specifically (not a generic definition).

5. Write a fuller "Overall Assessment" paragraph (3-5 sentences, ~80-120 words) evaluating this student holistically as their tutor would in a progress report. Cover: their current standing in ${subject}, the pattern behind their strengths and weaknesses, and a forward-looking note on what mastering next would unlock. Be specific and grounded in the actual scores — avoid generic encouragement.

Return ONLY valid JSON, no markdown:
{
  "overallStatement": "...",
  "learnerProfile": "...",
  "overallAssessment": "...",
  "learningMethod": {
    "type": "Flashcards"|"Timed Essays"|"Socratic Questions"|"Mind Mapping"|"Teach-back Method",
    "reason": "..."
  },
  "categoryInsights": {
    "knowledge": "...",
    "application": "...",
    "analysis": "...",
    "evaluation": "..."
  }
}`;

    const text = await geminiGenerate(prompt);
    const parsed = extractJSON(text);
    if (!parsed) return NextResponse.json({ error: "Invalid JSON", raw: text }, { status: 500 });
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("[analytics-insight]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { geminiGenerate } from "@/lib/gemini";
export const runtime = "nodejs";

function extractJSON(text: string) {
  try { return JSON.parse(text.replace(/```json/g,"").replace(/```/g,"").trim()); } catch { return null; }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const question = body.question || "";
    const response1 = body.response1 || "";
    const subject = body.subject || "Economics";
    const guidelines: Record<string,string> = {
      economics: "Focus heavily on economic models, policy trade-offs, market mechanisms, and short-run vs long-run effects.",
      business: "Focus on stakeholder analysis, corporate strategy impacts, internal/external environments, and financial/non-financial metrics.",
      physics: "Focus on correct application of physical laws, unit consistency, mathematical derivations, and experimental evaluation.",
      maths: "Focus on logical proof structure, correct method selection, algebraic accuracy, and clear working shown at each step.",
      psychology: "Focus on psychological theories, research studies, methodology evaluation, and ethical considerations.",
      history: "Focus on historical causation, source evaluation, historiography, and contextual analysis.",
    };
    const subjectGuideline = guidelines[subject.toLowerCase()] || "";
    const prompt = `You are an expert, strict international Examiner specialized in ${subject} (A-Level/AS standard). Evaluate the Student's Answer against the Given Question.
${subjectGuideline}
CRITICAL DIRECTIONS:
1. Evaluate thoroughly and write detailed feedback BEFORE assigning scores.
2. RUBRIC (out of 5): 5=Exceptional, 3-4=Good, 1-2=Poor, 0=Irrelevant.
3. ANNOTATIONS: "keyword" MUST be exact substring from Student's Answer. If no flaw, return [].
4. CITATIONS: cite relevant A-Level syllabus (AQA/Edexcel/Cambridge) with codes.
5. Return ONLY valid JSON, no markdown.
QUESTION: ${question}
STUDENT'S ANSWER: ${response1}
OUTPUT:
{
  "subject": "${subject}",
  "overallCritique": "...",
  "breakdown": {
    "knowledge": { "feedback": "...", "score": 0 },
    "application": { "feedback": "...", "score": 0 },
    "analysis": { "feedback": "...", "score": 0 },
    "evaluation": { "feedback": "...", "score": 0 }
  },
  "citations": [{ "claim": "...", "source": "...", "reference": "..." }],
  "annotations": [{ "keyword": "...", "type": "warning", "context": "...", "suggestion": "..." }],
  "improvements": [{ "category": "...", "defect": "...", "fix": "..." }],
  "estimatedScore": "X/20"
}`;

    const text = await geminiGenerate(prompt);
    const parsed = extractJSON(text);
    if (!parsed) return NextResponse.json({ error: "Invalid JSON from Gemini.", raw: text }, { status: 500 });

    // Save to KV in background — don't block response if KV fails
    try {
      const { kv } = await import("@vercel/kv");
      const history = await kv.lrange<any>("history", 0, -1);
      history.unshift({ id: Date.now(), question, response1, subject, result: parsed, createdAt: new Date().toISOString() });
      await kv.del("history");
      await kv.lpush("history", ...history);
    } catch (kvErr) {
      console.warn("[evaluate] KV save failed (non-critical):", kvErr);
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("[evaluate] ERROR:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
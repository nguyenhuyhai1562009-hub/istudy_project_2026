import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY environment variable.");
}

const genAI = new GoogleGenerativeAI(apiKey);

function extractJSON(text: string) {
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const question = body.question || "";
    const response1 = body.response1 || "";
    const response2 = body.response2 || "";
    const evaluator = body.evaluator || "Gemini";
    const subject = body.subject || "Economics"; // Dynamic subject fallback to Economics

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    // Subject-specific tailored context
    let subjectGuideline = "";
    if (subject.toLowerCase() === "economics") {
      subjectGuideline = "Focus heavily on economic models, policy trade-offs, market mechanisms, and short-run vs long-run effects.";
    } else if (subject.toLowerCase() === "business management") {
      subjectGuideline = "Focus on stakeholder analysis, corporate strategy impacts, internal/external environments, and financial/non-financial metrics.";
    } else if (subject.toLowerCase() === "history" || subject.toLowerCase() === "sociology") {
      subjectGuideline = "Focus on historical/social contexts, cause-and-effect chains, source reliability, and evaluating multi-perspective arguments.";
    }

    const prompt = `
You are an expert, strict international Examiner specialized in ${subject} (A-Level/AP standard). Your job is to rigorously evaluate the Student's Answer against the Given Question.

${subjectGuideline}

CRITICAL DIRECTIONS:
1. PROCESS FLOW: Evaluate the essay thoroughly, write detailed feedback, and identify annotations BEFORE assigning any scores. The final score must be a logical mathematical reflection of your analytical feedback.
2. UNIVERSAL ACADEMIC RUBRIC (Apply strictly out of 5 marks per layer):
   - 5 (Excellent): Exceptional depth. Accurate subject-specific terminology, logical multi-step cause-and-effect chains, well-justified judgments, and direct contextual application.
   - 3-4 (Good): Solid understanding. Correct core concepts and relevant points, but missing deep analytical extensions or counter-arguments are slightly underdeveloped.
   - 1-2 (Poor): Surface-level or fragmented knowledge. Parrots basic definitions without deep integration; relies heavily on generic assertions.
   - 0: Completely irrelevant, non-academic, or blank.
3. STRICT ANCHORING RULE: For the "annotations" array, the "keyword" field MUST be an exact, word-for-word substring extracted directly from the Student's Answer. Do not paraphrase, do not fix typos, do not alter a single character. If no specific flaw is found, return an empty array [].
4. Return ONLY a valid JSON object matching the strict schema below. No markdown wrappers.

QUESTION:
${question}

STUDENT'S ANSWER:
${response1}

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "subject": "${subject}",
  "overallCritique": "[Provide a comprehensive, highly personalized diagnostic overview of the entire essay here]",
  "breakdown": {
    "knowledge": { 
      "feedback": "[Specific feedback on definitions, accuracy, and theories used]", 
      "score": [An integer from 0 to 5 based on the rubric] 
    },
    "application": { 
      "feedback": "[Specific feedback on how well the student applied context or case data]", 
      "score": [An integer from 0 to 5 based on the rubric] 
    },
    "analysis": { 
      "feedback": "[Specific feedback on logical cause-and-effect chains and linkages]", 
      "score": [An integer from 0 to 5 based on the rubric] 
    },
    "evaluation": { 
      "feedback": "[Specific feedback on counter-arguments, weighing of factors, and final judgments]", 
      "score": [An integer from 0 to 5 based on the rubric] 
    }
  },
  "annotations": [
    {
      "keyword": "[Exact literal substring from the student's answer]",
      "type": "warning",
      "context": "[The immediate surrounding sentence for visual reference]",
      "suggestion": "[Actionable coaching advice explaining what is structurally flawed or missing]"
    }
  ],
  "improvements": [
    {
      "category": "[The core criteria flawed, e.g., Evaluation or Analysis]",
      "defect": "[The specific weakness or missing structural component in this essay]",
      "fix": "[Clear, step-by-step guidance on how the student should rewrite or expand this section]"
    }
  ],
  "estimatedScore": "[Final total score formatted exactly as 'X/20'. X MUST equal the sum of the four breakdown scores above]"
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = extractJSON(text);

    if (!parsed) {
      return NextResponse.json(
        { error: "Gemini returned invalid JSON.", raw: text },
        { status: 500 }
      );
    }

    // Fetch, update, and completely rewrite the Redis list history (Legacy Claude mechanism)
    const history = await kv.lrange<any>("history", 0, -1);
    history.unshift({
      id: Date.now(),
      question,
      response1,
      response2,
      evaluator,
      subject,
      result: parsed,
      createdAt: new Date().toISOString(),
    });
    await kv.del("history");
    await kv.lpush("history", ...history);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("EVALUATE ROUTE ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
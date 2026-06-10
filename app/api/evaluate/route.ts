import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("Missing GEMINI_API_KEY environment variable.");

const genAI = new GoogleGenerativeAI(apiKey);

function extractJSON(text: string) {
  try {
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
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
    const subject = body.subject || "Economics";

    let subjectGuideline = "";
    if (subject.toLowerCase() === "economics") {
      subjectGuideline = "Focus heavily on economic models, policy trade-offs, market mechanisms, and short-run vs long-run effects.";
    } else if (subject.toLowerCase() === "business" || subject.toLowerCase() === "business management") {
      subjectGuideline = "Focus on stakeholder analysis, corporate strategy impacts, internal/external environments, and financial/non-financial metrics.";
    } else if (subject.toLowerCase() === "physics") {
      subjectGuideline = "Focus on correct application of physical laws, unit consistency, mathematical derivations, and experimental evaluation.";
    } else if (subject.toLowerCase() === "maths" || subject.toLowerCase() === "mathematics") {
      subjectGuideline = "Focus on logical proof structure, correct method selection, algebraic accuracy, and clear working shown at each step.";
    } else if (subject.toLowerCase() === "psychology") {
      subjectGuideline = "Focus on psychological theories, research studies, methodology evaluation, and ethical considerations.";
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
You are an expert, strict international Examiner specialized in ${subject} (A-Level/AP standard). Your job is to rigorously evaluate the Student's Answer against the Given Question.

${subjectGuideline}

CRITICAL DIRECTIONS:
1. PROCESS FLOW: Evaluate the essay thoroughly and write detailed feedback BEFORE assigning any scores. The final score must be a logical mathematical reflection of your analytical feedback.
2. UNIVERSAL ACADEMIC RUBRIC (Apply strictly, out of 5 marks per layer):
   - 5 (Excellent): Exceptional depth. Accurate subject-specific terminology, logical multi-step cause-and-effect chains, well-justified judgments, and direct contextual application.
   - 3-4 (Good): Solid understanding. Correct core concepts and relevant points, but missing deep analytical extensions or counter-arguments are slightly underdeveloped.
   - 1-2 (Poor): Surface-level or fragmented knowledge. Parrots basic definitions without deep integration; relies heavily on generic assertions.
   - 0: Completely irrelevant, non-academic, or blank.
3. STRICT ANCHORING RULE: For the "annotations" array, the "keyword" field MUST be an exact, word-for-word substring extracted directly from the Student's Answer. Do not paraphrase, do not fix typos, do not alter a single character. If no specific flaw is found, return an empty array [].
4. CITATIONS RULE: For each major claim or mark scheme point in your feedback, cite the most relevant A-Level syllabus section (AQA/Edexcel/Cambridge) or standard textbook. Be specific — include specification reference codes where possible.
5. Return ONLY a valid JSON object matching the strict schema below. No markdown wrappers, no backticks.

QUESTION:
${question}

STUDENT'S ANSWER:
${response1}

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "subject": "${subject}",
  "overallCritique": "[Comprehensive, highly personalized diagnostic overview of the entire essay]",
  "breakdown": {
    "knowledge": {
      "feedback": "[Specific feedback on definitions, accuracy, and theories used]",
      "score": [Integer 0-5 based on rubric]
    },
    "application": {
      "feedback": "[Specific feedback on how well the student applied context or case data]",
      "score": [Integer 0-5 based on rubric]
    },
    "analysis": {
      "feedback": "[Specific feedback on logical cause-and-effect chains and linkages]",
      "score": [Integer 0-5 based on rubric]
    },
    "evaluation": {
      "feedback": "[Specific feedback on counter-arguments, weighing of factors, and final judgments]",
      "score": [Integer 0-5 based on rubric]
    }
  },
  "citations": [
    {
      "claim": "[Exact claim or point made in the feedback]",
      "source": "[e.g. AQA Economics Specification 3.1.2]",
      "reference": "[e.g. Edexcel A-Level Economics Student Book, Chapter 4]"
    }
  ],
  "annotations": [
    {
      "keyword": "[Exact literal substring from the student's answer]",
      "type": "warning",
      "context": "[Immediate surrounding sentence for visual reference]",
      "suggestion": "[Actionable coaching advice explaining what is structurally flawed or missing]"
    }
  ],
  "improvements": [
    {
      "category": "[Core criteria flawed, e.g. Evaluation or Analysis]",
      "defect": "[Specific weakness or missing structural component in this essay]",
      "fix": "[Clear, step-by-step guidance on how the student should rewrite or expand this section]"
    }
  ],
  "estimatedScore": "[Final total formatted exactly as 'X/20'. X MUST equal the sum of the four breakdown scores above]"
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
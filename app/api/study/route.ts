import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: Request) {
  try {
    const { question, subject, mode } = await req.json();

    if (!question || !subject) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let modePrompt = "";

    switch (mode?.toLowerCase()) {
      case "socratic":
        modePrompt = `
Do NOT reveal the direct answer. Act as a facilitator.
Use Socratic questioning to guide the student toward discovering the answer themselves.
Analyze the question, identify the core concept, and ask 2-3 targeted leading questions
that prompt the student to think about the next logical step.`;
        break;

      case "scaffold":
        modePrompt = `
The student is struggling with core concepts. Break down the explanation into basic building blocks.
First, explicitly define any key academic terms or models related to this question.
Second, provide a step-by-step logical chain explaining the answer.
Keep language simple, encouraging, and easy to follow.`;
        break;

      case "exam_drill":
        modePrompt = `
Act as a strict A-Level examiner. Provide a high-scoring model answer framework.
Clearly highlight the exact keywords, definitions, and analytical links required to secure maximum marks.
Bullet-point the mandatory arguments, application data points, and counter-arguments (Evaluation)
that must be present in a top-tier paper.`;
        break;

      default:
        modePrompt = `
Explain the answer to this ${subject} question step by step.
Use clear, formal academic language appropriate for A-Level standard.
Break down each concept thoroughly before moving to the next.`;
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent(`
You are an expert ${subject} tutor and educational specialist at A-Level/AP standard.

YOUR INSTRUCTION:
${modePrompt}

QUESTION:
${question}

Respond in clear plain text or standard Markdown (bullet points if needed). No H1/H2 headers. Be concise, academic, direct.
`);

    const text = result.response.text();
    if (!text) return NextResponse.json({ error: "Empty response from Gemini" }, { status: 500 });

    return NextResponse.json({ text });
  } catch (error) {
    console.error("STUDY MODE ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Study mode failed" },
      { status: 500 }
    );
  }
}
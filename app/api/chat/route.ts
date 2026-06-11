import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
const genAI = new GoogleGenerativeAI(apiKey);

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  try {
    const { question, subject, messages, mode } = await req.json();

    if (!question || !messages?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const SUBJECTS_GUIDELINE: Record<string, string> = {
      economics: "Focus on economic models, policy trade-offs, market mechanisms.",
      business: "Focus on stakeholder analysis, corporate strategy, financial metrics.",
      physics: "Focus on physical laws, unit consistency, mathematical derivations.",
      maths: "Focus on proof structure, correct method, algebraic accuracy.",
      psychology: "Focus on psychological theories, research studies, ethical considerations.",
      history: "Focus on historical causation, source evaluation, historiography.",
    };

    const subjectGuideline = SUBJECTS_GUIDELINE[subject?.toLowerCase()] || "";

    let modeInstruction = "";
    if (mode === "socratic") {
      modeInstruction = "Use Socratic questioning only. Never reveal direct answers. Ask 2-3 targeted leading questions.";
    } else if (mode === "scaffold") {
      modeInstruction = "Break down into basic building blocks. Define key terms first, then step-by-step logical chain.";
    } else if (mode === "exam_drill") {
      modeInstruction = "Act as a strict A-Level examiner. Provide mark scheme frameworks, mandatory keywords, required arguments.";
    }

    const systemPrompt = `You are an expert A-Level ${subject} tutor and examiner.
${subjectGuideline}
${modeInstruction}
The original exam question being discussed is: "${question}"
Keep responses concise, academic, and directly useful. Use plain text or light markdown. No H1/H2 headers.
Refuse any questions not related to ${subject} or exam preparation — redirect politely.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: systemPrompt,
    });

    // Build chat history for Gemini (alternating user/model)
    const chat = model.startChat({
      history: messages.slice(0, -1).map((m: ChatMessage) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    });

    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    const text = result.response.text();

    if (!text) return NextResponse.json({ error: "Empty response" }, { status: 500 });
    return NextResponse.json({ text });
  } catch (error) {
    console.error("CHAT ROUTE ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 500 }
    );
  }
}
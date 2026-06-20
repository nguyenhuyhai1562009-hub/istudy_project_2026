import { NextResponse } from "next/server";
import { geminiGenerate } from "@/lib/gemini";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { question, subject, mode } = await req.json();
    if (!question) return NextResponse.json({ error: "Missing question" }, { status: 400 });

    const modePrompts: Record<string,string> = {
      socratic: "Do NOT reveal the direct answer. Use Socratic questioning. Ask 2-3 targeted leading questions that prompt the student to discover the answer themselves.",
      scaffold: "The student is struggling. Break down from first principles. Define key terms first, then step-by-step logical chain. Keep language simple and encouraging.",
      exam_drill: "Act as a strict A-Level examiner. Provide a high-scoring model answer framework. List exact keywords, definitions, analytical links, and counter-arguments required for maximum marks.",
    };
    const modePrompt = modePrompts[mode?.toLowerCase()] || "Explain the answer step by step using clear academic language appropriate for A-Level.";
    const subj = subject || "the relevant subject";

    const text = await geminiGenerate(
      `You are an expert ${subj} tutor at A-Level/AS standard. You ONLY answer questions related to ${subj} and exam preparation. Politely refuse anything off-topic.\n${modePrompt}\nQUESTION: ${question}\nRespond in clear plain text or light markdown. No H1/H2 headers. Be concise and academic.`
    );

    if (!text) return NextResponse.json({ error: "Empty response" }, { status: 500 });
    return NextResponse.json({ text });
  } catch (error) {
    console.error("[study]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Study mode failed" }, { status: 500 });
  }
}
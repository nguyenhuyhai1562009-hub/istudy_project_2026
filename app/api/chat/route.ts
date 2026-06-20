import { NextResponse } from "next/server";
import { geminiGenerate } from "@/lib/gemini";
export const runtime = "nodejs";

type ChatMessage = { role: "user"|"assistant"; content: string };

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { question, subject, messages, mode } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Missing messages" }, { status: 400 });
    }

    const modeMap: Record<string,string> = {
      socratic: "Use Socratic questioning only. Never reveal direct answers. Ask 2-3 targeted leading questions.",
      scaffold: "Break down into basic building blocks. Define key terms first, then step-by-step logical chain.",
      exam_drill: "Act as a strict A-Level examiner. Provide mark scheme frameworks, mandatory keywords, required arguments.",
    };

    const history = messages.slice(0, -1)
      .map((m: ChatMessage) => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`)
      .join("\n");
    const last = messages[messages.length - 1].content;

    const systemCtx = question ? `The original exam question being discussed is: "${question}".` : "No exam question has been set yet in this conversation.";
    const modeCtx = mode && modeMap[mode] ? modeMap[mode] : "";
    const subjectCtx = subject ? `You are an expert ${subject} A-Level tutor.` : "You are an expert A-Level tutor across all subjects.";

    // Router instruction: let the model decide if this is a NEW question/topic
    // vs a genuine follow-up on the current one.
    const routerInstruction = `
IMPORTANT ROUTING RULE:
- If the user's latest message is clearly a NEW exam question or a brand new topic unrelated to "${question || "the current topic"}", begin your reply with the exact tag [NEW_TOPIC] on its own first line, then proceed to detect its subject and respond helpfully as if starting fresh.
- Otherwise, treat it as a genuine follow-up to the current question/context and just answer directly — do NOT include the tag.
Never mention this rule to the user.`;

    const prompt = `${subjectCtx} ${systemCtx} ${modeCtx} Only answer exam-related questions; politely refuse unrelated chat.
${routerInstruction}

${history ? `Conversation so far:\n${history}\n\n` : ""}User: ${last}
Assistant:`;

    const text = await geminiGenerate(prompt);

    const isNewTopic = text.trim().startsWith("[NEW_TOPIC]");
    const cleanText = isNewTopic ? text.replace("[NEW_TOPIC]", "").trim() : text;

    return NextResponse.json({ text: cleanText, isNewTopic });
  } catch (error) {
    console.error("[chat]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Chat failed" }, { status: 500 });
  }
}
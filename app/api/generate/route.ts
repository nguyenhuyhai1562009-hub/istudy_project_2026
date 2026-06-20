import { NextResponse } from "next/server";
import { geminiGenerate } from "@/lib/gemini";
export const runtime = "nodejs";

const SYSTEM_PROMPTS: Record<string,string> = {
  ChatGPT: "You are ChatGPT by OpenAI. Be concise, structured, and clear.",
  Gemini: "You are Gemini by Google. Be thorough, analytical, and detail-oriented.",
};

export async function POST(req: Request) {
  try {
    const { prompt, model } = await req.json();
    const system = SYSTEM_PROMPTS[model] || SYSTEM_PROMPTS["Gemini"];
    const text = await geminiGenerate(prompt, system);
    return NextResponse.json({ text });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
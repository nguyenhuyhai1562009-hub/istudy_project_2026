import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY environment variable.");
}

const genAI = new GoogleGenerativeAI(apiKey);

// Different system prompts to simulate different AI personalities
const SYSTEM_PROMPTS: Record<string, string> = {
  ChatGPT: `You are ChatGPT, a helpful AI assistant made by OpenAI. 
You are known for being concise, structured, and clear. 
Answer the following question as ChatGPT would.`,

  Gemini: `You are Gemini, a helpful AI assistant made by Google. 
You are known for being thorough, analytical, and detail-oriented. 
Answer the following question as Gemini would.`,
};

export async function POST(req: Request) {
  try {
    console.log("GENERATE ROUTE START");

    const body = await req.json();
    const prompt = body.prompt || "";
    const modelName = body.model || "Gemini";

    console.log("PROMPT:", prompt);
    console.log("MODEL:", modelName);

    const systemPrompt = SYSTEM_PROMPTS[modelName] || SYSTEM_PROMPTS["Gemini"];

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: systemPrompt,
    });

    console.log("CALLING GEMINI...");

    const result = await model.generateContent(prompt);

    console.log("GEMINI SUCCESS");

    const text = result.response.text();

    if (!text) {
      return NextResponse.json({ error: "Empty AI response" }, { status: 500 });
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("GENERATE ROUTE ERROR:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Generation failed.",
      },
      { status: 500 }
    );
  }
}
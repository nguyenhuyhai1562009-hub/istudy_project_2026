import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
export const runtime = "nodejs";
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
const ai = new GoogleGenAI({ apiKey });
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File;
    if (!file) return NextResponse.json({ error: "No image provided" }, { status: 400 });
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { inlineData: { data: base64, mimeType: file.type } },
        "You are an OCR engine for A-Level and GCSE exam papers. Extract ALL text exactly as it appears. Preserve question numbers, equations, labels, units. Format equations clearly. Return extracted text only. No commentary."
      ] as any
    });
    const text = result.text;
    if (!text) return NextResponse.json({ error: "No text extracted" }, { status: 500 });
    return NextResponse.json({ text });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "OCR failed" }, { status: 500 });
  }
}
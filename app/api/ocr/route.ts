// app/api/ocr/route.ts
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = file.type;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64,
          mimeType,
        },
      },
      `You are an OCR engine for A-Level and GCSE exam papers.
Extract ALL text from this image exactly as it appears.
Preserve: question numbers, equations, labels, units.
Format equations clearly (e.g. x² + 2x = 0).
Return extracted text only. No commentary.`,
    ]);

    const text = result.response.text();

    if (!text) {
      return NextResponse.json({ error: "No text extracted" }, { status: 500 });
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("OCR ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "OCR failed" },
      { status: 500 }
    );
  }
}
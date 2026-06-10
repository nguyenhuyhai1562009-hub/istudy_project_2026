import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text) return NextResponse.json({ subject: "Economics" });

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent(`
Detect the academic subject of the following exam question or text.
Return ONLY one word from this exact list: Economics, Business, Physics, Maths, History, Sociology
If unsure, return: Economics

TEXT: ${text}
`);

    const raw = result.response.text().trim().replace(/[^a-zA-Z]/g, "");
    const allowed = ["Economics", "Business", "Physics", "Maths", "History", "Psychology"];
    const subject = allowed.find(s => s.toLowerCase() === raw.toLowerCase()) || "Economics";

    return NextResponse.json({ subject });
  } catch {
    return NextResponse.json({ subject: "Economics" });
  }
}
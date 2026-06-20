import { NextResponse } from "next/server";
import { geminiGenerate } from "@/lib/gemini";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text) return NextResponse.json({ subject: "Economics" });
    const result = await geminiGenerate(
      `Detect the academic subject of the following exam question. Return ONLY one word from: Economics, Business, Physics, Maths, History, Psychology\nTEXT: ${text}`
    );
    const raw = result.trim().replace(/[^a-zA-Z]/g, "");
    const allowed = ["Economics","Business","Physics","Maths","History","Psychology"];
    const subject = allowed.find(s => s.toLowerCase() === raw.toLowerCase()) || "Economics";
    return NextResponse.json({ subject });
  } catch (err) {
    console.error("[detect-subject]", err);
    return NextResponse.json({ subject: "Economics" });
  }
}
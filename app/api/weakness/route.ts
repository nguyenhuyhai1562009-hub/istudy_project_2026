import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

type ScoreEntry = {
  subject: string;
  scores: {
    knowledge: { score: number };
    application: { score: number };
    analysis: { score: number };
    evaluation: { score: number };
  };
  improvements: { category: string; defect: string }[];
  createdAt: string;
};

export async function POST(req: Request) {
  try {
    const { subject, scores, improvements } = await req.json();
    const entry: ScoreEntry = {
      subject,
      scores,
      improvements,
      createdAt: new Date().toISOString(),
    };
    await kv.lpush(`weakness:${subject.toLowerCase()}`, entry);
    await kv.ltrim(`weakness:${subject.toLowerCase()}`, 0, 49);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get("subject") || "";

    if (subject) {
      const data = await kv.lrange(`weakness:${subject.toLowerCase()}`, 0, -1);
      return NextResponse.json(data ?? []);
    }

    const subjects = ["economics", "business", "physics", "maths", "history", "sociology"];
    const summary: Record<string, any> = {};

    for (const s of subjects) {
      const entries = await kv.lrange<ScoreEntry>(`weakness:${s}`, 0, -1);
      if (entries && entries.length > 0) {
        const avg = (key: keyof ScoreEntry["scores"]) =>
          Math.round((entries.reduce((acc, e) => acc + e.scores[key].score, 0) / entries.length) * 10) / 10;
        summary[s] = {
          sessions: entries.length,
          averages: {
            knowledge: avg("knowledge"),
            application: avg("application"),
            analysis: avg("analysis"),
            evaluation: avg("evaluation"),
          },
          recentDefects: entries.slice(0, 3).flatMap((e) => e.improvements.map((i) => i.category)),
        };
      }
    }

    return NextResponse.json(summary);
  } catch {
    return NextResponse.json({}, { status: 500 });
  }
}
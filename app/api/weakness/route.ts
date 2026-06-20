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
    const body = await req.json();
    const { subject, scores, improvements } = body;
    if (!subject || !scores) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const entry: ScoreEntry = { subject, scores, improvements: improvements || [], createdAt: new Date().toISOString() };
    const key = `weakness:${subject.toLowerCase()}`;

    try {
      await kv.lpush(key, entry);
      await kv.ltrim(key, 0, 49);
    } catch (e) {
      console.warn("KV write failed (non-critical):", e);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get("subject")?.toLowerCase();

    if (subject) {
      const data = await kv.lrange<ScoreEntry>(`weakness:${subject}`, 0, -1);
      return NextResponse.json(data ?? []);
    }

    const subjects = ["economics","business","physics","maths","history","psychology"];
    const summary: Record<string, any> = {};

    for (const s of subjects) {
      const entries = await kv.lrange<ScoreEntry>(`weakness:${s}`, 0, -1);
      if (!entries || entries.length === 0) continue;

      const clamp = (n: number) => Math.min(5, Math.max(0, n));
      const avg = (key: keyof ScoreEntry["scores"]) => {
        const valid = entries.filter(e => e.scores && e.scores[key]);
        if (valid.length === 0) return 0;
        const sum = valid.reduce((acc, e) => acc + clamp(e.scores[key].score), 0);
        return Math.round((sum / valid.length) * 10) / 10;
      };

      summary[s] = {
        sessions: entries.length,
        averages: {
          knowledge: avg("knowledge"),
          application: avg("application"),
          analysis: avg("analysis"),
          evaluation: avg("evaluation"),
        },
        recentDefects: entries.flatMap(e => (e.improvements || []).map(i => i.category)).filter(Boolean),
      };
    }
    return NextResponse.json(summary);
  } catch (error) {
    console.error("[weakness GET]", error);
    return NextResponse.json({}, { status: 500 });
  }
}
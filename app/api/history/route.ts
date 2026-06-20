/*import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

const IS_DEMO_MODE = true; // Chuyển thành false khi có mạng ổn định

export async function GET() {
  if (IS_DEMO_MODE) {
    return NextResponse.json([
      { subject: "Economics", topic: "Elasticity", score: 85, date: "2026-06-12" },
      { subject: "Maths", topic: "Calculus", score: 92, date: "2026-06-11" }
    ]);
  }

  try {
    const history = await redis.lrange("history", 0, -1);
    return NextResponse.json(history ?? []);
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}*/
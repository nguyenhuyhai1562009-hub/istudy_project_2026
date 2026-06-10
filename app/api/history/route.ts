import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function GET() {
  try {
    const history = await kv.lrange("history", 0, -1);
    return NextResponse.json(history ?? []);
  } catch (error) {
    console.error(error);
    return NextResponse.json([], { status: 500 });
  }
}
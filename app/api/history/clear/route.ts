import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function POST() {
  try {
    await kv.del("history");
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
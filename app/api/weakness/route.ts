import { NextResponse } from "next/server";

// Weakness data is now handled client-side via Walrus storage.
// This route is kept as a no-op to avoid 404s.

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { subject, scores, improvements } = body;
    if (!subject || !scores) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    // Data is saved to Walrus on the client side — nothing to do here
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
}

export async function GET() {
  // Analytics are aggregated client-side from Walrus blobs
  return NextResponse.json({});
}
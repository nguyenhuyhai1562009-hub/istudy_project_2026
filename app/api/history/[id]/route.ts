import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const history = await kv.lrange<any>("history", 0, -1);
    const updated = history.filter((item) => String(item.id) !== id);
    await kv.del("history");
    if (updated.length > 0) {
      await kv.lpush("history", ...updated.reverse());
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
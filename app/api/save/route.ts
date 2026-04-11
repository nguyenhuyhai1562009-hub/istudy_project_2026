export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export async function POST(req: Request) {
  const data = await req.json();

  const id = crypto.randomUUID();

  const dataDir = path.join(process.cwd(), "data");
  const resultPath = path.join(dataDir, `${id}.json`);
  const historyPath = path.join(dataDir, "history.json");

  fs.mkdirSync(dataDir, { recursive: true });

  // ✅ save result
  fs.writeFileSync(
    resultPath,
    JSON.stringify(data, null, 2)
  );

  // ✅ update history
  let history: any[] = [];

  if (fs.existsSync(historyPath)) {
    history = JSON.parse(
      fs.readFileSync(historyPath, "utf-8")
    );
  }

  history.unshift({
    id,
    prompt: data.prompt,
    createdAt: Date.now(),
  });

  fs.writeFileSync(
    historyPath,
    JSON.stringify(history, null, 2)
  );

  return NextResponse.json({
    id,
    url: `/result/${id}`,
  });
}

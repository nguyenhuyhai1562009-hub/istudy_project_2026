import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const filePath = path.join(
  process.cwd(),
  "data",
  "history.json"
);

export async function POST() {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    // overwrite file with empty array
    fs.writeFileSync(filePath, JSON.stringify([], null, 2));

    return NextResponse.json({
      success: true,
    });

  } catch (error) {
    console.error("CLEAR HISTORY ERROR:", error);

    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}
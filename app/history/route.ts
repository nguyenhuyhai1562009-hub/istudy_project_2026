import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data", "history.json");

export async function GET() {
  try {
    // create folder if missing
    if (!fs.existsSync("data")) {
      fs.mkdirSync("data");
    }

    // create file if missing
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, "[]");
    }

    const data = fs.readFileSync(filePath, "utf-8");

    return NextResponse.json(JSON.parse(data));
  } catch (err) {
    return NextResponse.json([]);
  }
}

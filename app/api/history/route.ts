import { NextResponse } from "next/server";

import fs from "fs";
import path from "path";

const filePath = path.join(
  process.cwd(),
  "data",
  "history.json"
);

export async function GET() {

  try {

    if (!fs.existsSync(filePath)) {

      return NextResponse.json([]);

    }

    const raw =
      fs.readFileSync(
        filePath,
        "utf-8"
      );

    const history =
      JSON.parse(raw || "[]");

    return NextResponse.json(
      history
    );

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      [],
      {
        status: 500,
      }
    );

  }

}
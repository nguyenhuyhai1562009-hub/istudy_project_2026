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

    fs.writeFileSync(
      filePath,
      "[]",
      "utf-8"
    );

    return NextResponse.json({
      success: true,
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      }
    );

  }

}
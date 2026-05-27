import { NextResponse } from "next/server";

import fs from "fs";
import path from "path";

const filePath = path.join(
  process.cwd(),
  "data",
  "history.json"
);

export async function DELETE(
  req: Request,
  context: { params: any }
) {
  const { id } = context.params;

  try {

    if (!fs.existsSync(filePath)) {

      return NextResponse.json(
        {
          success: false,
          message: "History file not found.",
        },
        {
          status: 404,
        }
      );

    }

    const raw = fs.readFileSync(
      filePath,
      "utf-8"
    );

    const history = JSON.parse(raw);

    const updatedHistory =
      history.filter(
        (item: any) =>
          String(item.id) !== id
      );

    fs.writeFileSync(
      filePath,
      JSON.stringify(
        updatedHistory,
        null,
        2
      )
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
import { NextRequest, NextResponse } from "next/server";

import fs from "fs";
import path from "path";

const filePath = path.join(
  process.cwd(),
  "data",
  "history.json"
);

export async function DELETE(
  req: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const params = await context.params;
  
  try {

    if (!fs.existsSync(filePath)) {

      return NextResponse.json(
        {
          success: false,
        },
        {
          status: 404,
        }
      );

    }

    const raw =
      fs.readFileSync(
        filePath,
        "utf-8"
      );

    const history =
      JSON.parse(raw || "[]");

    const updated =
      history.filter(
        (item: any) =>
          String(item.id) !==
          params.id
      );

    fs.writeFileSync(
      filePath,
      JSON.stringify(
        updated,
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
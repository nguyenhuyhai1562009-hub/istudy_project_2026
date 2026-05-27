import { NextResponse } from "next/server";

import fs from "fs";
import path from "path";

const filePath = path.join(
  process.cwd(),
  "data",
  "history.json"
);

export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {

  try {

    // --------------------
    // GET ID
    // --------------------

    const { id } =
      await params;

    const numericId =
      Number(id);

    console.log(
      "DELETE ID:",
      numericId
    );

    // --------------------
    // FILE CHECK
    // --------------------

    if (!fs.existsSync(filePath)) {

      return NextResponse.json({
        success: false,
      });

    }

    // --------------------
    // LOAD HISTORY
    // --------------------

    const raw =
      fs.readFileSync(
        filePath,
        "utf-8"
      );

    const history =
      JSON.parse(raw || "[]");

    // --------------------
    // DELETE ITEM
    // --------------------

    const updatedHistory =
      history.filter(
        (item: any) =>
          item.id !== numericId
      );

    // --------------------
    // SAVE FILE
    // --------------------

    fs.writeFileSync(
      filePath,
      JSON.stringify(
        updatedHistory,
        null,
        2
      )
    );

    console.log(
      "CHAT DELETED"
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
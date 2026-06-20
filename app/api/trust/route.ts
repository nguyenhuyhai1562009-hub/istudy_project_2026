import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const result = {
      message: "Success",
      data: body,
    };

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[trust_api_error]", error);
    
    return NextResponse.json(
      { error: "Internal Server Error" }, 
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY!
);

export async function POST(req: Request) {
  const { prompt, openaiText, geminiText, judge } =
    await req.json();

  const comparisonPrompt = `
User question:
${prompt}

Answer A:
${openaiText}

Answer B:
${geminiText}

Return JSON:
{
 "summary": "",
 "best_answer": ""
}
`;

  let resultData;

  // ✅ Mock mode if no API keys
  const useMock =
    !process.env.OPENAI_API_KEY ||
    !process.env.GEMINI_API_KEY;

  if (useMock) {
    const best =
      openaiText.length > geminiText.length
        ? "A"
        : "B";

    resultData = {
      summary:
        "Mock evaluation based on answer length.",
      best_answer: best,
    };
  } else {
    /*
    // 🔴 OLD CODE (OpenAI)
    if (judge === "openai") {
      const result =
        await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "user", content: comparisonPrompt },
          ],
        });

      resultData = JSON.parse(
        result.choices[0].message.content!
      );
    }

    // 🔴 OLD CODE (Gemini)
    if (judge === "gemini") {
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
      });

      const result =
        await model.generateContent(
          comparisonPrompt
        );

      resultData = JSON.parse(
        result.response.text()
      );
    }
    */

    // (Optional) fallback if you later re-enable APIs
    resultData = {
      summary: "API mode not implemented.",
      best_answer: "A",
    };
  }

  const filePath = path.join(
    process.cwd(),
    "data",
    "history.json"
  );

  // create folder if missing
  fs.mkdirSync(path.dirname(filePath), {
    recursive: true,
  });

  let history = [];

  if (fs.existsSync(filePath)) {
    history = JSON.parse(
      fs.readFileSync(filePath, "utf-8")
    );
  }

  const newEntry = {
    id: Date.now(),
    prompt,
    openaiText,
    geminiText,
    summary: resultData.summary,
    best_answer: resultData.best_answer,
    judge,
    createdAt: new Date(),
  };

  history.unshift(newEntry);

  fs.writeFileSync(
    filePath,
    JSON.stringify(history, null, 2)
  );

  return NextResponse.json(resultData);
}
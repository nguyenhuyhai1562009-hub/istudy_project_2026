import fs from "fs";
import path from "path";

export default async function ResultPage({
  params,
}: {
  params: { id: string };
}) {
  const filePath = path.join(
    process.cwd(),
    "data",
    `${params.id}.json`
  );

  if (!fs.existsSync(filePath)) {
    return <div>Result not found</div>;
  }

  const data = JSON.parse(
    fs.readFileSync(filePath, "utf-8")
  );

  return (
    <div style={{ padding: 30 }}>
      <h1>Saved Comparison</h1>

      <h2>Prompt</h2>
      <p>{data.prompt}</p>

      <h2>OpenAI</h2>
      <p>{data.openai}</p>

      <h2>Gemini</h2>
      <p>{data.gemini}</p>

      <h2>Summary</h2>
      <p>{data.summary}</p>

      <h2>Best Answer</h2>
      <p>{data.best}</p>
    </div>
  );
}

import fs from "fs";
import path from "path";

export default async function ResultPage({
  params,
}: {
  params: {
    id: string;
  };
}) {

  const filePath = path.join(
    process.cwd(),
    "data",
    "history.json"
  );

  if (!fs.existsSync(filePath)) {

    return (
      <div className="p-10">
        Result not found.
      </div>
    );

  }

  const raw =
    fs.readFileSync(
      filePath,
      "utf-8"
    );

  const history =
    JSON.parse(raw || "[]");

  const item =
    history.find(
      (x: any) =>
        String(x.id) ===
        params.id
    );

  if (!item) {

    return (
      <div className="p-10">
        Chat not found.
      </div>
    );

  }

  return (
    <main className="min-h-screen bg-black text-white">

      <div className="max-w-4xl mx-auto p-6 space-y-6">

        <h1 className="text-4xl font-bold">
          Saved Chat
        </h1>

        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6">

          <h2 className="text-xl font-semibold mb-3">
            Question
          </h2>

          <p>{item.question}</p>

        </div>

        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6">

          <h2 className="text-xl font-semibold mb-3">
            Response 1
          </h2>

          <p>{item.response1}</p>

        </div>

        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6">

          <h2 className="text-xl font-semibold mb-3">
            Response 2
          </h2>

          <p>{item.response2}</p>

        </div>

        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6">

          <h2 className="text-xl font-semibold mb-3">
            Final Synthesis
          </h2>

          <p>
            {
              item.result
                ?.finalSynthesis
            }
          </p>

        </div>

      </div>

    </main>
  );

}
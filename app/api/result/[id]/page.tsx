"use client";

import { use, useEffect, useState } from "react";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

// If this page uses dynamic routing, define the params type as a Promise
export default function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<string | null>(null);

  // Unwrap the params safely using React.use()
  const { id } = use(params);

  useEffect(() => {
    setMounted(true);
    // Any logic that interacts with browser APIs or crypto goes here
    console.log("Loading data for ID:", id);
  }, [id]);

  if (!mounted) return <div>Loading...</div>;

  return (
    <main>
      <h1>Study Result</h1>
      <p>ID: {id}</p>
    </main>
  );
}
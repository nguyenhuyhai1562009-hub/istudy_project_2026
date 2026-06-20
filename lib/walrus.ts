// lib/walrus.ts
const WALRUS_PUBLISHER = "https://publisher.walrus-testnet.walrus.space";
const WALRUS_AGGREGATOR = "https://aggregator.walrus-testnet.walrus.space";

export type LearningRecord = {
  userId: string;
  subject: string;
  question: string;
  scores: {
    knowledge: number;
    application: number;
    analysis: number;
    evaluation: number;
  };
  estimatedScore: string;
  improvements: { category: string; defect: string }[];
  createdAt: string;
};

export async function uploadToWalrus(record: LearningRecord): Promise<string | null> {
  try {
    const blob = new Blob([JSON.stringify(record)], { type: "application/json" });
    const res = await fetch(`${WALRUS_PUBLISHER}/v1/blobs?epochs=10`, { method: "PUT", body: blob });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.newlyCreated?.blobObject?.blobId || data?.alreadyCertified?.blobId || null;
  } catch (e) {
    console.warn("Walrus upload failed:", e);
    return null;
  }
}

export async function fetchFromWalrus(blobId: string): Promise<LearningRecord | null> {
  try {
    const res = await fetch(`${WALRUS_AGGREGATOR}/v1/blobs/${blobId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn("Walrus fetch failed:", e);
    return null;
  }
}

// ── Local index — safely guarded for SSR ──────────────────────────────────────
const INDEX_KEY = "walrus_blob_index";

type BlobIndexEntry = { blobId: string; subject: string; createdAt: string };

const isBrowser = typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export function saveBlobIndexLocal(entry: BlobIndexEntry) {
  if (!isBrowser) return;
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    const list: BlobIndexEntry[] = raw ? JSON.parse(raw) : [];
    list.unshift(entry);
    localStorage.setItem(INDEX_KEY, JSON.stringify(list.slice(0, 200)));
  } catch (e) {
    console.warn("Failed to save blob index locally:", e);
  }
}

export function getBlobIndexLocal(): BlobIndexEntry[] {
  if (!isBrowser) return [];
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
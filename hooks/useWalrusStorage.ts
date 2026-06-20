"use client";
import { useCallback } from "react";

export type SubjectSummary = {
  sessions: number;
  averages: { knowledge: number; application: number; analysis: number; evaluation: number };
  recentDefects: string[];
};

export type LearningRecord = {
  userId: string;
  subject: string;
  question: string;
  scores: { knowledge: number; application: number; analysis: number; evaluation: number };
  estimatedScore: string;
  improvements: { category: string; defect: string }[];
  createdAt: string;
};

const WALRUS_PUBLISHER = "https://publisher.walrus-testnet.walrus.space";
const WALRUS_AGGREGATOR = "https://aggregator.walrus-testnet.walrus.space";
const INDEX_KEY = "walrus_blob_index";

type BlobIndexEntry = { blobId: string; subject: string; createdAt: string };

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function getBlobIndex(): BlobIndexEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBlobIndex(entry: BlobIndexEntry) {
  if (!isBrowser()) return;
  try {
    const list = getBlobIndex();
    list.unshift(entry);
    window.localStorage.setItem(INDEX_KEY, JSON.stringify(list.slice(0, 200)));
  } catch (e) {
    console.warn("Failed to save blob index:", e);
  }
}

async function uploadToWalrus(record: LearningRecord): Promise<string | null> {
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

async function fetchFromWalrus(blobId: string): Promise<LearningRecord | null> {
  try {
    const res = await fetch(`${WALRUS_AGGREGATOR}/v1/blobs/${blobId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn("Walrus fetch failed:", e);
    return null;
  }
}

export function useWalrusStorage() {
  async function saveRecord(address: string | null, record: Omit<LearningRecord, "userId">): Promise<string | null> {
    if (!isBrowser()) return null;
    try {
      const fullRecord: LearningRecord = { ...record, userId: address || "anonymous" };
      const blobId = await uploadToWalrus(fullRecord);
      if (!blobId) return null;
      saveBlobIndex({ blobId, subject: record.subject, createdAt: record.createdAt });
      return blobId;
    } catch (e) {
      console.warn("saveRecord failed:", e);
      return null;
    }
  }

  async function fetchAnalytics(): Promise<Record<string, SubjectSummary>> {
    if (!isBrowser()) return {};
    const index = getBlobIndex();
    if (index.length === 0) return {};

    const records = await Promise.all(index.slice(0, 50).map(e => fetchFromWalrus(e.blobId)));
    const valid = records.filter((r): r is LearningRecord => r !== null);

    const bySubject: Record<string, LearningRecord[]> = {};
    valid.forEach(r => {
      const key = r.subject.toLowerCase();
      if (!bySubject[key]) bySubject[key] = [];
      bySubject[key].push(r);
    });

    const clamp = (n: number) => Math.min(5, Math.max(0, n));
    const summary: Record<string, SubjectSummary> = {};

    Object.entries(bySubject).forEach(([subject, entries]) => {
      const avg = (key: keyof LearningRecord["scores"]) =>
        Math.round((entries.reduce((acc, e) => acc + clamp(e.scores[key]), 0) / entries.length) * 10) / 10;
      summary[subject] = {
        sessions: entries.length,
        averages: { knowledge: avg("knowledge"), application: avg("application"), analysis: avg("analysis"), evaluation: avg("evaluation") },
        recentDefects: entries.flatMap(e => (e.improvements || []).map(i => i.category)).filter(Boolean),
      };
    });

    return summary;
  }

  async function fetchHistory(): Promise<LearningRecord[]> {
    if (!isBrowser()) return [];
    const index = getBlobIndex();
    if (index.length === 0) return [];
    const records = await Promise.all(index.slice(0, 50).map(e => fetchFromWalrus(e.blobId)));
    return records.filter((r): r is LearningRecord => r !== null);
  }

  return { saveRecord, fetchAnalytics, fetchHistory };
}
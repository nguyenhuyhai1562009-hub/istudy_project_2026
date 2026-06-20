"use client";
import { useState, useCallback } from "react";
import { uploadToWalrus, fetchFromWalrus, saveBlobIndexLocal, getBlobIndexLocal, type LearningRecord } from "@/lib/walrus";

export type SubjectSummary = {
  sessions: number;
  averages: { knowledge: number; application: number; analysis: number; evaluation: number };
  recentDefects: string[];
};

export function useWalrusStorage() {
  // Save a new evaluation record — works with or without a logged-in zkLogin address
  async function saveRecord(address: string | null, record: Omit<LearningRecord, "userId">): Promise<string | null> {
    try {
      const fullRecord: LearningRecord = { ...record, userId: address || "anonymous" };
      const blobId = await uploadToWalrus(fullRecord);
      if (!blobId) return null;
      saveBlobIndexLocal({ blobId, subject: record.subject, createdAt: record.createdAt });
      return blobId;
    } catch (e) {
      console.warn("saveRecord failed:", e);
      return null;
    }
  }

  // Fetch and aggregate all records into per-subject summary (replaces /api/weakness GET)
  async function fetchAnalytics(): Promise<Record<string, SubjectSummary>> {
    const index = getBlobIndexLocal();
    if (index.length === 0) return {};

    const records = await Promise.all(
      index.slice(0, 50).map(entry => fetchFromWalrus(entry.blobId))
    );

    const valid = records.filter((r): r is LearningRecord => r !== null);
    const bySubject: Record<string, LearningRecord[]> = {};
    valid.forEach(r => {
      const key = r.subject.toLowerCase();
      if (!bySubject[key]) bySubject[key] = [];
      bySubject[key].push(r);
    });

    const summary: Record<string, SubjectSummary> = {};
    const clamp = (n: number) => Math.min(5, Math.max(0, n));

    Object.entries(bySubject).forEach(([subject, entries]) => {
      const avg = (key: keyof LearningRecord["scores"]) =>
        Math.round((entries.reduce((acc, e) => acc + clamp(e.scores[key]), 0) / entries.length) * 10) / 10;

      summary[subject] = {
        sessions: entries.length,
        averages: {
          knowledge: avg("knowledge"),
          application: avg("application"),
          analysis: avg("analysis"),
          evaluation: avg("evaluation"),
        },
        recentDefects: entries.flatMap(e => (e.improvements || []).map(i => i.category)).filter(Boolean),
      };
    });

    return summary;
  }

  // Fetch raw records as a flat history list (replaces /api/history GET)
  async function fetchHistory(): Promise<LearningRecord[]> {
    const index = getBlobIndexLocal();
    if (index.length === 0) return [];
    const records = await Promise.all(
      index.slice(0, 50).map(entry => fetchFromWalrus(entry.blobId))
    );
    return records.filter((r): r is LearningRecord => r !== null);
  }

  return { saveRecord, fetchAnalytics, fetchHistory };
}
"use client";

import { useState, useRef, useEffect } from "react";

const MODES = [
  {
    key: "socratic",
    icon: "🧭",
    label: "Guide Me",
    desc: "AI asks you leading questions instead of giving answers. Best for when you want to think through the problem yourself.",
  },
  {
    key: "scaffold",
    icon: "🧱",
    label: "Base Concepts",
    desc: "Breaks the topic down from first principles. Definitions first, then step-by-step logical chain. Good when you're lost.",
  },
  {
    key: "exam_drill",
    icon: "🎯",
    label: "Exam Drill",
    desc: "Mark scheme mode. AI tells you exactly what keywords, arguments, and structure score marks. Best right before an exam.",
  },
];

type Props = {
  active: string | null;
  onChange: (key: string | null) => void;
};

export default function StudyModePicker({ active, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const activeMode = MODES.find((m) => m.key === active);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          display: "flex", alignItems: "center", gap: 6, padding: "4px 11px 4px 9px",
          borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
          background: active ? "#1e1b4b" : "transparent",
          border: `0.5px solid ${active ? "#3730a3" : "#1e1e1e"}`,
          color: active ? "#a5b4fc" : "#555",
          transition: "all 0.12s",
        }}
      >
        <span style={{ fontSize: 13 }}>{activeMode ? activeMode.icon : "⚡"}</span>
        <span>{activeMode ? activeMode.label : "Study mode"}</span>
        <span style={{ fontSize: 9, color: active ? "#6366f1" : "#333", marginLeft: 2 }}>▾</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: 0,
          background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 11,
          overflow: "hidden", zIndex: 50, minWidth: 220,
          boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
        }}>
          {/* None option */}
          <button
            onClick={() => { onChange(null); setOpen(false); }}
            style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 13px",
              background: !active ? "#0f0f1a" : "transparent",
              border: "none", borderBottom: "0.5px solid #161616",
              color: !active ? "#818cf8" : "#555", fontSize: 12, cursor: "pointer",
              fontFamily: "inherit", textAlign: "left", transition: "background 0.1s",
            }}
            onMouseEnter={e => { if(active)(e.currentTarget as HTMLElement).style.background="#0f0f0f"; }}
            onMouseLeave={e => { if(active)(e.currentTarget as HTMLElement).style.background="transparent"; }}
          >
            <span style={{ fontSize: 13 }}>💬</span>
            <span>No mode — just evaluate</span>
            {!active && <span style={{ marginLeft: "auto", fontSize: 10, color: "#4f46e5" }}>✓</span>}
          </button>

          {MODES.map((m, i) => (
            <div
              key={m.key}
              onMouseEnter={() => setHovered(m.key)}
              onMouseLeave={() => setHovered(null)}
              style={{ position: "relative" }}
            >
              <button
                onClick={() => { onChange(active === m.key ? null : m.key); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  padding: "9px 13px",
                  background: active === m.key ? "#0f0f1a" : hovered === m.key ? "#0d0d0d" : "transparent",
                  border: "none",
                  borderBottom: i < MODES.length - 1 ? "0.5px solid #161616" : "none",
                  color: active === m.key ? "#a5b4fc" : "#bbb", fontSize: 12, cursor: "pointer",
                  fontFamily: "inherit", textAlign: "left", transition: "background 0.1s",
                }}
              >
                <span style={{ fontSize: 13, flexShrink: 0 }}>{m.icon}</span>
                <span style={{ flex: 1 }}>{m.label}</span>
                {active === m.key && <span style={{ fontSize: 10, color: "#4f46e5" }}>✓</span>}
                <span style={{ fontSize: 10, color: "#333", marginLeft: 4 }}>ⓘ</span>
              </button>

              {/* Tooltip on hover */}
              {hovered === m.key && (
                <div style={{
                  position: "absolute", left: "calc(100% + 8px)", top: 0,
                  background: "#0a0a0a", border: "0.5px solid #1e1e1e", borderRadius: 9,
                  padding: "10px 13px", width: 220, zIndex: 60,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                  pointerEvents: "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span>{m.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#c7d2fe" }}>{m.label}</span>
                  </div>
                  <p style={{ fontSize: 11, color: "#666", lineHeight: 1.6, margin: 0 }}>{m.desc}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
"use client";

import { useState, useRef, useEffect } from "react";

const MODES = [
  {
    key: "socratic",
    icon: "🧭",
    label: "Guide Me",
    desc: "AI asks you leading questions instead of giving answers. Best for when you want to think through the problem yourself.",
    activeColor: "#ca8a04",   // yellow
    activeBg: "#1c1600",
    activeText: "#fde68a",
  },
  {
    key: "scaffold",
    icon: "🧱",
    label: "Base Concepts",
    desc: "Breaks the topic down from first principles. Definitions first, then step-by-step logical chain. Good when you're lost.",
    activeColor: "#c2410c",   // orange
    activeBg: "#1c0e00",
    activeText: "#fed7aa",
  },
  {
    key: "exam_drill",
    icon: "🎯",
    label: "Exam Drill",
    desc: "Mark scheme mode. AI tells you exactly what keywords, arguments, and structure score marks. Best right before an exam.",
    activeColor: "#dc2626",   // red
    activeBg: "#1c0505",
    activeText: "#fecaca",
  },
];

type Props = {
  active: string | null;
  onChange: (key: string | null) => void;
};

export default function StudyModePicker({ active, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setHovered(null);
        setTooltipPos(null);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const activeMode = MODES.find((m) => m.key === active);

  function handleRowMouseEnter(key: string, e: React.MouseEvent<HTMLButtonElement>) {
    setHovered(key);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    // Tooltip width is 220, so we subtract 220 + 8px gap = 228px from the left edge of the button
    setTooltipPos({ top: rect.top, left: rect.left - 228 });
  }

  function handleRowMouseLeave() {
    setHovered(null);
    setTooltipPos(null);
  }

  const hoveredMode = MODES.find((m) => m.key === hovered);

  return (
    <>
      <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
        {/* Trigger */}
        <button
          onClick={() => { setOpen((p) => !p); setHovered(null); setTooltipPos(null); }}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "4px 11px 4px 9px",
            borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
            background: activeMode ? activeMode.activeBg : "transparent",
            border: `0.5px solid ${activeMode ? activeMode.activeColor : "#1e1e1e"}`,
            color: activeMode ? activeMode.activeText : "#555",
            transition: "all 0.12s",
          }}
        >
          <span style={{ fontSize: 13 }}>{activeMode ? activeMode.icon : "⚡"}</span>
          <span>{activeMode ? activeMode.label : "Study mode"}</span>
          <span style={{ fontSize: 9, color: activeMode ? activeMode.activeColor : "#333", marginLeft: 2 }}>
            {open ? "▴" : "▾"}
          </span>
        </button>

        {/* Dropdown */}
        {open && (
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0,
            background: "#111", border: "0.5px solid #1e1e1e", borderRadius: 11,
            zIndex: 50, minWidth: 210,
            boxShadow: "0 8px 24px rgba(0,0,0,0.7)",
          }}>
            {/* No mode */}
            <button
              onClick={() => { onChange(null); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                padding: "9px 13px",
                background: !active ? "#0f0f1a" : "transparent",
                border: "none", borderBottom: "0.5px solid #161616",
                color: !active ? "#818cf8" : "#666", fontSize: 12, cursor: "pointer",
                fontFamily: "inherit", textAlign: "left", borderRadius: "11px 11px 0 0",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => { if (active) (e.currentTarget).style.background = "#0f0f0f"; }}
              onMouseLeave={e => { if (active) (e.currentTarget).style.background = "transparent"; }}
            >
              <span style={{ fontSize: 13 }}>💬</span>
              <span style={{ flex: 1 }}>No mode — just evaluate</span>
              {!active && <span style={{ fontSize: 10, color: "#4f46e5" }}>✓</span>}
            </button>

            {MODES.map((m, i) => (
              <button
                key={m.key}
                onClick={() => { onChange(active === m.key ? null : m.key); setOpen(false); }}
                onMouseEnter={(e) => handleRowMouseEnter(m.key, e)}
                onMouseLeave={handleRowMouseLeave}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  padding: "9px 13px",
                  background: active === m.key ? m.activeBg : hovered === m.key ? "#0d0d0d" : "transparent",
                  border: "none",
                  borderBottom: i < MODES.length - 1 ? "0.5px solid #161616" : "none",
                  borderRadius: i === MODES.length - 1 ? "0 0 11px 11px" : "0",
                  color: active === m.key ? m.activeText : "#bbb",
                  fontSize: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                  transition: "background 0.1s",
                }}
              >
                <span style={{ fontSize: 13, flexShrink: 0 }}>{m.icon}</span>
                <span style={{ flex: 1 }}>{m.label}</span>
                {active === m.key && <span style={{ fontSize: 10, color: m.activeColor }}>✓</span>}
                <span style={{ fontSize: 10, color: "#2a2a2a", marginLeft: 4 }}>ⓘ</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tooltip — fixed positioned */}
      {hoveredMode && tooltipPos && (
        <div style={{
          position: "fixed", top: tooltipPos.top, left: tooltipPos.left,
          background: "#0a0a0a", border: "0.5px solid #222", borderRadius: 10,
          padding: "11px 14px", width: 220, zIndex: 9999,
          boxShadow: "0 6px 20px rgba(0,0,0,0.7)",
          pointerEvents: "none",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span>{hoveredMode.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: hoveredMode.activeText }}>{hoveredMode.label}</span>
          </div>
          <p style={{ fontSize: 11, color: "#666", lineHeight: 1.6, margin: 0 }}>{hoveredMode.desc}</p>
        </div>
      )}
    </>
  );
}
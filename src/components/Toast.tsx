"use client";

import { useEffect } from "react";

interface Props {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: Props) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: { bg: "var(--success-dim)", border: "rgba(77,255,145,0.3)", text: "var(--success)", icon: "✓" },
    error: { bg: "var(--danger-dim)", border: "rgba(255,77,77,0.3)", text: "var(--danger)", icon: "✕" },
    info: { bg: "var(--bg-elevated)", border: "var(--border)", text: "var(--text-secondary)", icon: "i" },
  };
  const c = colors[type];

  return (
    <div
      style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 200,
        background: "var(--bg-card)",
        border: `1px solid ${c.border}`,
        borderRadius: 12,
        padding: "14px 18px",
        display: "flex", alignItems: "center", gap: 12,
        maxWidth: 380, boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        animation: "slideInRight 0.2s ease",
      }}
    >
      <div style={{
        width: 24, height: 24, borderRadius: "50%",
        background: c.bg, border: `1px solid ${c.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, fontWeight: 700, color: c.text, flexShrink: 0,
      }}>
        {c.icon}
      </div>
      <p style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.4, flex: 1 }}>{message}</p>
      <button
        onClick={onClose}
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2, flexShrink: 0 }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(24px); opacity: 0 }
          to { transform: translateX(0); opacity: 1 }
        }
      `}</style>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  isOpen: boolean;
  apiKey: string;
  onSave: (key: string) => void;
  onClose: () => void;
  contextWindow: number;
  onSaveContextWindow: (n: number) => void;
  suggestionPrompt: string;
  onSaveSuggestionPrompt: (s: string) => void;
}

export default function SettingsModal({
  isOpen,
  apiKey,
  onSave,
  onClose,
  contextWindow,
  onSaveContextWindow,
  suggestionPrompt,
  onSaveSuggestionPrompt,
}: Props) {
  const [draftKey, setDraftKey] = useState(apiKey);
  const [draftWindow, setDraftWindow] = useState(contextWindow);
  const [draftPrompt, setDraftPrompt] = useState(suggestionPrompt);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDraftKey(apiKey);
      setDraftWindow(contextWindow);
      setDraftPrompt(suggestionPrompt);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, apiKey, contextWindow, suggestionPrompt]);

  function handleSave() {
    onSave(draftKey.trim());
    onSaveContextWindow(Math.max(1, Math.min(10, draftWindow)));
    onSaveSuggestionPrompt(draftPrompt.trim() || suggestionPrompt);
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }

  if (!isOpen) return null;

  const fieldLabel: React.CSSProperties = {
    fontSize: 12,
    color: "var(--muted)",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--panel-2)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    padding: "8px 10px",
    borderRadius: 6,
    fontSize: 13,
    outline: "none",
  };

  const hint: React.CSSProperties = {
    fontSize: 11,
    color: "var(--muted)",
    marginTop: 6,
    lineHeight: 1.5,
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }}
      />

      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 400,
          background: "var(--panel)",
          borderLeft: "1px solid var(--border)",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.4)",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 14 }}>Settings</span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 18, cursor: "pointer", lineHeight: 1, padding: "0 2px" }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* API Key */}
          <label style={{ display: "block" }}>
            <div style={fieldLabel}>Groq API Key</div>
            <input
              ref={inputRef}
              type="password"
              value={draftKey}
              onChange={(e) => setDraftKey(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="gsk_..."
              style={inputStyle}
            />
            <div style={hint}>
              Kept in memory only, cleared on page reload. Never sent to any server other than Groq.
            </div>
          </label>

          {/* Context window */}
          <label style={{ display: "block" }}>
            <div style={fieldLabel}>Context window (chunks)</div>
            <input
              type="number"
              min={1}
              max={10}
              value={draftWindow}
              onChange={(e) => setDraftWindow(Number(e.target.value))}
              style={{ ...inputStyle, width: 80 }}
            />
            <div style={hint}>
              How many ~30s transcript chunks to send as context per suggestion refresh. Default: 3.
            </div>
          </label>

          {/* Suggestion prompt */}
          <label style={{ display: "block" }}>
            <div style={fieldLabel}>Live suggestions system prompt</div>
            <textarea
              value={draftPrompt}
              onChange={(e) => setDraftPrompt(e.target.value)}
              rows={10}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
            />
            <div style={hint}>
              System prompt sent to the model on every suggestion refresh.
            </div>
          </label>

        </div>

        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "var(--panel-2)",
              color: "var(--muted)",
              border: "1px solid var(--border)",
              padding: "7px 14px",
              borderRadius: 6,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              background: "var(--accent)",
              color: "#000",
              border: "none",
              padding: "7px 14px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Save
          </button>
        </div>
      </div>
    </>
  );
}

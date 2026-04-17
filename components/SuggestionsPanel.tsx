"use client";

import SuggestionCard, { Suggestion } from "./SuggestionCard";

export interface SuggestionBatch {
  id: number;
  timestamp: string;
  suggestions: Suggestion[];
}

interface Props {
  batches: SuggestionBatch[];
  onReload: () => void;
  countdown: number;
  onSuggestionClick: (suggestion: Suggestion) => void;
}

export default function SuggestionsPanel({ batches, onReload, countdown, onSuggestionClick }: Props) {
  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        minHeight: 0,
      }}
    >
      <header
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--border)",
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: 1,
          color: "var(--muted)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>2. Live Suggestions</span>
        <span>{batches.length} batch{batches.length !== 1 ? "es" : ""}</span>
      </header>

      {/* Reload row */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        <button
          onClick={onReload}
          style={{
            background: "var(--panel-2)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            padding: "6px 12px",
            borderRadius: 6,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          ↻ Reload suggestions
        </button>
        <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: "auto" }}>
          auto-refresh in {countdown}s
        </span>
      </div>

      {/* Suggestions body */}
      <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
        <div
          style={{
            background: "rgba(110,168,254,.08)",
            border: "1px solid rgba(110,168,254,.3)",
            color: "#cfd3dc",
            padding: "8px 12px",
            fontSize: 12,
            borderRadius: 6,
            marginBottom: 12,
            lineHeight: 1.5,
          }}
        >
          On reload (or auto every ~30s), generate <strong>3 fresh suggestions</strong> from recent transcript context.
          New batch appears at the top; older batches push down (faded). Each is a tappable card.
        </div>

        {batches.length === 0 ? (
          <div
            style={{
              color: "var(--muted)",
              fontSize: 13,
              textAlign: "center",
              padding: "30px 10px",
              lineHeight: 1.5,
            }}
          >
            Suggestions appear here once recording starts.
          </div>
        ) : (
          batches.map((batch, batchIndex) => (
            <div key={batch.id}>
              {batch.suggestions.map((s, i) => (
                <SuggestionCard
                  key={i}
                  suggestion={s}
                  fresh={batchIndex === 0}
                  onClick={onSuggestionClick}
                />
              ))}
              <div
                style={{
                  fontSize: 10,
                  color: "var(--muted)",
                  textAlign: "center",
                  padding: "6px 0",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                — Batch {batch.id} · {batch.timestamp} —
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

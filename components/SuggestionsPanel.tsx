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
  isLoading: boolean;
  isRecording: boolean;
  onSuggestionClick: (suggestion: Suggestion) => void;
}

export default function SuggestionsPanel({
  batches,
  onReload,
  countdown,
  isLoading,
  isRecording,
  onSuggestionClick,
}: Props) {
  const countdownLabel = isRecording
    ? `next suggestions in ${countdown}s`
    : "suggestions append every 30s";

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
          disabled={isLoading}
          style={{
            background: "var(--panel-2)",
            color: isLoading ? "var(--muted)" : "var(--text)",
            border: "1px solid var(--border)",
            padding: "6px 12px",
            borderRadius: 6,
            fontSize: 12,
            cursor: isLoading ? "default" : "pointer",
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {isLoading ? "⟳ Loading…" : "↻ Reload suggestions"}
        </button>
        <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: "auto" }}>
          {countdownLabel}
        </span>
      </div>

      {/* Suggestions body */}
      <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
        {isLoading && batches.length === 0 && (
          <div
            style={{
              color: "var(--muted)",
              fontSize: 13,
              textAlign: "center",
              padding: "30px 10px",
              lineHeight: 1.5,
            }}
          >
            Generating suggestions…
          </div>
        )}

        {isLoading && batches.length > 0 && (
          <div
            style={{
              fontSize: 11,
              color: "var(--muted)",
              textAlign: "center",
              padding: "6px 0 10px",
              letterSpacing: 0.5,
            }}
          >
            ⟳ Generating new batch…
          </div>
        )}

        {!isLoading && batches.length === 0 && (
          <div
            style={{
              color: "var(--muted)",
              fontSize: 13,
              textAlign: "center",
              padding: "30px 10px",
              lineHeight: 1.5,
            }}
          >
            {isRecording
              ? `First suggestions in ${countdown}s…`
              : "Suggestions appear here once recording starts."}
          </div>
        )}

        {batches.map((batch, batchIndex) => (
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
              — Batch {batches.length - batchIndex} · {batch.timestamp} —
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

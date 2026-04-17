"use client";

import { useEffect, useRef, useState } from "react";
import { AudioRecorderState, AudioRecorderActions, TranscriptChunk } from "@/hooks/useAudioRecorder";

interface Props {
  recorder: AudioRecorderState & AudioRecorderActions;
  hasApiKey: boolean;
  apiKey: string;
  onOpenSettings: () => void;
}

type Tab = "transcript" | "summary";

interface SessionSummary {
  summary: string;
  todos: string[];
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function TranscriptPanel({ recorder, hasApiKey, apiKey, onOpenSettings }: Props) {
  const { isRecording, isTranscribing, recordingTime, transcript, micError, startRecording, stopRecording } = recorder;
  const bodyRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<Tab>("transcript");
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Auto-scroll transcript to bottom on new entries.
  useEffect(() => {
    if (activeTab === "transcript" && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [transcript, isTranscribing, activeTab]);


  async function generateSummary() {
    setIsSummarizing(true);
    setSummaryError(null);

    const fullText = transcript
      .filter((c) => !c.isError)
      .map((c) => `[${c.timestamp}] ${c.text}`)
      .join("\n");

    try {
      const res = await fetch("/api/session-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: fullText, apiKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Summary failed");
      setSessionSummary({ summary: data.summary, todos: data.todos });
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : "Summary generation failed");
    } finally {
      setIsSummarizing(false);
    }
  }

  function handleMicClick() {
    if (!hasApiKey) return;
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  const statusText = (() => {
    if (!hasApiKey) return "No API key set — open Settings to add one.";
    if (micError) return micError;
    if (isRecording) return `Recording · ${formatTime(recordingTime)} · transcript updates every 30s.`;
    return "Click mic to start. Transcript updates every 30s.";
  })();

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
      {/* Header */}
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
        <span>1. Mic &amp; Transcript</span>
        <span style={{ color: isRecording ? "var(--danger)" : "var(--muted)" }}>
          {isRecording ? "● recording" : "idle"}
        </span>
      </header>

      {/* Mic controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: 14,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <button
          onClick={handleMicClick}
          disabled={!hasApiKey}
          title={!hasApiKey ? "Set an API key in Settings first" : isRecording ? "Stop recording" : "Start recording"}
          className={isRecording ? "recording-pulse" : ""}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "none",
            cursor: hasApiKey ? "pointer" : "not-allowed",
            background: !hasApiKey ? "var(--border)" : isRecording ? "var(--danger)" : "var(--accent)",
            color: "#fff",
            fontSize: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            opacity: hasApiKey ? 1 : 0.5,
          }}
        >
          {isRecording ? "■" : "●"}
        </button>

        <div style={{ fontSize: 13, lineHeight: 1.4 }}>
          <div style={{ color: micError ? "var(--danger)" : isRecording ? "var(--text)" : "var(--muted)" }}>
            {statusText}
          </div>
          {!hasApiKey && (
            <button
              onClick={onOpenSettings}
              style={{
                marginTop: 4,
                background: "none",
                border: "none",
                color: "var(--accent)",
                fontSize: 12,
                cursor: "pointer",
                padding: 0,
                textDecoration: "underline",
              }}
            >
              Open Settings →
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border)",
          padding: "0 14px",
          gap: 4,
        }}
      >
        {(["transcript", "summary"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: "none",
              border: "none",
              borderBottom: activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
              color: activeTab === tab ? "var(--accent)" : "var(--muted)",
              fontSize: 13,
              fontWeight: activeTab === tab ? 600 : 400,
              padding: "8px 10px",
              cursor: "pointer",
              marginBottom: -1,
              transition: "color 0.15s",
            }}
          >
            {tab === "transcript" ? "Transcript" : "Summary & To-Do"}
            {tab === "summary" && isSummarizing && (
              <span
                style={{
                  marginLeft: 6,
                  display: "inline-block",
                  animation: "spin 1s linear infinite",
                  fontSize: 11,
                }}
              >
                ⟳
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab body */}
      <div ref={bodyRef} style={{ flex: 1, overflowY: "auto", padding: 14 }}>
        {activeTab === "transcript" ? (
          transcript.length === 0 && !isTranscribing && !isRecording ? (
            <div
              style={{
                color: "var(--muted)",
                fontSize: 13,
                textAlign: "center",
                padding: "30px 10px",
                lineHeight: 1.5,
              }}
            >
              No transcript yet — start the mic.
            </div>
          ) : (
            <>
              {transcript.map((chunk, i) => (
                <TranscriptLine key={i} chunk={chunk} />
              ))}
              {isTranscribing && (
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--muted)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 10,
                    fontStyle: "italic",
                  }}
                >
                  <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
                  Transcribing…
                </div>
              )}
            </>
          )
        ) : (
          <SummaryTab
            summary={sessionSummary}
            isLoading={isSummarizing}
            error={summaryError}
            hasTranscript={transcript.length > 0}
            isRecording={isRecording}
            onGenerate={generateSummary}
          />
        )}
      </div>
    </div>
  );
}

function TranscriptLine({ chunk }: { chunk: TranscriptChunk }) {
  return (
    <div
      className="transcript-line-new"
      style={{
        fontSize: 14,
        lineHeight: 1.55,
        marginBottom: 10,
        color: chunk.isError ? "var(--danger)" : "var(--text)",
        display: "flex",
        gap: 6,
      }}
    >
      <span style={{ color: "var(--muted)", fontSize: 11, flexShrink: 0, paddingTop: 2 }}>
        {chunk.timestamp}
      </span>
      <span>{chunk.text}</span>
    </div>
  );
}

function SummaryTab({
  summary,
  isLoading,
  error,
  hasTranscript,
  isRecording,
  onGenerate,
}: {
  summary: SessionSummary | null;
  isLoading: boolean;
  error: string | null;
  hasTranscript: boolean;
  isRecording: boolean;
  onGenerate: () => void;
}) {
  const [checked, setChecked] = useState<boolean[]>([]);

  useEffect(() => {
    if (summary) setChecked(new Array(summary.todos.length).fill(false));
  }, [summary]);

  function toggle(i: number) {
    setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  }

  if (isLoading) {
    return (
      <div
        style={{
          color: "var(--muted)",
          fontSize: 13,
          textAlign: "center",
          padding: "40px 10px",
          lineHeight: 1.6,
        }}
      >
        <div style={{ animation: "spin 1s linear infinite", display: "inline-block", fontSize: 20, marginBottom: 10 }}>
          ⟳
        </div>
        <div>Generating summary…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "20px 0" }}>
        <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>{error}</div>
        {hasTranscript && (
          <button
            onClick={onGenerate}
            style={{
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              padding: "7px 14px",
              borderRadius: 6,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (!summary) {
    return (
      <div
        style={{
          color: "var(--muted)",
          fontSize: 13,
          textAlign: "center",
          padding: "30px 10px",
          lineHeight: 1.6,
        }}
      >
        {isRecording ? (
          "Stop the recording to generate a summary."
        ) : hasTranscript ? (
          <button
            onClick={onGenerate}
            style={{
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              padding: "7px 14px",
              borderRadius: 6,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Generate now
          </button>
        ) : (
          "Begin the meeting first."
        )}
      </div>
    );
  }

  return (
    <div style={{ fontSize: 13, lineHeight: 1.6 }}>
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: 1,
            color: "var(--muted)",
            marginBottom: 8,
            fontWeight: 600,
          }}
        >
          Summary
        </div>
        <p style={{ margin: 0, color: "var(--text)" }}>{summary.summary}</p>
      </div>

      <div>
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: 1,
            color: "var(--muted)",
            marginBottom: 8,
            fontWeight: 600,
          }}
        >
          Top 5 To-Do Items
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {summary.todos.map((todo: string, i: number) => (
            <label key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={checked[i] ?? false}
                onChange={() => toggle(i)}
                style={{ marginTop: 2, flexShrink: 0, accentColor: "var(--accent)", cursor: "pointer" }}
              />
              <span style={{ color: "var(--text)", textDecoration: checked[i] ? "line-through" : "none", opacity: checked[i] ? 0.5 : 1, lineHeight: 1.5 }}>
                {todo}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { AudioRecorderState, AudioRecorderActions, TranscriptChunk } from "@/hooks/useAudioRecorder";

interface Props {
  recorder: AudioRecorderState & AudioRecorderActions;
  hasApiKey: boolean;
  onOpenSettings: () => void;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function TranscriptPanel({ recorder, hasApiKey, onOpenSettings }: Props) {
  const { isRecording, isTranscribing, recordingTime, nextChunkIn, transcript, micError, startRecording, stopRecording } = recorder;
  const bodyRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new transcript entries.
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [transcript, isTranscribing]);

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
            color: isRecording ? "#fff" : "#000",
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

      {/* Transcript body */}
      <div ref={bodyRef} style={{ flex: 1, overflowY: "auto", padding: 14 }}>
        {transcript.length === 0 && !isTranscribing && !isRecording ? (
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
        color: chunk.isError ? "var(--danger)" : "#cfd3dc",
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

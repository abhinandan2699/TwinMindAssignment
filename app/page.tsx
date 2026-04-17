"use client";

import { useState, useEffect } from "react";
import TranscriptPanel from "@/components/TranscriptPanel";
import SuggestionsPanel, { SuggestionBatch } from "@/components/SuggestionsPanel";
import ChatPanel, { ChatMessage } from "@/components/ChatPanel";
import SettingsModal from "@/components/SettingsModal";
import { Suggestion } from "@/components/SuggestionCard";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("groq_api_key");
    if (stored) setApiKey(stored);
  }, []);

  function saveApiKey(key: string) {
    setApiKey(key);
    sessionStorage.setItem("groq_api_key", key);
  }

  const recorder = useAudioRecorder(apiKey || null);

  // Placeholder state for middle and right columns (built in future steps).
  const batches: SuggestionBatch[] = [];
  const messages: ChatMessage[] = [];
  function handleReload() {}
  function handleSuggestionClick(s: Suggestion) { void s; }
  function handleChatSend(t: string) { void t; }

  function handleExport() {
    const session = {
      exportedAt: new Date().toISOString(),
      transcript: recorder.transcript,
      suggestions: [],
      chat: [],
    };
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `twinmind-session-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          borderBottom: "1px solid var(--border)",
          background: "var(--panel)",
          flexShrink: 0,
        }}
      >
        <h1 style={{ fontSize: 14, fontWeight: 600, margin: 0, letterSpacing: 0.3 }}>
          TwinMind — Live Suggestions
        </h1>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={handleExport}
            style={{
              background: "var(--panel-2)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              padding: "5px 12px",
              borderRadius: 6,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            ↓ Export
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            title="Settings"
            style={{
              background: apiKey ? "var(--panel-2)" : "rgba(110,168,254,.15)",
              color: apiKey ? "var(--muted)" : "var(--accent)",
              border: `1px solid ${apiKey ? "var(--border)" : "rgba(110,168,254,.4)"}`,
              padding: "5px 12px",
              borderRadius: 6,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            ⚙ Settings{!apiKey && " — add API key"}
          </button>
        </div>
      </div>

      {/* Three-column layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12,
          padding: 12,
          flex: 1,
          minHeight: 0,
        }}
      >
        <TranscriptPanel
          recorder={recorder}
          hasApiKey={!!apiKey}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <SuggestionsPanel
          batches={batches}
          onReload={handleReload}
          countdown={30}
          onSuggestionClick={handleSuggestionClick}
        />
        <ChatPanel messages={messages} onSend={handleChatSend} />
      </div>

      <SettingsModal
        isOpen={settingsOpen}
        apiKey={apiKey}
        onSave={saveApiKey}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

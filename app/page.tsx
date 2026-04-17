"use client";

import { useState, useEffect } from "react";
import TranscriptPanel from "@/components/TranscriptPanel";
import SuggestionsPanel from "@/components/SuggestionsPanel";
import ChatPanel from "@/components/ChatPanel";
import SettingsModal from "@/components/SettingsModal";
import { Suggestion } from "@/components/SuggestionCard";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSuggestions } from "@/hooks/useSuggestions";
import { useChat } from "@/hooks/useChat";
import { DEFAULT_SUGGESTION_PROMPT, DEFAULT_CHAT_PROMPT } from "@/lib/defaults";

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [contextWindow, setContextWindow] = useState(3);
  const [suggestionPrompt, setSuggestionPrompt] = useState(DEFAULT_SUGGESTION_PROMPT);
  const [chatPrompt, setChatPrompt] = useState(DEFAULT_CHAT_PROMPT);

  useEffect(() => {
    const key = sessionStorage.getItem("groq_api_key");
    if (key) setApiKey(key);
    const win = sessionStorage.getItem("suggestion_context_window");
    if (win) setContextWindow(Number(win));
    const sPrompt = sessionStorage.getItem("suggestion_prompt");
    if (sPrompt) setSuggestionPrompt(sPrompt);
    const cPrompt = sessionStorage.getItem("chat_prompt");
    if (cPrompt) setChatPrompt(cPrompt);
  }, []);

  function saveApiKey(key: string) {
    setApiKey(key);
    sessionStorage.setItem("groq_api_key", key);
  }

  function saveContextWindow(n: number) {
    setContextWindow(n);
    sessionStorage.setItem("suggestion_context_window", String(n));
  }

  function saveSuggestionPrompt(s: string) {
    setSuggestionPrompt(s);
    sessionStorage.setItem("suggestion_prompt", s);
  }

  function saveChatPrompt(s: string) {
    setChatPrompt(s);
    sessionStorage.setItem("chat_prompt", s);
  }

  const recorder = useAudioRecorder(apiKey || null);

  const suggestions = useSuggestions({
    transcript: recorder.transcript,
    isRecording: recorder.isRecording,
    apiKey: apiKey || null,
    contextWindow,
    suggestionPrompt,
  });

  const chat = useChat({
    transcript: recorder.transcript,
    apiKey: apiKey || null,
    chatPrompt,
  });

  function handleSuggestionClick(s: Suggestion) {
    chat.sendMessage(s.text, s.type);
  }

  function handleExport() {
    const session = {
      exportedAt: new Date().toISOString(),
      transcript: recorder.transcript,
      suggestions: suggestions.batches,
      chat: chat.messages,
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
          batches={suggestions.batches}
          onReload={suggestions.manualReload}
          countdown={suggestions.countdown}
          isLoading={suggestions.isLoading}
          isRecording={recorder.isRecording}
          onSuggestionClick={handleSuggestionClick}
        />
        <ChatPanel
          messages={chat.messages}
          isStreaming={chat.isStreaming}
          onSend={chat.sendMessage}
        />
      </div>

      <SettingsModal
        isOpen={settingsOpen}
        apiKey={apiKey}
        onSave={saveApiKey}
        onClose={() => setSettingsOpen(false)}
        contextWindow={contextWindow}
        onSaveContextWindow={saveContextWindow}
        suggestionPrompt={suggestionPrompt}
        onSaveSuggestionPrompt={saveSuggestionPrompt}
        chatPrompt={chatPrompt}
        onSaveChatPrompt={saveChatPrompt}
      />
    </div>
  );
}

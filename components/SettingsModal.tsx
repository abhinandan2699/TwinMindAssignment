"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  isOpen: boolean;
  apiKey: string;
  onSave: (key: string) => void;
  onClose: () => void;
  role: string;
  onSaveRole: (s: string) => void;
  contextWindow: number;
  onSaveContextWindow: (n: number) => void;
  suggestionPrompt: string;
  onSaveSuggestionPrompt: (s: string) => void;
  chatPrompt: string;
  onSaveChatPrompt: (s: string) => void;
  questionPrompt: string;
  onSaveQuestionPrompt: (s: string) => void;
  talkingPrompt: string;
  onSaveTalkingPrompt: (s: string) => void;
  answerPrompt: string;
  onSaveAnswerPrompt: (s: string) => void;
  factPrompt: string;
  onSaveFactPrompt: (s: string) => void;
}

export default function SettingsModal({
  isOpen,
  apiKey,
  onSave,
  onClose,
  role,
  onSaveRole,
  contextWindow,
  onSaveContextWindow,
  suggestionPrompt,
  onSaveSuggestionPrompt,
  chatPrompt,
  onSaveChatPrompt,
  questionPrompt,
  onSaveQuestionPrompt,
  talkingPrompt,
  onSaveTalkingPrompt,
  answerPrompt,
  onSaveAnswerPrompt,
  factPrompt,
  onSaveFactPrompt,
}: Props) {
  const [draftKey, setDraftKey] = useState(apiKey);
  const [draftRole, setDraftRole] = useState(role);
  const [draftWindow, setDraftWindow] = useState(contextWindow);
  const [draftPrompt, setDraftPrompt] = useState(suggestionPrompt);
  const [draftChatPrompt, setDraftChatPrompt] = useState(chatPrompt);
  const [draftQuestionPrompt, setDraftQuestionPrompt] = useState(questionPrompt);
  const [draftTalkingPrompt, setDraftTalkingPrompt] = useState(talkingPrompt);
  const [draftAnswerPrompt, setDraftAnswerPrompt] = useState(answerPrompt);
  const [draftFactPrompt, setDraftFactPrompt] = useState(factPrompt);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDraftKey(apiKey);
      setDraftRole(role);
      setDraftWindow(contextWindow);
      setDraftPrompt(suggestionPrompt);
      setDraftChatPrompt(chatPrompt);
      setDraftQuestionPrompt(questionPrompt);
      setDraftTalkingPrompt(talkingPrompt);
      setDraftAnswerPrompt(answerPrompt);
      setDraftFactPrompt(factPrompt);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, apiKey, role, contextWindow, suggestionPrompt, chatPrompt, questionPrompt, talkingPrompt, answerPrompt, factPrompt]);

  function handleSave() {
    onSave(draftKey.trim());
    onSaveRole(draftRole.trim() || role);
    onSaveContextWindow(Math.max(1, Math.min(10, draftWindow)));
    onSaveSuggestionPrompt(draftPrompt.trim() || suggestionPrompt);
    onSaveChatPrompt(draftChatPrompt.trim() || chatPrompt);
    onSaveQuestionPrompt(draftQuestionPrompt.trim() || questionPrompt);
    onSaveTalkingPrompt(draftTalkingPrompt.trim() || talkingPrompt);
    onSaveAnswerPrompt(draftAnswerPrompt.trim() || answerPrompt);
    onSaveFactPrompt(draftFactPrompt.trim() || factPrompt);
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

          {/* Role */}
          <label style={{ display: "block" }}>
            <div style={fieldLabel}>Your role</div>
            <input
              type="text"
              value={draftRole}
              onChange={(e) => setDraftRole(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Product manager being interviewed at Google"
              style={inputStyle}
            />
            <div style={hint}>
              Helps tailor suggestions to your perspective in the conversation.
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

          {/* Chat prompt */}
          <label style={{ display: "block" }}>
            <div style={fieldLabel}>Chat system prompt</div>
            <textarea
              value={draftChatPrompt}
              onChange={(e) => setDraftChatPrompt(e.target.value)}
              rows={6}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
            />
            <div style={hint}>
              Used when you type a free-form message in the chat panel.
            </div>
          </label>

          {/* Per-type expansion prompts */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <div style={{ ...fieldLabel, marginBottom: 14 }}>Suggestion expansion prompts</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 16, lineHeight: 1.5 }}>
              Used when you click a suggestion card. Each type has its own prompt that overrides the chat system prompt above.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <label style={{ display: "block" }}>
                <div style={fieldLabel}>Question to ask</div>
                <textarea
                  value={draftQuestionPrompt}
                  onChange={(e) => setDraftQuestionPrompt(e.target.value)}
                  rows={6}
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
                />
              </label>

              <label style={{ display: "block" }}>
                <div style={fieldLabel}>Talking point</div>
                <textarea
                  value={draftTalkingPrompt}
                  onChange={(e) => setDraftTalkingPrompt(e.target.value)}
                  rows={8}
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
                />
              </label>

              <label style={{ display: "block" }}>
                <div style={fieldLabel}>Answer</div>
                <textarea
                  value={draftAnswerPrompt}
                  onChange={(e) => setDraftAnswerPrompt(e.target.value)}
                  rows={6}
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
                />
              </label>

              <label style={{ display: "block" }}>
                <div style={fieldLabel}>Fact-check</div>
                <textarea
                  value={draftFactPrompt}
                  onChange={(e) => setDraftFactPrompt(e.target.value)}
                  rows={5}
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
                />
              </label>
            </div>
          </div>

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

"use client";

import { useState, useEffect, useRef } from "react";
import { marked } from "marked";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  label?: string;
  timestamp: string;
}

interface Props {
  messages: ChatMessage[];
  isStreaming: boolean;
  onSend: (text: string) => void;
}

export default function ChatPanel({ messages, isStreaming, onSend }: Props) {
  const [input, setInput] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever messages update or streaming adds content
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSend() {
    const text = input.trim();
    if (!text || isStreaming) return;
    onSend(text);
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSend();
  }

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
        <span>3. Chat (detailed answers)</span>
        <span>session-only</span>
      </header>

      {/* Messages body */}
      <div ref={bodyRef} style={{ flex: 1, overflowY: "auto", padding: 14 }}>
        {messages.length === 0 ? (
          <div
            style={{
              color: "var(--muted)",
              fontSize: 13,
              textAlign: "center",
              padding: "30px 10px",
              lineHeight: 1.5,
            }}
          >
            Click a suggestion or type a question below.
          </div>
        ) : (
          messages.map((msg, i) => {
            const isLastAssistant = msg.role === "assistant" && i === messages.length - 1;
            return (
              <div key={i} style={{ marginBottom: 14 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    marginBottom: 4,
                  }}
                >
                  {msg.role === "user"
                    ? msg.label ? `You · ${msg.label}` : "You"
                    : `Assistant · ${msg.timestamp}`}
                </div>
                <div
                  style={{
                    background: msg.role === "user" ? "rgba(110,168,254,.08)" : "var(--panel-2)",
                    border: `1px solid ${msg.role === "user" ? "rgba(110,168,254,.3)" : "var(--border)"}`,
                    padding: "10px 12px",
                    borderRadius: 8,
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  {msg.role === "assistant" ? (
                    <div
                      className="md-body"
                      dangerouslySetInnerHTML={{ __html: marked(msg.content) as string }}
                    />
                  ) : (
                    msg.content
                  )}
                  {isStreaming && isLastAssistant && (
                    <span
                      style={{
                        display: "inline-block",
                        width: 2,
                        height: "1em",
                        background: "var(--accent)",
                        marginLeft: 2,
                        verticalAlign: "text-bottom",
                        animation: "cursor-blink 0.8s step-end infinite",
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input row */}
      <div
        style={{
          padding: 10,
          borderTop: "1px solid var(--border)",
          display: "flex",
          gap: 8,
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
          placeholder={isStreaming ? "Waiting for response…" : "Ask anything…"}
          style={{
            flex: 1,
            background: "var(--panel-2)",
            border: "1px solid var(--border)",
            color: isStreaming ? "var(--muted)" : "var(--text)",
            padding: "8px 10px",
            borderRadius: 6,
            fontSize: 13,
            outline: "none",
            opacity: isStreaming ? 0.6 : 1,
          }}
        />
        <button
          onClick={handleSend}
          disabled={isStreaming || !input.trim()}
          style={{
            background: isStreaming || !input.trim() ? "var(--panel-2)" : "var(--accent)",
            color: isStreaming || !input.trim() ? "var(--muted)" : "#000",
            border: "1px solid var(--border)",
            padding: "8px 14px",
            borderRadius: 6,
            cursor: isStreaming || !input.trim() ? "default" : "pointer",
            fontSize: 13,
            fontWeight: 500,
            transition: "background 0.15s",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

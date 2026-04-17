"use client";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  label?: string;
  timestamp: string;
}

interface Props {
  messages: ChatMessage[];
  onSend: (text: string) => void;
}

export default function ChatPanel({ messages, onSend }: Props) {
  function handleSend() {
    const input = document.getElementById("chat-input") as HTMLInputElement;
    const value = input.value.trim();
    if (!value) return;
    onSend(value);
    input.value = "";
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
      <div id="chat-body" style={{ flex: 1, overflowY: "auto", padding: 14 }}>
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
          Clicking a suggestion adds it to this chat and streams a detailed answer. You can also type questions directly.
        </div>

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
          messages.map((msg, i) => (
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
                {msg.role === "user" ? (msg.label ? `You · ${msg.label}` : "You") : "Assistant"}
              </div>
              <div
                style={{
                  background: msg.role === "user" ? "rgba(110,168,254,.08)" : "var(--panel-2)",
                  border: `1px solid ${msg.role === "user" ? "rgba(110,168,254,.3)" : "var(--border)"}`,
                  padding: "10px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}
              >
                {msg.content}
              </div>
            </div>
          ))
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
          id="chat-input"
          placeholder="Ask anything…"
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            background: "var(--panel-2)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            padding: "8px 10px",
            borderRadius: 6,
            fontSize: 13,
            outline: "none",
          }}
        />
        <button
          onClick={handleSend}
          style={{
            background: "var(--accent)",
            color: "#000",
            border: "none",
            padding: "8px 14px",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

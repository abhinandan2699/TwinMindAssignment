"use client";

import { useState, useRef, useCallback } from "react";
import { TranscriptChunk } from "./useAudioRecorder";
import { ChatMessage } from "@/components/ChatPanel";

interface UseChatOptions {
  transcript: TranscriptChunk[];
  apiKey: string | null;
  chatPrompt: string;
}

const KEEP_RECENT_EXCHANGES = 2;
const KEEP_RECENT_CHUNKS = 2;

function nowTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

async function summarize(
  apiKey: string,
  kind: "chat" | "transcript",
  newContent: string,
  existingSummary: string | null,
): Promise<string> {
  const res = await fetch("/api/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, kind, newContent, existingSummary }),
  });
  if (!res.ok) throw new Error("Summarization failed");
  const data = await res.json();
  return data.summary as string;
}

export function useChat({ transcript, apiKey, chatPrompt }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const messagesRef = useRef<ChatMessage[]>([]);
  const transcriptRef = useRef(transcript);
  transcriptRef.current = transcript;
  const apiKeyRef = useRef(apiKey);
  apiKeyRef.current = apiKey;
  const chatPromptRef = useRef(chatPrompt);
  chatPromptRef.current = chatPrompt;

  // Rolling summaries — track which items have been folded in
  const chatSummaryRef = useRef<string | null>(null);
  const chatSummaryUpToIndexRef = useRef<number>(-1); // index of last assistant msg included in summary
  const transcriptSummaryRef = useRef<string | null>(null);
  const transcriptSummaryUpToIndexRef = useRef<number>(-1); // index of last chunk included in summary

  const sendMessage = useCallback(async (text: string, label?: string) => {
    if (!apiKeyRef.current || isStreaming) return;

    const userMsg: ChatMessage = { role: "user", content: text, label, timestamp: nowTime() };
    const assistantPlaceholder: ChatMessage = { role: "assistant", content: "", timestamp: nowTime() };

    const apiMessages = [...messagesRef.current, userMsg];
    const nextMessages = [...apiMessages, assistantPlaceholder];
    messagesRef.current = nextMessages;
    setMessages(nextMessages);
    setIsStreaming(true);

    try {
      // ── Compact chat history if needed ──────────────────────────────────────
      // Completed exchanges = pairs of [user, assistant]. New userMsg has no answer yet.
      // Working from messagesRef.current (without the new userMsg + placeholder).
      const completedMessages = messagesRef.current.slice(0, -2); // strip new user + placeholder
      const unsummarizedStart = chatSummaryUpToIndexRef.current + 1;
      const unsummarizedMessages = completedMessages.slice(unsummarizedStart);
      const unsummarizedExchanges = Math.floor(unsummarizedMessages.length / 2);

      if (unsummarizedExchanges > KEEP_RECENT_EXCHANGES) {
        const exchangesToCompact = unsummarizedExchanges - KEEP_RECENT_EXCHANGES;
        const messagesToCompact = unsummarizedMessages.slice(0, exchangesToCompact * 2);
        const compactText = messagesToCompact
          .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
          .join("\n\n");
        try {
          const newSummary = await summarize(apiKeyRef.current, "chat", compactText, chatSummaryRef.current);
          chatSummaryRef.current = newSummary;
          chatSummaryUpToIndexRef.current = unsummarizedStart + messagesToCompact.length - 1;
        } catch {
          // proceed without compacting
        }
      }

      // ── Compact transcript if needed ────────────────────────────────────────
      const allChunks = transcriptRef.current.filter((c) => !c.isError);
      const transcriptUnsummarizedStart = transcriptSummaryUpToIndexRef.current + 1;
      const unsummarizedChunks = allChunks.slice(transcriptUnsummarizedStart);

      if (unsummarizedChunks.length > KEEP_RECENT_CHUNKS) {
        const chunksToCompact = unsummarizedChunks.slice(0, unsummarizedChunks.length - KEEP_RECENT_CHUNKS);
        const compactText = chunksToCompact.map((c) => `[${c.timestamp}] ${c.text}`).join("\n");
        try {
          const newSummary = await summarize(apiKeyRef.current, "transcript", compactText, transcriptSummaryRef.current);
          transcriptSummaryRef.current = newSummary;
          transcriptSummaryUpToIndexRef.current = transcriptUnsummarizedStart + chunksToCompact.length - 1;
        } catch {
          // proceed without compacting
        }
      }

      // ── Build payload with summaries + recent items ─────────────────────────
      const recentMessages = completedMessages.slice(chatSummaryUpToIndexRef.current + 1);
      const recentChunks = allChunks.slice(transcriptSummaryUpToIndexRef.current + 1);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...recentMessages, userMsg].map(({ role, content }) => ({ role, content })),
          chatSummary: chatSummaryRef.current,
          transcript: recentChunks,
          transcriptSummary: transcriptSummaryRef.current,
          systemPrompt: chatPromptRef.current,
          suggestionType: label,
          apiKey: apiKeyRef.current,
        }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: `⚠ ${err.error}` };
          messagesRef.current = updated;
          return updated;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: updated[updated.length - 1].content + chunk,
          };
          messagesRef.current = updated;
          return updated;
        });
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], content: "⚠ Network error — please try again." };
        messagesRef.current = updated;
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming]);

  return { messages, isStreaming, sendMessage };
}

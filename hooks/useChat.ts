"use client";

import { useState, useRef, useCallback } from "react";
import { TranscriptChunk } from "./useAudioRecorder";
import { ChatMessage } from "@/components/ChatPanel";

interface UseChatOptions {
  transcript: TranscriptChunk[];
  apiKey: string | null;
  chatPrompt: string;
}

function nowTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function useChat({ transcript, apiKey, chatPrompt }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  // Keep a ref to the current messages so sendMessage always reads the latest list
  const messagesRef = useRef<ChatMessage[]>([]);
  const transcriptRef = useRef(transcript);
  transcriptRef.current = transcript;
  const apiKeyRef = useRef(apiKey);
  apiKeyRef.current = apiKey;
  const chatPromptRef = useRef(chatPrompt);
  chatPromptRef.current = chatPrompt;

  const sendMessage = useCallback(async (text: string, label?: string) => {
    if (!apiKeyRef.current || isStreaming) return;

    const userMsg: ChatMessage = { role: "user", content: text, label, timestamp: nowTime() };
    const assistantPlaceholder: ChatMessage = { role: "assistant", content: "", timestamp: nowTime() };

    // Build the list to send BEFORE touching state (avoids React 18 batch-async issue)
    const apiMessages = [...messagesRef.current, userMsg];
    const nextMessages = [...apiMessages, assistantPlaceholder];
    messagesRef.current = nextMessages;
    setMessages(nextMessages);
    setIsStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages.map(({ role, content }) => ({ role, content })),
          transcript: transcriptRef.current,
          systemPrompt: chatPromptRef.current,
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

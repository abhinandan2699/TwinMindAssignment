"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { TranscriptChunk } from "./useAudioRecorder";
import { SuggestionBatch } from "@/components/SuggestionsPanel";

interface UseSuggestionsOptions {
  transcript: TranscriptChunk[];
  isRecording: boolean;
  apiKey: string | null;
  contextWindow: number;
  suggestionPrompt: string;
  role: string;
}

const REFRESH_INTERVAL_SEC = 30;

export function useSuggestions({
  transcript,
  isRecording,
  apiKey,
  contextWindow,
  suggestionPrompt,
  role,
}: UseSuggestionsOptions) {
  const [batches, setBatches] = useState<SuggestionBatch[]>([]);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL_SEC);
  const [isLoading, setIsLoading] = useState(false);

  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef(REFRESH_INTERVAL_SEC);
  const isLoadingRef = useRef(false);

  // Keep latest values accessible in callbacks without re-creating them
  const transcriptRef = useRef(transcript);
  transcriptRef.current = transcript;
  const apiKeyRef = useRef(apiKey);
  apiKeyRef.current = apiKey;
  const contextWindowRef = useRef(contextWindow);
  contextWindowRef.current = contextWindow;
  const suggestionPromptRef = useRef(suggestionPrompt);
  suggestionPromptRef.current = suggestionPrompt;
  const roleRef = useRef(role);
  roleRef.current = role;

  const generateSuggestions = useCallback(async () => {
    if (isLoadingRef.current) return;
    if (!apiKeyRef.current || transcriptRef.current.length === 0) return;

    isLoadingRef.current = true;
    setIsLoading(true);

    try {
      const validChunks = transcriptRef.current.filter((c) => !c.isError);
      const recentChunks = validChunks.slice(-(contextWindowRef.current ?? 3));

      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: recentChunks,
          systemPrompt: suggestionPromptRef.current,
          role: roleRef.current,
          apiKey: apiKeyRef.current,
        }),
      });

      const data = await res.json();
      if (res.ok && data.suggestions?.length > 0) {
        const newBatch: SuggestionBatch = {
          id: Date.now(),
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          suggestions: data.suggestions,
        };
        setBatches((prev) => [newBatch, ...prev]);
      }
    } catch {
      // Silent fail — keep auto-refresh running
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
      countdownRef.current = REFRESH_INTERVAL_SEC;
      setCountdown(REFRESH_INTERVAL_SEC);
    }
  }, []);

  // Fire immediately when the first transcript chunk arrives while recording
  useEffect(() => {
    if (isRecording && transcript.length === 1 && batches.length === 0 && !isLoadingRef.current) {
      generateSuggestions();
    }
  }, [transcript.length, isRecording, batches.length, generateSuggestions]);

  // Pause/resume the auto-refresh ticker with recording state
  useEffect(() => {
    if (!isRecording) {
      if (tickerRef.current) {
        clearInterval(tickerRef.current);
        tickerRef.current = null;
      }
      return;
    }

    countdownRef.current = REFRESH_INTERVAL_SEC;
    setCountdown(REFRESH_INTERVAL_SEC);

    tickerRef.current = setInterval(() => {
      countdownRef.current--;
      setCountdown(countdownRef.current);

      if (countdownRef.current <= 0) {
        countdownRef.current = REFRESH_INTERVAL_SEC;
        setCountdown(REFRESH_INTERVAL_SEC);
        generateSuggestions();
      }
    }, 1000);

    return () => {
      if (tickerRef.current) {
        clearInterval(tickerRef.current);
        tickerRef.current = null;
      }
    };
  }, [isRecording, generateSuggestions]);

  const manualReload = useCallback(() => {
    generateSuggestions();
  }, [generateSuggestions]);

  return { batches, countdown, isLoading, manualReload };
}

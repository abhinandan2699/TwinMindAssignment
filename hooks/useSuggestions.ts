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
  meetingType: string;
  meetingGoal: string;
  flushChunk: () => void;
}

const REFRESH_INTERVAL_SEC = 30;

export function useSuggestions({
  transcript,
  isRecording,
  apiKey,
  contextWindow,
  suggestionPrompt,
  role,
  meetingType,
  meetingGoal,
  flushChunk,
}: UseSuggestionsOptions) {
  const [batches, setBatches] = useState<SuggestionBatch[]>([]);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL_SEC);
  const [isLoading, setIsLoading] = useState(false);

  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef(REFRESH_INTERVAL_SEC);
  const isLoadingRef = useRef(false);
  const pendingReloadRef = useRef(false);
  const prevTranscriptLenRef = useRef(0);
  const pendingReloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const meetingTypeRef = useRef(meetingType);
  meetingTypeRef.current = meetingType;
  const meetingGoalRef = useRef(meetingGoal);
  meetingGoalRef.current = meetingGoal;

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
          meetingType: meetingTypeRef.current,
          meetingGoal: meetingGoalRef.current,
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

  // Fire when a new transcript chunk arrives (handles both auto-start and pending manual reload)
  useEffect(() => {
    const prev = prevTranscriptLenRef.current;
    prevTranscriptLenRef.current = transcript.length;

    if (transcript.length === 0) return;

    if (pendingReloadRef.current && transcript.length > prev) {
      pendingReloadRef.current = false;
      if (pendingReloadTimeoutRef.current) {
        clearTimeout(pendingReloadTimeoutRef.current);
        pendingReloadTimeoutRef.current = null;
      }
      generateSuggestions();
      return;
    }

    // Auto-fire on first chunk when recording starts
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

  const reset = useCallback(() => {
    setBatches([]);
    countdownRef.current = REFRESH_INTERVAL_SEC;
    setCountdown(REFRESH_INTERVAL_SEC);
    pendingReloadRef.current = false;
    prevTranscriptLenRef.current = 0;
    if (pendingReloadTimeoutRef.current) {
      clearTimeout(pendingReloadTimeoutRef.current);
      pendingReloadTimeoutRef.current = null;
    }
  }, []);

  const manualReload = useCallback(() => {
    if (isRecording) {
      pendingReloadRef.current = true;
      flushChunk();
      // Fallback: if no new chunk arrives within 10s (silence / short audio dropped),
      // clear the flag and generate with whatever transcript exists.
      if (pendingReloadTimeoutRef.current) clearTimeout(pendingReloadTimeoutRef.current);
      pendingReloadTimeoutRef.current = setTimeout(() => {
        if (pendingReloadRef.current) {
          pendingReloadRef.current = false;
          generateSuggestions();
        }
      }, 10_000);
    } else {
      generateSuggestions();
    }
  }, [generateSuggestions, isRecording, flushChunk]);

  return { batches, countdown, isLoading, manualReload, reset };
}

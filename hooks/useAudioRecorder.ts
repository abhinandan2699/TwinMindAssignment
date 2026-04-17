"use client";

import { useRef, useState, useCallback } from "react";

export interface TranscriptChunk {
  timestamp: string;
  text: string;
  isError?: boolean;
}

export interface AudioRecorderState {
  isRecording: boolean;
  isTranscribing: boolean;
  recordingTime: number;      // seconds elapsed since recording started
  nextChunkIn: number;        // seconds until next chunk is sent
  transcript: TranscriptChunk[];
  micError: string | null;    // permission denied or device error
}

export interface AudioRecorderActions {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  flushChunk: () => void;
}

const CHUNK_INTERVAL_SEC = 30;

function nowTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function useAudioRecorder(apiKey: string | null): AudioRecorderState & AudioRecorderActions {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [nextChunkIn, setNextChunkIn] = useState(CHUNK_INTERVAL_SEC);
  const [transcript, setTranscript] = useState<TranscriptChunk[]>([]);
  const [micError, setMicError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunkCycleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const appendTranscript = useCallback((chunk: TranscriptChunk) => {
    setTranscript((prev) => [...prev, chunk]);
  }, []);

  // Send the collected audio blobs to the transcription API.
  const sendChunk = useCallback(
    async (mimeType: string) => {
      if (chunksRef.current.length === 0) return;
      const blob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];

      if (blob.size < 1024) return;

      setIsTranscribing(true);
      const capturedAt = nowTime();

      try {
        const form = new FormData();
        form.append("audio", blob, "chunk.webm");
        form.append("apiKey", apiKey ?? "");

        const res = await fetch("/api/transcribe", { method: "POST", body: form });
        const data = await res.json();

        if (!res.ok || data.error) {
          appendTranscript({ timestamp: capturedAt, text: `⚠ Transcription failed — ${data.error ?? "unknown error"}`, isError: true });
        } else if (data.text?.trim()) {
          appendTranscript({ timestamp: capturedAt, text: data.text.trim() });
        }
      } catch {
        appendTranscript({ timestamp: capturedAt, text: "⚠ Transcription failed — network error", isError: true });
      } finally {
        setIsTranscribing(false);
      }
    },
    [apiKey, appendTranscript]
  );

  // Cycle: stop current recorder (which flushes ondataavailable), send, restart.
  const cycleRecorder = useCallback(
    (stream: MediaStream) => {
      const mr = mediaRecorderRef.current;
      if (!mr || mr.state === "inactive") return;

      mr.stop(); // triggers ondataavailable then onstop
      // onstop fires sendChunk, then we restart below
      const mimeType = mr.mimeType;

      mr.onstop = async () => {
        await sendChunk(mimeType);
        // Restart only if we're still supposed to be recording
        if (streamRef.current) {
          const newMr = new MediaRecorder(stream, { mimeType });
          mediaRecorderRef.current = newMr;
          chunksRef.current = [];
          newMr.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
          };
          newMr.onstop = null;
          newMr.start();
        }
      };
    },
    [sendChunk]
  );

  const startRecording = useCallback(async () => {
    setMicError(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicError("Mic access denied. Allow microphone in browser settings and try again.");
      return;
    }

    streamRef.current = stream;

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    const mr = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = mr;
    chunksRef.current = [];

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.start();

    setTranscript([]);
    setIsRecording(true);
    setRecordingTime(0);
    setNextChunkIn(CHUNK_INTERVAL_SEC);

    // Ticker: updates recordingTime and nextChunkIn every second.
    let elapsed = 0;
    let chunkCountdown = CHUNK_INTERVAL_SEC;

    tickerRef.current = setInterval(() => {
      elapsed++;
      chunkCountdown--;
      setRecordingTime(elapsed);
      setNextChunkIn(chunkCountdown);

      if (chunkCountdown <= 0) {
        chunkCountdown = CHUNK_INTERVAL_SEC;
        cycleRecorder(stream);
      }
    }, 1000);
  }, [cycleRecorder]);

  const flushChunk = useCallback(() => {
    if (streamRef.current) cycleRecorder(streamRef.current);
  }, [cycleRecorder]);

  const stopRecording = useCallback(() => {
    if (tickerRef.current) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
    if (chunkCycleRef.current) {
      clearTimeout(chunkCycleRef.current);
      chunkCycleRef.current = null;
    }

    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      const mimeType = mr.mimeType;
      mr.onstop = async () => {
        await sendChunk(mimeType);
      };
      mr.stop();
    }

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;

    setIsRecording(false);
    setNextChunkIn(CHUNK_INTERVAL_SEC);
  }, [sendChunk]);

  return {
    isRecording,
    isTranscribing,
    recordingTime,
    nextChunkIn,
    transcript,
    micError,
    startRecording,
    stopRecording,
    flushChunk,
  };
}

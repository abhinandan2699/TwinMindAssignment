import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { SUGGESTION_TYPE_PROMPTS } from "@/lib/defaults";

const CHAT_MODEL = "openai/gpt-oss-120b";

interface TranscriptChunk {
  timestamp: string;
  text: string;
  isError?: boolean;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Budget: 8000 TPM limit (free tier) — 1500 output — ~200 overhead = ~6300 tokens = ~25200 chars
// Split 70 % transcript / 30 % chat history
const TRANSCRIPT_MAX_CHARS = 14000;  // ~3500 tokens
const HISTORY_MAX_CHARS    = 7200;   // ~1800 tokens — trim oldest messages if history grows large

function trimHistory(messages: ChatMessage[], maxChars: number): ChatMessage[] {
  let total = 0;
  const kept: ChatMessage[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    total += messages[i].content.length;
    if (total > maxChars && kept.length > 0) break;
    kept.unshift(messages[i]);
  }
  return kept;
}

export async function POST(req: NextRequest) {
  const { messages, transcript, systemPrompt, suggestionType, apiKey } = await req.json();

  if (!apiKey) return NextResponse.json({ error: "API key required" }, { status: 401 });
  if (!messages?.length) return NextResponse.json({ error: "No messages provided" }, { status: 400 });

  const transcriptText = (transcript as TranscriptChunk[])
    .filter((c) => !c.isError)
    .map((c) => `[${c.timestamp}] ${c.text}`)
    .join("\n");

  const truncated = transcriptText.length > TRANSCRIPT_MAX_CHARS
    ? transcriptText.slice(-TRANSCRIPT_MAX_CHARS)
    : transcriptText;

  const basePrompt = (suggestionType && SUGGESTION_TYPE_PROMPTS[suggestionType]) ?? systemPrompt;
  const systemContent = `${basePrompt}\n\n--- MEETING TRANSCRIPT ---\n${truncated || "(no transcript yet)"}\n--- END TRANSCRIPT ---`;

  // Trim oldest messages if history exceeds budget (always keep the last user message)
  const trimmedMessages = trimHistory(messages as ChatMessage[], HISTORY_MAX_CHARS);

  try {
    const groq = new Groq({ apiKey });
    const stream = await groq.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: systemContent },
        ...trimmedMessages,
      ],
      stream: true,
      max_completion_tokens: 800,
      temperature: 0.2,
    });

    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? "";
            if (text) controller.enqueue(encoder.encode(text));
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

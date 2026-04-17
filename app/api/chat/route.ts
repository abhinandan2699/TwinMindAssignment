import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { SUGGESTION_TYPE_PROMPTS } from "@/lib/defaults";

const CHAT_MODEL = "openai/gpt-oss-120b";

interface TranscriptChunk {
  timestamp: string;
  text: string;
  isError?: boolean;
}

export async function POST(req: NextRequest) {
  const {
    messages,
    chatSummary,
    transcript,
    transcriptSummary,
    systemPrompt,
    suggestionType,
    apiKey,
  } = await req.json();

  if (!apiKey) return NextResponse.json({ error: "API key required" }, { status: 401 });
  if (!messages?.length) return NextResponse.json({ error: "No messages provided" }, { status: 400 });

  const recentTranscriptText = (transcript as TranscriptChunk[])
    .filter((c) => !c.isError)
    .map((c) => `[${c.timestamp}] ${c.text}`)
    .join("\n");

  const transcriptBlock = [
    transcriptSummary ? `EARLIER TRANSCRIPT (summarized):\n${transcriptSummary}` : null,
    recentTranscriptText ? `RECENT TRANSCRIPT:\n${recentTranscriptText}` : null,
  ]
    .filter(Boolean)
    .join("\n\n") || "(no transcript yet)";

  const historyBlock = chatSummary
    ? `EARLIER CHAT (summarized):\n${chatSummary}`
    : null;

  const basePrompt = (suggestionType && SUGGESTION_TYPE_PROMPTS[suggestionType]) ?? systemPrompt;
  const systemContent = [
    basePrompt,
    `--- MEETING TRANSCRIPT ---\n${transcriptBlock}\n--- END TRANSCRIPT ---`,
    historyBlock ? `--- ${historyBlock}\n---` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const groq = new Groq({ apiKey });
    const stream = await groq.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: systemContent },
        ...messages,
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

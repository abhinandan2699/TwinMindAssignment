import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const SUGGESTIONS_MODEL = "openai/gpt-oss-120b";

interface TranscriptChunk {
  timestamp: string;
  text: string;
  isError?: boolean;
}

export async function POST(req: NextRequest) {
  const { transcript, contextWindow, systemPrompt, role, apiKey } = await req.json();

  if (!apiKey) return NextResponse.json({ error: "API key required" }, { status: 401 });
  if (!transcript || transcript.length === 0) return NextResponse.json({ error: "No transcript provided" }, { status: 400 });

  const validChunks: TranscriptChunk[] = transcript.filter((c: TranscriptChunk) => !c.isError);
  const recentChunks = validChunks.slice(-(contextWindow ?? 3));

  if (recentChunks.length === 0) return NextResponse.json({ error: "No valid transcript chunks" }, { status: 400 });

  const contextChunks = recentChunks.slice(0, -1);
  const newestChunk = recentChunks[recentChunks.length - 1];

  const contextText = contextChunks.length > 0
    ? `CONTEXT (background):\n${contextChunks.map((c) => `[${c.timestamp}] ${c.text}`).join("\n")}\n\n`
    : "";

  const userMessage = `${contextText}MOST RECENT (generate suggestions about this):\n[${newestChunk.timestamp}] ${newestChunk.text}`;

  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: SUGGESTIONS_MODEL,
      messages: [
        { role: "system", content: `${systemPrompt}\n\nThe user's role: ${role}` },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
    });

    const msg = completion.choices[0]?.message;
    const raw = msg?.content || (msg as unknown as Record<string, string>)?.reasoning || "";
    // Strip reasoning block that some models emit before the answer
    const stripped = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    const jsonMatch = stripped.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("Unexpected model output:", raw);
      return NextResponse.json({ error: "Model returned invalid format" }, { status: 500 });
    }

    let suggestions;
    try {
      suggestions = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json({ error: "Model returned invalid format" }, { status: 500 });
    }
    return NextResponse.json({ suggestions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

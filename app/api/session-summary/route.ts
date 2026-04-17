import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const MODEL = "openai/gpt-oss-120b";
const SESSION_SUMMARY_MAX_TOKENS = 1500;

export async function POST(req: NextRequest) {
  const { transcript, apiKey } = await req.json();

  if (!apiKey) return NextResponse.json({ error: "API key required" }, { status: 401 });
  if (!transcript) return NextResponse.json({ error: "No transcript provided" }, { status: 400 });

  const systemPrompt = `You are a meeting assistant. Given a meeting transcript, produce two things:

1. A prose summary of approximately 300 words covering what was discussed, key decisions made, important details and numbers, and any conclusions reached. No headers.

2. Exactly 5 short, actionable to-do items starting with a verb, ordered by priority.

Respond with valid JSON only, no markdown fences:
{"summary":"...","todos":["...","...","...","...","..."]}`;

  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Meeting transcript:\n\n${transcript}` },
      ],
      temperature: 0.3,
      max_completion_tokens: SESSION_SUMMARY_MAX_TOKENS,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
    const parsed = JSON.parse(raw);
    return NextResponse.json({
      summary: parsed.summary ?? "",
      todos: Array.isArray(parsed.todos) ? parsed.todos.slice(0, 5) : [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Summary generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

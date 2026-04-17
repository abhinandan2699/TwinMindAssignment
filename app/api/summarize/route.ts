import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const SUMMARIZE_MODEL = "openai/gpt-oss-120b";

export async function POST(req: NextRequest) {
  const { existingSummary, newContent, kind, apiKey } = await req.json();

  if (!apiKey) return NextResponse.json({ error: "API key required" }, { status: 401 });
  if (!newContent) return NextResponse.json({ error: "No content to summarize" }, { status: 400 });

  const subject = kind === "chat" ? "chat exchanges between a user and an assistant" : "meeting transcript chunks";

  const systemPrompt = `You compress ${subject} into a concise rolling summary.
Keep all key facts, decisions, names, numbers, and questions.
Be terse — 8–12 sentences max. No preamble.`;

  const userMessage = existingSummary
    ? `Existing summary so far:\n${existingSummary}\n\nNew older items to fold in:\n${newContent}\n\nProduce an updated summary that combines both.`
    : `Summarize the following:\n${newContent}`;

  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: SUMMARIZE_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.2,
      max_completion_tokens: 500,
    });

    const summary = completion.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Summarization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

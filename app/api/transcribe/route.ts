import Groq from "groq-sdk";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const audio = formData.get("audio") as File | null;
  const apiKey = formData.get("apiKey") as string | null;

  if (!apiKey) {
    return Response.json({ error: "No API key provided" }, { status: 401 });
  }
  if (!audio) {
    return Response.json({ error: "No audio provided" }, { status: 400 });
  }

  try {
    const groq = new Groq({ apiKey });
    const result = await groq.audio.transcriptions.create({
      file: audio,
      model: "whisper-large-v3",
      response_format: "json",
    });
    return Response.json({ text: result.text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Transcription failed";
    return Response.json({ error: message }, { status: 500 });
  }
}

# TwinMind Live Suggestions

A real-time meeting copilot that listens to your conversations and surfaces live, context-aware suggestions — questions to ask, talking points to raise, answers to give, and facts to check.

---

## What It Does

TwinMind captures your microphone audio in 30-second rolling chunks, transcribes it using Whisper, and feeds the transcript to an LLM that generates four types of live suggestions. A persistent chat panel lets you dig deeper into any moment of the conversation. Everything is session-only — nothing persists to a server or database.

Designed for interviews, negotiations, sales calls, presentations, or any high-stakes conversation where a real-time co-pilot would help.

---

## Setup

### Prerequisites

- Node.js 18+
- A [Groq API key](https://console.groq.com) (free tier works)

### Install and Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

No `.env` file is needed. You enter your Groq API key directly in the Settings panel — it is stored in `sessionStorage` and cleared when you close the tab.

### Production Build

```bash
npm run build
npm start
```

---

## How to Use

1. **Enter your API key** — click the gear icon (top right) and paste your Groq API key. Optionally set your role (e.g., "Software engineer in a technical interview").

2. **Start recording** — click the microphone button in the Transcript panel. Grant microphone access when prompted.

3. **Watch suggestions arrive** — after the first 30-second chunk is transcribed, three suggestion cards appear and refresh automatically every ~30 seconds.

4. **Click a card to expand** — clicking any suggestion opens it in the Chat panel with a type-specific prompt (phrasing advice for questions, verdict for fact-checks, etc.).

5. **Chat freely** — you can also type anything in the Chat panel to ask about the conversation.

6. **Export your session** — use the export button to download a JSON file containing the full transcript, all suggestion batches, and chat history.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| UI | React 18, TypeScript, Tailwind CSS |
| Transcription | Groq API — `whisper-large-v3` |
| Suggestions / Chat | Groq API — `openai/gpt-oss-120b` |
| Markdown rendering | `marked` |
| Storage | Browser `sessionStorage` only |

All AI calls go through Next.js API routes (`/api/transcribe`, `/api/suggestions`, `/api/chat`, `/api/summarize`) so the Groq key is never exposed in client-side bundles — it is only sent in request bodies to the server routes.

---

## Context Handling Design

Managing LLM context in a live, unbounded session requires careful choices. Here is how each layer works.

### Audio → Transcript

The `useAudioRecorder` hook creates a MediaRecorder that cycles every 30 seconds: stop → send blob to `/api/transcribe` → restart. Blobs under 1 KB are discarded to avoid empty Whisper responses. Each transcription result becomes a timestamped chunk in the Transcript panel.

### Transcript → Suggestions

`useSuggestions` fires on the first transcript chunk and re-fires every 30 seconds. It selects the last N chunks where N is the **context window** setting (default: 3). The selected chunks are then split:

- **Context:** all but the newest chunk — provides background for the LLM
- **Most recent:** the newest chunk — the focal point for suggestions

This split prevents older context from dominating while still grounding suggestions in recent speech. The API returns exactly 3 suggestions, each typed as `question`, `talking`, `answer`, or `fact`.

### Chat Context — Rolling Summarization

Unbounded chat history would exhaust the context window over a long session. `useChat` applies a two-tier rolling compression strategy:

- **Recent items kept verbatim:** the last 2 chat exchanges and the last 2 transcript chunks are always included in full.
- **Older items summarized:** once history grows beyond ~4 exchanges or ~4 transcript chunks, everything before the cutoff is compacted into a dense prose summary by `/api/summarize`.
- **Incremental updates:** index refs track what has already been summarized so items are never double-counted. Each new summarization folds `(old summary) + (new items since last summary)` into an updated summary.

The context sent to the chat model is always bounded: `[transcript summary] + [2 recent chunks] + [chat summary] + [2 recent exchanges] + [new message]`.

### Type-Specific Expansion Prompts

Clicking a suggestion card routes it through a type-specific system prompt rather than just echoing the text into chat:

| Type | Prompt focus |
|---|---|
| Question | Phrasing + likely follow-up |
| Talking point | How to introduce it + key points to make |
| Answer | Exact words to say + confidence framing |
| Fact-check | Verdict (Accurate / Not Accurate / Partially) + supporting specifics |

These prompts are fully customizable in Settings and fall back to the general chat system prompt if left blank.

### Session-Only Storage

All settings and transcript data live in `sessionStorage`. Nothing is written to a database or sent to any server beyond the Groq API. Closing the tab erases everything. Export to JSON is the only way to save a session.

---

## Settings

Open the gear icon (top right) to access the Settings panel.

| Setting | Description | Default |
|---|---|---|
| **Groq API Key** | Your Groq API key. Required to use the app. | — |
| **Your role** | Tells the LLM who you are. Personalizes suggestion framing (e.g. "Product manager at a startup"). | `Meeting participant` |
| **Context window** | Number of 30-second transcript chunks fed to the suggestions model (1–10). Higher = more context and higher latency. | `3` |
| **Live suggestions system prompt** | Master system prompt for generating the four suggestion cards. Edit to change tone, format, or focus area. | See `lib/defaults.ts` |
| **Chat system prompt** | Base system prompt for all free-form chat responses. | See `lib/defaults.ts` |
| **Question prompt** | System prompt used when expanding a Question suggestion card into chat. | See `lib/defaults.ts` |
| **Talking point prompt** | System prompt used when expanding a Talking point card. | See `lib/defaults.ts` |
| **Answer prompt** | System prompt used when expanding an Answer card. | See `lib/defaults.ts` |
| **Fact-check prompt** | System prompt used when expanding a Fact-check card. | See `lib/defaults.ts` |

Changes take effect immediately on Save. All values are stored in `sessionStorage` and cleared on tab close. Leaving a prompt field blank reverts it to the default.

---

## Project Structure

```
app/
  page.tsx                  # Root layout — three-column shell
  api/
    transcribe/route.ts     # Whisper transcription endpoint
    suggestions/route.ts    # Suggestion generation endpoint
    chat/route.ts           # Streaming chat endpoint
    summarize/route.ts      # Context compaction endpoint
components/
  TranscriptPanel.tsx       # Mic control + scrolling transcript
  SuggestionsPanel.tsx      # Live suggestion cards grid
  SuggestionCard.tsx        # Individual card with type badge
  ChatPanel.tsx             # Chat interface with markdown rendering
  SettingsModal.tsx         # Settings drawer
hooks/
  useAudioRecorder.ts       # 30-second audio cycling + transcription
  useSuggestions.ts         # Suggestion polling + context window logic
  useChat.ts                # Chat state + rolling summarization
lib/
  defaults.ts               # Default prompts for all AI operations
```

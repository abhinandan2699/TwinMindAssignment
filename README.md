# TwinMind Live Suggestions

**Live demo:** https://twin-mind-assignment-zeta.vercel.app/

A real-time meeting copilot that transcribes live audio and continuously surfaces context-aware suggestions — questions to ask, talking points to raise, answers to give, and facts to check. Built to handle unbounded meeting sessions on a token-constrained LLM without ever hitting a context limit.

---

## Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | API routes keep the Groq key server-side; no separate backend process |
| UI | React 18, TypeScript | Compile-time shape checking on all API request/response types |
| Styling | CSS custom properties + inline styles | Single `:root` variable swap changes the whole theme; zero Tailwind purge surprises |
| Transcription | Groq — `whisper-large-v3` | Best open-weight STT accuracy; Groq hardware makes 30s chunks fast enough for real-time use |
| Suggestions / Chat | Groq — `openai/gpt-oss-120b` | Standardized per assignment so evaluators compare prompt quality, not model quality |
| Markdown | `marked` | Lightweight; chat responses use bullets and bold that plain text can't render |
| Storage | `sessionStorage` only | No server, no database — everything clears on tab close |

All AI calls go through Next.js API routes (`/api/transcribe`, `/api/suggestions`, `/api/chat`, `/api/summarize`) — the Groq key is never in a client-side bundle.

---

## Setup

```bash
npm install
npm run dev        # http://localhost:3000
```

No `.env` needed. Paste your [Groq API key](https://console.groq.com) into the Settings panel — it lives in `sessionStorage` and is cleared when the tab closes.

```bash
npm run build && npm start   # production
```

---

## How to Use

1. **Settings** — click the gear icon, paste your Groq API key. Optionally set your role, meeting type, and meeting goal to sharpen suggestions from the start.
2. **Record** — click the mic button. Grant microphone access. The first suggestion batch appears after the first 30-second chunk is transcribed.
3. **Suggestions** — three cards refresh every ~30 seconds or on manual reload. Each card is useful on its own; clicking expands it with a type-specific deep answer in the chat panel.
4. **Chat** — type anything to ask about the conversation. Full transcript context is always included.
5. **Export** — download a JSON file with the full transcript, every suggestion batch, and the complete chat history with timestamps.

---

## Context Management — The Core Engineering Problem

A meeting can run for 60+ minutes. At one 30-second chunk per ~150 tokens, that is ~18,000 tokens of transcript alone — before chat history. The model's usable context window is finite and shared between the system prompt, transcript, chat history, and the new message. Naively appending everything eventually breaks or degrades.

The solution is a **two-axis rolling compaction** strategy that keeps the token payload strictly bounded regardless of session length.

### Axis 1 — Transcript Compaction

`useChat` tracks `transcriptSummaryUpToIndexRef`: the index of the last transcript chunk already folded into a summary. Before every chat request:

1. All chunks beyond that index are "unsummarized".
2. If unsummarized chunks exceed `KEEP_RECENT_CHUNKS` (2), everything except the 2 most recent chunks is sent to `/api/summarize`.
3. The summary endpoint folds `(existing summary) + (new chunks to compact)` into an updated summary — **incremental**, never a full rebuild.
4. The index ref advances to the last compacted chunk.

The payload sent to `/api/chat` is always:
```
[transcript summary — compressed older chunks]
[2 most recent chunks — verbatim]
```

### Axis 2 — Chat History Compaction

Same pattern for chat exchanges. `chatSummaryUpToIndexRef` tracks the last assistant message already summarized. Before each request:

1. Completed exchanges (user + assistant pairs) beyond the index are "unsummarized".
2. If unsummarized exchanges exceed `KEEP_RECENT_EXCHANGES` (2), all but the 2 most recent pairs are compacted.
3. Incremental fold: `(existing chat summary) + (new exchanges to compact)` → updated summary.

The payload is always:
```
[chat summary — compressed older exchanges]
[2 most recent exchanges — verbatim]
[new user message]
```

### Why Incremental Folding Matters

A naive approach would re-summarize the full history on every request. Incremental folding only processes the **delta** since the last compaction — O(new items) not O(all items). This keeps the summarization call fast and cheap even in hour-long sessions.

### Bounded Context Guarantee

No matter how long the session runs, every chat request payload is bounded to approximately:

```
system prompt (~300 tokens)
+ transcript summary (~500 tokens max, capped in /api/summarize)
+ 2 recent transcript chunks (~300 tokens)
+ chat summary (~500 tokens max)
+ 2 recent exchanges (~400 tokens)
+ new user message (~50 tokens)
─────────────────────────────
≈ 2,050 tokens worst case
```

This leaves ample room in the context window regardless of session length.

### Suggestions — Sliding Window (No Compaction Needed)

Suggestions do not need compaction because they only ever look at the last N transcript chunks (configurable context window, default 3). Within those N chunks, the split is:

- **Context:** chunks `[0, N-2]` — background for the model
- **Most recent:** chunk `[N-1]` — the focal point for new suggestions

This prevents older context from dominating while keeping the suggestion model grounded in what was just said.

---

## Prompt Architecture

### Brevity as a Design Constraint

Every AI response in this app is tuned for a user who is **actively in a meeting** — they cannot stop to read a paragraph. This shapes the output format at every layer:

- Suggestion cards are capped at **25 words** — scannable in under 2 seconds
- Chat expansion answers are capped at `max_completion_tokens: 800` with a prompt instruction to answer in **2–4 sentences or a short bullet list** unless the question genuinely requires more
- Fact-check answers lead with a **single verdict line** (Accurate / Not Accurate / Partially) before any explanation
- Answer expansions produce **exact words to say out loud** — no preamble, no hedging
- The summarization model is instructed to produce **8–12 sentences max** regardless of how much content it compresses

The guiding principle: the preview card alone should deliver value. Clicking is for when you have a moment, not a requirement.

### Live Suggestions

Each refresh sends a system prompt that enforces:
- Exactly 3 suggestions
- Type selection rules: if a question was just asked → at least one `answer`; if a factual claim was made → include a `fact`; no type appears more than twice
- Max 25 words per suggestion — actionable immediately, not exploratory
- No overlap in topics across the 3 cards

The user role, meeting type, and meeting goal (all set in Settings) are injected into the system prompt so the model adapts framing to context — a sales call gets different suggestions than a technical architecture review.

### Type-Specific Expansion Prompts

Clicking a card routes it through a dedicated system prompt rather than generic chat:

| Type | Expansion focus |
|---|---|
| Question | Natural phrasing to say out loud + likely follow-up to expect |
| Talking point | One-sentence intro to raise it + 3 key points to make |
| Answer | Exact words to say, crisp and confident |
| Fact-check | Single verdict line (Accurate / Not Accurate / Partially) + specific explanation |

All prompts are editable in Settings and default to `lib/defaults.ts`.

---

## Audio Pipeline

`useAudioRecorder` runs a MediaRecorder cycle:

1. Start recording → collect audio into a blob
2. Every 30 seconds: stop → POST blob to `/api/transcribe` → restart
3. Blobs under 1 KB are discarded (silence / mic closed too quickly)
4. Each transcription result becomes a timestamped chunk appended to the transcript

The 30-second boundary is a hard timer, not voice-activity detection. This occasionally cuts a sentence mid-thought, which is why the N-1 / most-recent context split exists — the boundary chunk is always the focal point, not the background.

Manual reload flushes the current in-progress chunk before generating suggestions, ensuring suggestions always reflect the most recent speech.

---

## Settings

| Setting | Description | Default |
|---|---|---|
| **Groq API Key** | Required. Stored in memory only, never persisted. | — |
| **Your role** | Who you are — personalizes suggestion framing. | `Meeting participant` |
| **Meeting type** | Type of meeting (e.g. "Job interview", "Sales call"). Shapes suggestion mix. | _(blank)_ |
| **Meeting goal** | What you are trying to achieve. Suggestions are biased toward this outcome. | _(blank)_ |
| **Context window** | Number of 30s chunks fed to the suggestions model (1–10). | `3` |
| **Live suggestions prompt** | System prompt for suggestion generation. | See `lib/defaults.ts` |
| **Chat prompt** | Base system prompt for free-form chat. | See `lib/defaults.ts` |
| **Question / Talking / Answer / Fact-check prompts** | Per-type expansion prompts used when clicking a card. | See `lib/defaults.ts` |

---

## Tradeoffs

**30-second polling vs. streaming transcription** — Whisper processes complete segments, not a live stream. 30 seconds is the natural fit and produces the best accuracy. Shorter segments (< 15s) degrade noticeably. The tradeoff is a 30-second lag before the first suggestions appear.

**Fixed chunk size vs. VAD segmentation** — Chunks are clock-boundary slices, not sentence-boundary slices. The N-1 context split absorbs boundary artifacts in practice.

**Rolling summarization vs. full transcript per request** — Full transcript gives perfect recall but grows linearly and eventually exceeds the context window. Rolling compaction bounds the payload at the cost of lossy compression on older content. The two-tier design (verbatim recent + summarized older) preserves the most actionable context.

**Incremental vs. full-rebuild summarization** — Full rebuilds re-process the entire history on every request, wasting tokens and adding latency. Incremental folding only processes the delta, keeping compaction calls fast regardless of session length.

**No streaming for suggestions** — Suggestions return as a complete JSON payload. Streaming a structured JSON array mid-generation creates partial-parse edge cases. Each batch is ~150 tokens so the latency difference is negligible.

**Client-side key entry** — The Groq key is entered in the UI and sent in request bodies (assignment requirement). A production system would store the key server-side per authenticated user.

---

## File Structure

```
app/
  page.tsx                  # Root layout — three-column shell + state wiring
  api/
    transcribe/route.ts     # Whisper transcription endpoint
    suggestions/route.ts    # Suggestion generation endpoint
    chat/route.ts           # Streaming chat endpoint
    summarize/route.ts      # Rolling compaction endpoint
    session-summary/route.ts# On-demand session summary + to-do extraction
components/
  TranscriptPanel.tsx       # Mic control + scrolling transcript + session summary tab
  SuggestionsPanel.tsx      # Live suggestion cards, batch history, countdown timer
  SuggestionCard.tsx        # Individual card with type badge and click handler
  ChatPanel.tsx             # Streaming chat with markdown rendering
  SettingsModal.tsx         # Settings drawer — all editable fields
hooks/
  useAudioRecorder.ts       # 30s audio cycling + Whisper transcription
  useSuggestions.ts         # Suggestion polling + sliding window context
  useChat.ts                # Chat state + two-axis rolling compaction
lib/
  defaults.ts               # Default prompts and constants for all AI operations
```

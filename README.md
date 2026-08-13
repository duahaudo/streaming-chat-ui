# Streaming chat UI

Token-by-token chat streaming, with abort mid-stream, retry, and error recovery
as first-class states instead of afterthoughts.

**Live demo:** https://streaming-chat-ui.vercel.app/

**Stack:** Next.js (App Router) · TypeScript · Tailwind

One screen. No database. No accounts. The conversation lives in the browser only —
reload and it is gone.

## Backend

One backend, everywhere: the Next.js route handler at `app/api/chat/route.ts` calls
OpenRouter (DeepSeek V4 Flash, free tier) and streams the reply back.

**Why a real provider, not a mock:** the transport gets proven against a live SSE
stream, not against a fake written to match the client.

**The API key never reaches the browser.** The route handler holds it, calls
OpenRouter server-side, and pipes the upstream `ReadableStream` straight back to the
client without buffering. The browser only ever talks to a same-origin `POST
/api/chat`.

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000 — needs OPENROUTER_API_KEY in .env.local
```

Production build:

```bash
npm run build && npm start
```

Server-side env vars — no `NEXT_PUBLIC_` prefix, so they stay out of the bundle:

```
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=deepseek/deepseek-v4-flash:free
```

**Tradeoff, stated plainly:** the route handler rules out `output: 'export'` — this
needs a runtime (Vercel, Cloudflare Pages via `@cloudflare/next-on-pages`, or any
Node host). A static export would be one less moving part, but the only way to keep
the key off the client is to have something server-side holding it.

## Decisions

**Transport: `fetch` + `ReadableStream`, not `EventSource`.** `EventSource` cannot
POST and cannot set headers, so it is unusable for a chat completion API.

**SSE parsing survives chunk boundaries.** `TextDecoderStream` into a frame parser
that buffers a partial frame across reads. A chunk boundary landing mid-frame is the
bug most implementations ship.

**Abort keeps the partial text.** `AbortController` behind a Stop button that stays
reachable for the whole stream. On abort the partial response stays in the
transcript, marked stopped — discarding it throws away the thing the user was
reading.

**Retry distinguishes where it failed.** Failed before the first token → safe silent
retry with exponential backoff plus jitter. Failed at token 400 → the user decides:
discard partial or resume from partial. No auto-retry on 4xx; a 429 waits out
`Retry-After`.

## Layout

```
app/            layout, page
app/api/chat/   route handler — holds the key, proxies OpenRouter, pipes the stream
components/     message bubble, composer, transcript, sidebar
lib/            api.ts (streaming client), store.ts (zustand)
```

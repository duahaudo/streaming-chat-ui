# Demo 1 — Streaming chat UI

Token-by-token chat streaming, with abort mid-stream, retry, and error recovery
as first-class states instead of afterthoughts.

**Stack:** Next.js (App Router) · TypeScript · Tailwind · MSW

One screen. No database. No accounts. The conversation lives in the browser only —
reload and it is gone.

## Two backends

| Environment | Backend |
| --- | --- |
| Local (`npm run dev`) | MSW service worker mocks the streaming endpoint |
| Production | Next.js route handler → OpenRouter, DeepSeek V4 Flash (free tier) |

**Why mock locally at the network boundary:** every failure mode — a 429, a stream
that dies at token 20, a corrupted SSE frame split across chunk boundaries — is
reproducible on demand. That is what makes the error handling demonstrable rather
than claimed. The same handlers can be reused by `setupServer` in tests.

**Why a real provider in production:** the transport gets proven against a live SSE
stream, not only against a mock written to match the client.

**The API key never reaches the browser.** `app/api/chat/route.ts` holds it, calls
OpenRouter server-side, and pipes the upstream `ReadableStream` straight back to the
client without buffering. The browser only ever talks to a same-origin `POST
/api/chat` — the same URL MSW intercepts locally, so the client code is identical in
both environments.

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000 — MSW mocks the backend, no key needed
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

## Scenarios

Handlers are swapped at runtime with `worker.resetHandlers()` + `worker.use(...)` —
no rebuild. Pick one from the control panel, or share a broken state as a link with
`?scenario=<id>`.

| id | behaviour |
| --- | --- |
| `happy` | ~30 tok/s |
| `slow` | 2 tok/s — easiest way to catch a mid-stream screenshot |
| `drop-at-20` | `controller.error()` after 20 tokens |
| `http-429` | 429 + `Retry-After: 3`, before any bytes |
| `http-500` | 500 before the first token |
| `malformed` | corrupt `data:` line, split across chunks |
| `no-first-byte` | headers, then silence — client timeout |
| `truncated` | stream ends with no terminal event |

Scenarios are local-only; production talks to the real provider.

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

**Rendering batches into `requestAnimationFrame`.** Re-parsing the markdown tree per
token is the obvious way to make a fast stream feel slow. The streaming tail renders
as plain text and markdown is re-parsed at chunk boundaries only, so an unclosed code
fence mid-stream does not corrupt the view.

**Accessibility and scroll.** `aria-live="polite"` on the assistant region, announced
on completion rather than per token. Stick-to-bottom scrolling that releases as soon
as the user scrolls up.

**MSW start is a gate, not a side effect.** `worker.start()` is async; a fetch that
fires before the worker claims the client hits the real network and 404s on a static
host. Rendering waits behind it, with a skeleton until it resolves. If `start()`
fails — Firefox private windows, insecure contexts, corporate policy — the app falls
back to an in-process transport returning the same `ReadableStream`, and a banner
names the active mode.

## Layout

```
app/            layout, page
app/api/chat/   route handler — holds the key, proxies OpenRouter, pipes the stream
components/     MockProvider (start gate), ScenarioPanel
lib/transport/  sseParser, streamClient, errors
mocks/          handlers/, scenarios/, browser.ts, server.ts
public/         mockServiceWorker.js
```

Spec: [Demo 1 — Streaming chat UI](https://docs.google.com/document/d/19KKkTM-GDuJmrX_AKSlnRkEo_Xz64Letp_oPGKJMKdE/edit)

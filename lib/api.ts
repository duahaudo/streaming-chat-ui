export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_ATTEMPTS = 3;

interface ChatError extends Error {
  name: string;
  status?: number;
  retryAfterMs?: number;
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    // An already-aborted signal never fires the event, so waiting on it would hang out the backoff.
    if (signal?.aborted) return reject(signal.reason);
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason);
    }, { once: true });
  });
}

async function openStream(messages: ChatMessage[], signal?: AbortSignal) {
  const res = await fetch("/api/chat", {
    method: "POST",
    body: JSON.stringify({ messages }),
    signal,
  });
  if (res.ok && res.body) return res.body.pipeThrough(new TextDecoderStream()).getReader();

  const detail = await res.text().catch(() => "");
  const error: ChatError = Object.assign(new Error(detail || `chat failed: ${res.status}`), {
    status: res.status,
    // A 429 says when to come back; anything else backs off on its own schedule.
    retryAfterMs: res.status === 429
      ? Number(res.headers.get("Retry-After") ?? 1) * 1000
      : undefined,
  });
  throw error;
}

/**
 * Retries only before the first token — once bytes have landed, re-requesting would
 * duplicate them, so a mid-stream failure is the caller's to resolve. 5xx and network
 * errors back off exponentially with jitter; other 4xx will fail the same way again.
 */
export async function* streamChat(
  messages: ChatMessage[],
  signal?: AbortSignal
): AsyncGenerator<string> {
  let reader: ReadableStreamDefaultReader<string> | undefined;
  for (let attempt = 0; !reader; attempt++) {
    try {
      reader = await openStream(messages, signal);
    } catch (err) {
      const { name, status, retryAfterMs } = err as ChatError;
      const retryable = name !== "AbortError" &&
        (status === undefined || status >= 500 || status === 429);
      if (!retryable || attempt >= MAX_ATTEMPTS - 1) throw err;
      await sleep(retryAfterMs ?? 300 * 2 ** attempt * (0.5 + Math.random()), signal);
    }
  }

  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    yield value;
  }
}

/** Asks the same chat endpoint for a short conversation title. Runs alongside the reply stream. */
export async function generateTitle(message: string): Promise<string> {
  let title = "";
  for await (const chunk of streamChat([
    {
      role: "user",
      content: `Reply with only a title of at most 5 words for a chat opening with the message below. No quotes, no trailing punctuation, no preamble.\n\n${message}`,
    },
  ])) {
    title += chunk;
  }
  return title.trim().replace(/^["']|["']$/g, "").slice(0, 60);
}

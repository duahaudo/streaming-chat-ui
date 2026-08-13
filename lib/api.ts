export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
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

export async function* streamChat(messages: ChatMessage[]): AsyncGenerator<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    body: JSON.stringify({ messages }),
  });
  if (!res.ok || !res.body) throw new Error(`chat failed: ${res.status}`);

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    yield value;
  }
}

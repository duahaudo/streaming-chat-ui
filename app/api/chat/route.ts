const MODEL = process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-v4-flash:free";

/** OpenRouter SSE frames in, plain content deltas out. Buffers a partial frame across chunks. */
export function sseToText() {
  let buffer = "";
  return new TransformStream<string, string>({
    transform(chunk, controller) {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") return;
        try {
          const delta = JSON.parse(data)?.choices?.[0]?.delta?.content;
          if (delta) controller.enqueue(delta);
        } catch {
          // keep-alive comments and non-JSON frames are not content
        }
      }
    },
  });
}

export async function POST(request: Request) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return new Response("OPENROUTER_API_KEY is not set", { status: 500 });

  const { messages } = await request.json();
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("messages must be a non-empty array", { status: 400 });
  }

  const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      messages,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    return new Response(await upstream.text(), { status: upstream.status });
  }

  return new Response(
    upstream.body
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(sseToText())
      .pipeThrough(new TextEncoderStream()),
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    }
  );
}

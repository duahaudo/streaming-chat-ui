const DEMO =
  "Each word arrives on its own tick, so the UI can paint tokens as they land instead of waiting for the whole answer.";

export async function POST(request: Request) {
  const { message } = await request.json();
  const words = `You said: "${message}". ${DEMO}`.split(" ");
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      for (const word of words) {
        controller.enqueue(encoder.encode(word + " "));
        await new Promise((r) => setTimeout(r, 60));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

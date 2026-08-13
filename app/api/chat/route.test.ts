// node --test app/api/chat/route.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { sseToText } from "./route.ts";

test("joins content deltas across a chunk boundary mid-frame", async () => {
  const frames = [
    ': OPENROUTER PROCESSING\n\ndata: {"choices":[{"delta":{"content":"Hel',
    'lo"}}]}\n\ndata: {"choices":[{"delta":{"content":" world"}}]}\n\ndata: [DONE]\n\n',
  ];

  const { readable, writable } = sseToText();
  const writer = writable.getWriter();
  (async () => {
    for (const f of frames) await writer.write(f);
    await writer.close();
  })();

  let out = "";
  const reader = readable.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += value;
  }
  assert.equal(out, "Hello world");
});

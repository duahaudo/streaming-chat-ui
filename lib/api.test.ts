// node --test lib/api.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateTitle } from "./api.ts";

test("accumulates the streamed title and strips quotes and whitespace", async () => {
  globalThis.fetch = async () =>
    new Response(
      new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode('  "Streaming chat'));
          c.enqueue(new TextEncoder().encode(' demo"\n'));
          c.close();
        },
      })
    );

  assert.equal(await generateTitle("how do I stream tokens?"), "Streaming chat demo");
});

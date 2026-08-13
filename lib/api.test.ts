// node --test lib/api.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateTitle, streamChat } from "./api.ts";

const text = (body: string) =>
  new Response(
    new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode(body));
        c.close();
      },
    })
  );

const drain = async (messages: Parameters<typeof streamChat>[0], signal?: AbortSignal) => {
  let out = "";
  for await (const chunk of streamChat(messages, signal)) out += chunk;
  return out;
};

const ASK = [{ role: "user" as const, content: "hi" }];

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

test("retries a 500 that failed before the first token", async () => {
  let calls = 0;
  globalThis.fetch = async () =>
    ++calls === 1 ? new Response("upstream exploded", { status: 500 }) : text("ok");

  assert.equal(await drain(ASK), "ok");
  assert.equal(calls, 2);
});

test("waits out Retry-After on a 429", async () => {
  let calls = 0;
  globalThis.fetch = async () =>
    ++calls === 1
      ? new Response("slow down", { status: 429, headers: { "Retry-After": "0" } })
      : text("ok");

  assert.equal(await drain(ASK), "ok");
  assert.equal(calls, 2);
});

test("does not retry a 4xx that is not a 429", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response("messages must be a non-empty array", { status: 400 });
  };

  await assert.rejects(drain(ASK), /non-empty array/);
  assert.equal(calls, 1);
});

test("gives up after the attempt cap instead of retrying forever", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw Object.assign(new Error("network down"), { name: "TypeError" });
  };

  await assert.rejects(drain(ASK), /network down/);
  assert.equal(calls, 3);
});

test("an abort mid-backoff stops the retry loop", async () => {
  const controller = new AbortController();
  globalThis.fetch = async () => {
    controller.abort(Object.assign(new Error("stopped"), { name: "AbortError" }));
    return new Response("upstream exploded", { status: 500 });
  };

  await assert.rejects(drain(ASK, controller.signal), /stopped/);
});

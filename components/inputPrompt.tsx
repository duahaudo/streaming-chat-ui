"use client";

import { useRef, useState } from "react";
import {
  useChatStore,
  useConversationStore,
  useCurrentConversation
} from "@/lib/store";
import { generateTitle, streamChat, type ChatMessage } from "@/lib/api";

interface InputPromptProps {
  className?: string;
}

interface Failure {
  conversationId: string;
  history: ChatMessage[];
  partial: string;
  reason: string;
}

export default function InputPrompt({ className }: InputPromptProps) {
  const [message, setMessage] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const addMessage = useChatStore((s) => s.addMessage);
  const appendToLast = useChatStore((s) => s.appendToLast);
  const patchLast = useChatStore((s) => s.patchLast);
  const currentConversationId = useCurrentConversation((s) => s.conversationId)
  const setConversationId = useCurrentConversation((s) => s.setConversationId);
  const addConversation = useConversationStore((s) => s.addConversation);
  const renameConversation = useConversationStore((s) => s.renameConversation);

  const partialOf = (conversationId: string) =>
    useChatStore.getState().messages.findLast((m) => m.conversationId === conversationId)?.message ?? "";

  /** Streams into the conversation's last (assistant) message, which must already exist. */
  const run = async (conversationId: string, history: ChatMessage[]) => {
    setFailure(null);
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      for await (const chunk of streamChat(history, controller.signal)) {
        appendToLast(chunk, conversationId);
      }
      patchLast({ status: undefined }, conversationId);
    } catch (err) {
      // Abort is a choice, not a failure: the partial text stays, marked stopped.
      if (controller.signal.aborted) {
        patchLast({ status: "stopped" }, conversationId);
      } else {
        patchLast({ status: "error" }, conversationId);
        setFailure({
          conversationId,
          history,
          partial: partialOf(conversationId),
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if (!text || streaming) return;

    // Sending with nothing selected starts a conversation instead of orphaning the message.
    let conversationId = currentConversationId;
    if (!conversationId) {
      conversationId = addConversation("New conversation");
      setConversationId(conversationId);
    }

    const isFirstMessage = !useChatStore
      .getState()
      .messages.some((m) => m.conversationId === conversationId);

    addMessage({
      message: text,
      sender: "user",
      timestamp: new Date().toLocaleTimeString(),
    }, conversationId);
    setMessage("");

    // Read after the user message lands, before the empty assistant placeholder is added.
    const history: ChatMessage[] = useChatStore
      .getState()
      .messages.filter((m) => m.conversationId === conversationId && m.message)
      .map((m) => ({ role: m.sender, content: m.message }));

    if (isFirstMessage) {
      generateTitle(text)
        .then((title) => title && renameConversation(conversationId, title))
        .catch(() => {}); // a missing title must not break the reply
    }

    addMessage({
      message: "",
      sender: "assistant",
      timestamp: new Date().toLocaleTimeString(),
    }, conversationId);

    await run(conversationId, history);
  };

  /**
   * Resume feeds the partial back as the start of the assistant turn so the model
   * continues it; discard clears the bubble and asks again from scratch.
   */
  const retry = async (resume: boolean) => {
    if (!failure) return;
    const { conversationId, history, partial } = failure;
    if (resume && partial) {
      await run(conversationId, [...history, { role: "assistant", content: partial }]);
    } else {
      patchLast({ message: "", status: undefined }, conversationId);
      await run(conversationId, history);
    }
  };

  return (
    <form className={className} onSubmit={handleSend}>
      {failure && (
        <div className="flex items-center gap-2.5 rounded-lg border border-line-strong bg-surface px-3 py-2 text-[12.5px]">
          <span className="flex-1 min-w-0 truncate text-ink-soft">{failure.reason}</span>
          {failure.partial && (
            <button type="button" onClick={() => retry(true)} className="flex-none font-medium text-accent cursor-pointer hover:underline">
              Resume
            </button>
          )}
          <button type="button" onClick={() => retry(false)} className="flex-none font-medium text-accent cursor-pointer hover:underline">
            {failure.partial ? "Discard and retry" : "Retry"}
          </button>
        </div>
      )}

      <div className="flex gap-2.5 items-end border border-line-strong rounded-xl bg-white pl-3.5 p-2">
        <input
          type="text"
          placeholder={streaming ? "Waiting for the reply to finish…" : "Ask something…"}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={streaming}
          className="flex-1 border-0 bg-transparent w-full py-1.5 text-[14.5px] leading-[1.5] text-ink placeholder:text-faint focus:outline-none"
          />
        {streaming ? (
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            className="flex-none h-[34px] px-4 rounded-lg border border-line-strong bg-white text-[13.5px] font-medium text-ink cursor-pointer hover:bg-hover">Stop</button>
        ) : (
          <button
            disabled={!message.trim()}
            className="flex-none h-[34px] px-4 rounded-lg bg-accent text-white text-[13.5px] font-medium cursor-pointer disabled:bg-line-strong disabled:cursor-default">Send</button>
        )}
      </div>
      <div className="font-mono text-[10.5px] text-faint tracking-[0.03em]">
        {streaming ? "Streaming — Stop keeps what has arrived" : "Enter to send"}
      </div>
    </form>
  );
}

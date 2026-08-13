"use client";

import { useEffect, useMemo, useRef } from "react";
import InputPrompt from "./inputPrompt";
import MessageBubble from "./messageBubble";
import { useChatStore, useCurrentConversation } from "@/lib/store";

export default function Chat() {
  const conversationId = useCurrentConversation((s) => s.conversationId)
  const allMessages = useChatStore((s) => s.messages);
  const messages = useMemo(
    () => allMessages.filter(m => m.conversationId === conversationId),
    [allMessages, conversationId]
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-canvas w-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 pt-7 pb-3">
        <div className="max-w-[720px] mx-auto px-6 flex flex-col gap-[22px]">
          {messages.length === 0 ? (
            <div className="mt-[22vh] flex flex-col items-center gap-2.5 text-center">
              <div className="font-serif text-3xl leading-tight">What can I help with?</div>
              <div className="text-[13.5px] text-muted">
                Send a message — the reply streams in, and the first one names this conversation.
              </div>
            </div>
          ) : (
            messages.map((message, idx) => (
              <MessageBubble key={idx} message={message.message} sender={message.sender} timestamp={message.timestamp} />
            ))
          )}
        </div>
      </div>

      <div className="shrink-0 w-full border-t border-line bg-surface">
        <InputPrompt className="max-w-[720px] mx-auto px-6 pt-4 pb-5 flex flex-col gap-2" />
      </div>
    </div>
  );
}

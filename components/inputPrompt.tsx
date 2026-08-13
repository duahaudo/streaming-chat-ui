"use client";

import { useState } from "react";
import { useChatStore, useCurrentConversation } from "@/lib/store";

interface InputPromptProps {
  className?: string;
}

export default function InputPrompt({ className }: InputPromptProps) {
  const [message, setMessage] = useState("");
  const [streaming, setStreaming] = useState(false);
  const addMessage = useChatStore((s) => s.addMessage);
  const appendToLast = useChatStore((s) => s.appendToLast);
  const conversationId = useCurrentConversation((s) => s.conversationId as string)

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if (!text || streaming) return;
    addMessage({
      message: text,
      sender: "user",
      timestamp: new Date().toLocaleTimeString(),
    }, conversationId);
    setMessage("");
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: text }),
      });
      addMessage({
        message: "",
        sender: "assistant",
        timestamp: new Date().toLocaleTimeString(),
      }, conversationId);

      const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        appendToLast(value, conversationId);
      }
    } finally {
      setStreaming(false);
    }
  };

  return (
    <form className={className} onSubmit={handleSend}>
      <div className="flex gap-2.5 items-end border border-line-strong rounded-xl bg-white pl-3.5 p-2">
        <input
          type="text"
          placeholder={streaming ? "Waiting for the reply to finish…" : "Ask something…"}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={streaming}
          className="flex-1 border-0 bg-transparent w-full py-1.5 text-[14.5px] leading-[1.5] text-ink placeholder:text-faint focus:outline-none"
          />
        <button
          disabled={streaming || !message.trim()}
          className="flex-none h-[34px] px-4 rounded-lg bg-accent text-white text-[13.5px] font-medium cursor-pointer disabled:bg-line-strong disabled:cursor-default">Send</button>
      </div>
      <div className="font-mono text-[10.5px] text-faint tracking-[0.03em]">
        {streaming ? "Composer locked while the reply streams" : "Enter to send"}
      </div>
    </form>
  );
}
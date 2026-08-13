"use client";

import { useState } from "react";
import { 
  useChatStore, 
  useConversationStore, 
  useCurrentConversation 
} from "@/lib/store";
import { generateTitle, streamChat } from "@/lib/api";

interface InputPromptProps {
  className?: string;
}

export default function InputPrompt({ className }: InputPromptProps) {
  const [message, setMessage] = useState("");
  const [streaming, setStreaming] = useState(false);
  const addMessage = useChatStore((s) => s.addMessage);
  const appendToLast = useChatStore((s) => s.appendToLast);
  const currentConversationId = useCurrentConversation((s) => s.conversationId)
  const setConversationId = useCurrentConversation((s) => s.setConversationId);
  const addConversation = useConversationStore((s) => s.addConversation);
  const renameConversation = useConversationStore((s) => s.renameConversation);

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
    setStreaming(true);

    // Read after the user message lands, before the empty assistant placeholder is added.
    const history = useChatStore
      .getState()
      .messages.filter((m) => m.conversationId === conversationId && m.message)
      .map((m) => ({ role: m.sender, content: m.message }));

    if (isFirstMessage) {
      generateTitle(text)
        .then((title) => title && renameConversation(conversationId, title))
        .catch(() => {}); // a missing title must not break the reply
    }

    try {
      addMessage({
        message: "",
        sender: "assistant",
        timestamp: new Date().toLocaleTimeString(),
      }, conversationId);

      for await (const chunk of streamChat(history)) {
        appendToLast(chunk, conversationId);
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
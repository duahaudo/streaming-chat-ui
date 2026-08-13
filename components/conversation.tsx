"use client"

import { useConversationStore, useCurrentConversation } from "@/lib/store";

interface ConversationProps {
    title: string;
    description: string;
}

function Conversation({title, description}: ConversationProps) {
  const setCurrentConversation = useCurrentConversation(s => s.setConversationId)
  const active = useCurrentConversation(s => s.conversationId) === description

  return (
    <div
      className={`rounded-lg px-2.5 py-2.5 text-[13px] leading-[1.35] truncate cursor-pointer hover:bg-hover ${
        active ? "bg-active text-ink font-medium" : "text-subtle"
      }`}
      onClick={() => setCurrentConversation(description)}
    >
        {title}
    </div>
  );
}

export default function Conversations() {
  const conversations = useConversationStore(s => s.conversations)
  const addConversation = useConversationStore(s => s.addConversation)

  return (
    <div className="w-full flex flex-col min-h-0">
      <div className="p-3.5">
        <button
          className="w-full flex items-center justify-center gap-2 h-[38px] rounded-[9px] border border-line-strong bg-white text-[13.5px] font-medium text-ink cursor-pointer transition-colors hover:bg-hover hover:border-[#c9c4bb]"
          onClick={() => addConversation(Date.now().toLocaleString())}>
          <span className="text-base leading-none -mt-px">+</span>
          New conversation
        </button>
      </div>
      <nav className="flex flex-col gap-0.5 overflow-y-auto px-2 pb-4">
        {conversations.map(con => (
          <Conversation title={con.name} key={con.id} description={con.id} />
        ))}
      </nav>
    </div>
  )
}
import { create } from "zustand";
import type { MessageBubbleProps } from "@/components/messageBubble";


interface MessageStore extends MessageBubbleProps {
  conversationId: string
}

interface ChatStore {
  messages: MessageStore[];
  addMessage: (message: MessageBubbleProps, conversationId: string) => void;
  appendToLast: (chunk: string, conversationId: string) => void;
}

interface ConversationStore {
  conversations: {
    id: string
    name: string
  }[]
  addConversation: (name: string) => void
}

interface SelectedConversationStore {
  conversationId?: string
  setConversationId: (id: string) => void
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  addMessage: (message, conversationId) => set((s) => ({ 
    messages: [...s.messages, {
      ...message,
      conversationId
    }],
  })),
  appendToLast: (chunk, conversationId) => set((s) => {
    const last = s.messages.findLastIndex((m) => m.conversationId === conversationId);
    if (last === -1) return s;
    return {
      messages: s.messages.map((m, i) =>
        i === last ? { ...m, message: m.message + chunk } : m
      ),
    };
  }),
}));


export const useConversationStore = create<ConversationStore>((set) => ({
  conversations: [],
  addConversation: (name: string) => set((c) => ({
    conversations: [...c.conversations, {
      id: crypto.randomUUID(),
      name
    }]}))
}))

export const useCurrentConversation = create<SelectedConversationStore>((set) => ({
  conversationId: "",
  setConversationId: (id) => set((c) => ({ conversationId: id }))
}))
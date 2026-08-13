import { create } from "zustand";
import type { MessageBubbleProps } from "@/components/messageBubble";


interface MessageStore extends MessageBubbleProps {
  conversationId: string
}

interface ChatStore {
  messages: MessageStore[];
  addMessage: (message: MessageBubbleProps, conversationId: string) => void;
  appendToLast: (chunk: string, conversationId: string) => void;
  /** Patches the conversation's last message — status marks, or clearing a discarded partial. */
  patchLast: (patch: Partial<MessageBubbleProps>, conversationId: string) => void;
}

interface ConversationStore {
  conversations: {
    id: string
    name: string
  }[]
  /** Returns the new conversation's id so the caller can select it. */
  addConversation: (name: string) => string
  renameConversation: (id: string, name: string) => void
}

interface SelectedConversationStore {
  conversationId?: string
  setConversationId: (id: string) => void
}

const updateLast = (
  s: ChatStore,
  conversationId: string,
  patch: (m: MessageStore) => MessageStore
) => {
  const last = s.messages.findLastIndex((m) => m.conversationId === conversationId);
  if (last === -1) return s;
  return { messages: s.messages.map((m, i) => (i === last ? patch(m) : m)) };
};

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  addMessage: (message, conversationId) => set((s) => ({
    messages: [...s.messages, {
      ...message,
      conversationId
    }],
  })),
  appendToLast: (chunk, conversationId) => set((s) =>
    updateLast(s, conversationId, (m) => ({ ...m, message: m.message + chunk }))
  ),
  patchLast: (patch, conversationId) => set((s) =>
    updateLast(s, conversationId, (m) => ({ ...m, ...patch }))
  ),
}));


export const useConversationStore = create<ConversationStore>((set) => ({
  conversations: [],
  addConversation: (name: string) => {
    const id = crypto.randomUUID();
    set((c) => ({ conversations: [...c.conversations, { id, name }] }));
    return id;
  },
  renameConversation: (id, name) => set((c) => ({
    conversations: c.conversations.map((con) => con.id === id ? { ...con, name } : con)
  }))
}))

export const useCurrentConversation = create<SelectedConversationStore>((set) => ({
  conversationId: "",
  setConversationId: (id) => set(() => ({ conversationId: id }))
}))
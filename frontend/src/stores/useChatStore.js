import { chatService } from '@/services/chatService';
import { create } from 'zustand'
import { persist } from 'zustand/middleware';

export const useChatStore = create(
    persist(
        (set, get) => ({
            conversations: [],
            messages: {},
            activeConversationId: null,
            loading: false,

            setActiveConversationId: (id) => set({ activeConversationId: id }),
            reset: () => {
                set({
                    conversations: [],
                    messages: {},
                    activeConversationId: null,
                    loading: false,
                })
            },
            fetchConversations: async () => {
                try {
                    set({ loading: true });

                    const { conversations } = chatService.fetchConversations();

                    set({ conversations, loading: false });

                } catch (error) {
                    console.error("Lỗi xảy ra khi fetch Conversation:", error);
                    set({ loading: false });
                }
            }


        }),
        {
            name: "chat-storage",
            partialize: (state) => ({ conversations: state.conversations })
        }
    )
)
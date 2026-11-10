// src/stores/useChatStore.js
import { chatService } from '@/services/chatService';
import { create } from 'zustand'
import { persist } from 'zustand/middleware';

export const useChatStore = create(
    persist(
        (set, get) => ({
            conversations: [],
            messages: {}, // Lưu theo dạng { conversationId: [msg1, msg2] }
            cursors: {},
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
                    const { conversations } = await chatService.fetchConversations();
                    set({ conversations, loading: false });
                } catch (error) {
                    console.error("Lỗi xảy ra khi fetch Conversation:", error);
                    set({ loading: false });
                }
            },

            // Thêm action này
            fetchMessages: async (conversationId, cursor = null) => {
                // Nếu đã có tin nhắn trong store rồi thì không cần gọi lại API (tránh spam)
                // if (!cursor && get().messages[conversationId]) return;
                if (get().messages[conversationId]) return;

                try {
                    const { messages } = await chatService.fetchMessages(conversationId);
                    set((state) => ({
                        messages: {
                            ...state.messages,
                            [conversationId]: messages
                        }
                    }));
                } catch (error) {
                    console.error("Lỗi xảy ra khi fetch Messages:", error);
                }
            }
        }),
        {
            name: "chat-storage",
            partialize: (state) => ({ conversations: state.conversations })
        }
    )
)
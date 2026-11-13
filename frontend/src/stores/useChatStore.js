// src/stores/useChatStore.js
import { chatService } from '@/services/chatService';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useChatStore = create(
    persist(
        (set, get) => ({
            conversations: [],
            messages: {},      // { conversationId: [msg1, msg2] }
            cursors: {},       // { conversationId: cursor }
            activeConversationId: null,
            conLoading: false,
            messageLoading: false,

            // ==================== ACTIVE ====================
            setActiveConversationId: (id) => set({ activeConversationId: id }),

            // ==================== RESET ====================
            reset: () => {
                set({
                    conversations: [],
                    messages: {},
                    cursors: {},
                    activeConversationId: null,
                    conLoading: false,
                    messageLoading: false,
                });
            },

            // ==================== FETCH CONVERSATIONS ====================
            fetchConversations: async () => {
                try {
                    set({ conLoading: true });
                    const { conversations } = await chatService.fetchConversations();
                    set({ conversations, conLoading: false });
                } catch (error) {
                    console.error("Lỗi xảy ra khi fetch Conversation:", error);
                    set({ conLoading: false });
                }
            },

            // ==================== FETCH MESSAGES ====================
            fetchMessages: async (conversationId, cursor = null) => {
                // Đã có tin nhắn rồi thì thôi (tránh spam khi chuyển qua lại)
                // Bỏ check này nếu bạn muốn luôn refresh
                if (!cursor && get().messages[conversationId]) return;

                try {
                    set({ messageLoading: true });
                    const { messages, nextCursor } =
                        await chatService.fetchMessages(conversationId, cursor);

                    set((state) => ({
                        messages: cursor
                            ? {
                                // load thêm tin cũ -> prepend
                                ...state.messages,
                                [conversationId]: [
                                    ...messages,
                                    ...(state.messages[conversationId] || []),
                                ],
                            }
                            : {
                                ...state.messages,
                                [conversationId]: messages,
                            },
                        cursors: {
                            ...state.cursors,
                            [conversationId]: nextCursor ?? null,
                        },
                        messageLoading: false,
                    }));
                } catch (error) {
                    console.error("Lỗi xảy ra khi fetch Messages:", error);
                    set({ messageLoading: false });
                }
            },

           
        }),
        {
            name: "chat-storage",
            // Chỉ persist conversations — messages để fetch lại mỗi lần mở
            partialize: (state) => ({ conversations: state.conversations }),
        }
    )
);
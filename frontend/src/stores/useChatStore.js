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
            sending: {},       // 🆕 { conversationId: boolean }

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
                    sending: {},
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
                if (!cursor && get().messages[conversationId]) return;

                try {
                    set({ messageLoading: true });
                    const { messages, nextCursor } =
                        await chatService.fetchMessages(conversationId, cursor);

                    set((state) => ({
                        messages: cursor
                            ? {
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

            // ==================== HELPERS (private) ====================
            _replaceMessage: (conversationId, tempId, realMsg) => {
                set((s) => ({
                    messages: {
                        ...s.messages,
                        [conversationId]: (s.messages[conversationId] || []).map((m) =>
                            m._id === tempId ? realMsg : m
                        ),
                    },
                }));
            },

            // Cập nhật lastMessage + sort conversation lên top
            _bumpConversation: (conversationId, message, senderUserId) => {
                set((s) => {
                    const updated = s.conversations.map((c) => {
                        if (c._id !== conversationId) return c;
                        return {
                            ...c,
                            lastMessageAt: message.createdAt,
                            lastMessage: {
                                _id: message._id,
                                content: message.content,
                                senderId: senderUserId,
                                createdAt: message.createdAt,
                            },
                        };
                    });
                    updated.sort(
                        (a, b) =>
                            new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)
                    );
                    return { conversations: updated };
                });
            },

            // Khi gửi fail — kéo lastMessage về tin thật cuối cùng còn lại
            _syncConversationLastMessage: (conversationId) => {
                const list = get().messages[conversationId] || [];
                const realList = list.filter((m) => !m._pending && !m._failed);
                const last = realList[realList.length - 1];
                if (!last) return;
                const senderId = last.senderId?._id ?? last.senderId;
                get()._bumpConversation(conversationId, last, senderId);
            },

            // ==================== SEND MESSAGE 🆕 ====================
            sendMessage: async ({ conversationId, type, content, imgURL, senderUser }) => {
                if (!conversationId || !senderUser) return;
                const trimmed = content?.trim() ?? "";
                if (!trimmed && !imgURL) return;
                if (get().sending[conversationId]) return; // chống double-click

                const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                const tempMsg = {
                    _id: tempId,
                    conversationId,
                    senderId: senderUser, // full object, khớp shape messages đã fetch
                    content: trimmed,
                    imgURL: imgURL ?? null,
                    createdAt: new Date().toISOString(),
                    _pending: true,
                    _failed: false,
                };

                // 1) Optimistic: append + set sending + bump conversation
                set((s) => ({
                    messages: {
                        ...s.messages,
                        [conversationId]: [...(s.messages[conversationId] || []), tempMsg],
                    },
                    sending: { ...s.sending, [conversationId]: true },
                }));
                get()._bumpConversation(conversationId, tempMsg, senderUser._id);

                // 2) API
                try {
                    const realMsg = await chatService.sendMessage({
                        conversationId,
                        type,
                        content: trimmed,
                        imgURL,
                    });
                    // ghép senderUser để giữ shape giống messages đã fetch
                    const merged = { ...realMsg, senderId: senderUser, _pending: false, _failed: false };
                    get()._replaceMessage(conversationId, tempId, merged);
                    get()._bumpConversation(conversationId, merged, senderUser._id);
                } catch (err) {
                    console.error("Gửi tin nhắn thất bại:", err.response?.data || err);
                    // mark failed — giữ lại trong list để user "Gửi lại"
                    set((s) => ({
                        messages: {
                            ...s.messages,
                            [conversationId]: (s.messages[conversationId] || []).map((m) =>
                                m._id === tempId ? { ...m, _pending: false, _failed: true } : m
                            ),
                        },
                    }));
                    // kéo lastMessage của conversation về tin thật gần nhất
                    get()._syncConversationLastMessage(conversationId);
                } finally {
                    set((s) => ({ sending: { ...s.sending, [conversationId]: false } }));
                }
            },

            // ==================== RETRY FAILED MESSAGE 🆕 ====================
            retryMessage: async ({ conversationId, tempId, type, senderUser }) => {
                if (!conversationId || !senderUser) return;
                if (get().sending[conversationId]) return;

                const list = get().messages[conversationId] || [];
                const temp = list.find((m) => m._id === tempId);
                if (!temp) return;

                // reset về pending
                set((s) => ({
                    messages: {
                        ...s.messages,
                        [conversationId]: (s.messages[conversationId] || []).map((m) =>
                            m._id === tempId ? { ...m, _pending: true, _failed: false } : m
                        ),
                    },
                    sending: { ...s.sending, [conversationId]: true },
                }));

                try {
                    const realMsg = await chatService.sendMessage({
                        conversationId,
                        type,
                        content: temp.content,
                        imgURL: temp.imgURL,
                    });
                    const merged = { ...realMsg, senderId: senderUser, _pending: false, _failed: false };
                    get()._replaceMessage(conversationId, tempId, merged);
                    get()._bumpConversation(conversationId, merged, senderUser._id);
                } catch (err) {
                    console.error("Gửi lại tin nhắn thất bại:", err);
                    set((s) => ({
                        messages: {
                            ...s.messages,
                            [conversationId]: (s.messages[conversationId] || []).map((m) =>
                                m._id === tempId ? { ...m, _pending: false, _failed: true } : m
                            ),
                        },
                    }));
                } finally {
                    set((s) => ({ sending: { ...s.sending, [conversationId]: false } }));
                }
            },
        }),
        {
            name: "chat-storage",
            partialize: (state) => ({ conversations: state.conversations }),
        }
    )
);
// src/stores/useChatStore.js
import { chatService } from '@/services/chatService';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from './useAuthStore';

export const useChatStore = create(
    persist(
        (set, get) => ({
            conversations: [],
            messages: {},      // { conversationId: [msg1, msg2] }
            cursors: {},       // { conversationId: cursor }
            activeConversationId: null,
            conLoading: false,
            messageLoading: false,
            sending: {},       // { conversationId: boolean }

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
                if (!cursor && get().cursors[conversationId] !== undefined) return;

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
                set((s) => {
                    const currentMessages = s.messages[conversationId] || [];
                    const isExist = currentMessages.some((m) => m._id?.toString() === realMsg._id?.toString());

                    return {
                        messages: {
                            ...s.messages,
                            [conversationId]: isExist
                                ? currentMessages.filter((m) => m._id?.toString() !== tempId?.toString())
                                : currentMessages.map((m) => (m._id?.toString() === tempId?.toString() ? realMsg : m)),
                        },
                    };
                });
            },
            _setMyStatus: (conversationId, status) => {
                set((s) => {
                    const target = s.conversations.find(
                        (c) => c._id?.toString() === conversationId?.toString()
                    );
                    if (!target || target.myStatus === status) return s;
                    return {
                        conversations:
                            status === "declined"
                                ? s.conversations.filter((c) => c !== target)
                                : s.conversations.map((c) => (c === target ? { ...c, myStatus: status } : c)),
                    };
                });
            },

            _bumpConversation: (conversationId, message, senderUserId) => {
                set((s) => {
                    const updated = s.conversations.map((c) => {
                        if (c._id?.toString() !== conversationId?.toString()) return c;
                        return {
                            ...c,
                            lastMessageAt: message.createdAt,
                            lastMessage: {
                                _id: message._id,
                                content: message.content,
                                type: message.type,
                                senderId: senderUserId,
                                createdAt: message.createdAt,
                            },
                            // Gửi tin mới -> Chỉ người gửi đã xem
                            seenBy: [senderUserId?.toString()],
                        };
                    });
                    updated.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
                    return { conversations: updated };
                });
            },

            updateUserLastActiveAt: (userId, lastActiveAt) => {
                set((state) => ({
                    conversations: state.conversations.map((c) => ({
                        ...c,
                        participants: c.participants.map((p) => {
                            const pId = p._id || p.userId?._id;
                            if (pId?.toString() === userId?.toString()) {
                                return { ...p, lastActiveAt };
                            }
                            return p;
                        })
                    }))
                }));
            },

            _syncConversationLastMessage: (conversationId) => {
                const list = get().messages[conversationId] || [];
                const realList = list.filter((m) => !m._pending && !m._failed);
                const last = realList[realList.length - 1];
                if (!last) return;
                const senderId = last.senderId?._id ?? last.senderId;
                get()._bumpConversation(conversationId, last, senderId);
            },

            // ==================== START DIRECT CHAT (chat nháp -> tin đầu tiên) ====================
            startDirectChat: async ({ recipientId, content }) => {
                const trimmed = content?.trim() ?? "";
                if (!recipientId || !trimmed) return null;
                if (get().sending["draft"]) return null;

                set((s) => ({ sending: { ...s.sending, draft: true } }));
                try {
                    const msg = await chatService.sendFirstMessage({ recipientId, content: trimmed });
                    await get().fetchConversations();
                    return msg.conversationId?.toString() ?? null;
                } catch (err) {
                    console.error("Gửi tin đầu tiên thất bại:", err);
                    return null;
                } finally {
                    set((s) => ({ sending: { ...s.sending, draft: false } }));
                }
            },

            // ==================== SEND MESSAGE ====================
            sendMessage: async ({ conversationId, type, content, imgURL, senderUser }) => {
                if (!conversationId || !senderUser) return;
                const trimmed = content?.trim() ?? "";
                if (!trimmed && !imgURL) return;
                if (get().sending[conversationId]) return;

                const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                const tempMsg = {
                    _id: tempId,
                    conversationId,
                    senderId: senderUser,
                    content: trimmed,
                    imgURL: imgURL ?? null,
                    type: imgURL ? "image" : "text",
                    createdAt: new Date().toISOString(),
                    _pending: true,
                    _failed: false,
                };

                // 1) Optimistic UI
                set((s) => ({
                    messages: {
                        ...s.messages,
                        [conversationId]: [...(s.messages[conversationId] || []), tempMsg],
                    },
                    sending: { ...s.sending, [conversationId]: true },
                }));
                get()._bumpConversation(conversationId, tempMsg, senderUser._id);
                get()._setMyStatus(conversationId, "accepted"); // trả lời -> lên chính thức

                // 2) Gọi API
                try {
                    const realMsg = await chatService.sendMessage({
                        conversationId,
                        type,
                        content: trimmed,
                        imgURL,
                    });
                    const merged = { ...realMsg, senderId: senderUser, _pending: false, _failed: false };

                    // Chỉ thay thế tin nhắn, không gọi lại _bumpConversation để tránh đè mất seenBy từ Socket
                    get()._replaceMessage(conversationId, tempId, merged);
                } catch (err) {
                    console.error("Gửi tin nhắn thất bại:", err);
                    set((s) => ({
                        messages: {
                            ...s.messages,
                            [conversationId]: (s.messages[conversationId] || []).map((m) =>
                                m._id === tempId ? { ...m, _pending: false, _failed: true } : m
                            ),
                        },
                    }));
                    get()._syncConversationLastMessage(conversationId);
                } finally {
                    set((s) => ({ sending: { ...s.sending, [conversationId]: false } }));
                }
            },

            // ==================== RECEIVE MESSAGE (REALTIME) ====================
            receiveMessage: (message) => {
                const { conversationId, senderId } = message;
                const currentUser = useAuthStore.getState().user;
                const currentUserId = currentUser?._id?.toString();
                const isMyMessage = senderId?._id?.toString() === currentUserId;
                const activeId = get().activeConversationId?.toString();
                const isChatOpen = activeId === conversationId?.toString();
                // Cuộc trò chuyện mới chưa có trong store (người lạ nhắn lần đầu, bị thêm vào nhóm)
                const exists = get().conversations.some((c) => c._id?.toString() === conversationId?.toString());
                if (!exists) {
                    get().fetchConversations();
                    return;
                }

                set((state) => {
                    const currentMessages = state.messages[conversationId] || [];
                    if (currentMessages.some((m) => m._id?.toString() === message._id?.toString())) return state;

                    const newMessages = {
                        ...state.messages,
                        [conversationId]: [...currentMessages, message],
                    };

                    const updatedConversations = state.conversations.map((c) => {
                        if (c._id?.toString() !== conversationId?.toString()) return c;

                        const currentUnread = c.unreadCounts?.[currentUserId] || 0;
                        const newUnread = (!isMyMessage && !isChatOpen) ? currentUnread + 1 : 0;

                        return {
                            ...c,
                            lastMessageAt: message.createdAt,
                            lastMessage: {
                                _id: message._id,
                                content: message.content,
                                type: message.type,
                                senderId: message.senderId,
                                createdAt: message.createdAt,
                            },
                            // Khi có tin nhắn mới, reset seenBy về người gửi
                            seenBy: [senderId?._id?.toString() || senderId?.toString()],
                            unreadCounts: {
                                ...c.unreadCounts,
                                [currentUserId]: newUnread
                            }
                        };
                    }).sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));

                    return { messages: newMessages, conversations: updatedConversations };
                });

                if (isChatOpen && !isMyMessage) {
                    get().markChatAsRead(conversationId);
                }
            },

            updateConversationSeen: (conversationId, seenBy) => {
                set((state) => ({
                    conversations: state.conversations.map((c) =>
                        c._id?.toString() === conversationId?.toString()
                            ? { ...c, seenBy: seenBy.map(id => id.toString()) }
                            : c
                    )
                }));
            },

            markChatAsRead: async (conversationId) => {
                const currentUserId = useAuthStore.getState().user?._id?.toString();
                if (!currentUserId) return;
                const conv = get().conversations.find((c) => c._id?.toString() === conversationId?.toString());
                if (conv?.myStatus === "pending") return; // chưa chấp nhận thì không báo đã xem

                set((state) => ({
                    conversations: state.conversations.map((c) => {
                        if (c._id?.toString() !== conversationId?.toString()) return c;

                        const currentSeen = c.seenBy?.map(id => id.toString()) || [];
                        const newSeenBy = currentSeen.includes(currentUserId)
                            ? currentSeen
                            : [...currentSeen, currentUserId];

                        return {
                            ...c,
                            seenBy: newSeenBy,
                            unreadCounts: { ...c.unreadCounts, [currentUserId]: 0 }
                        };
                    })
                }));

                try {
                    await chatService.markAsRead(conversationId);
                } catch (error) {
                    console.error("Lỗi markAsRead:", error);
                }
            },
            acceptConversation: async (conversationId) => {
                try {
                    await chatService.acceptConversation(conversationId);
                    get()._setMyStatus(conversationId, "accepted");
                    return true;
                } catch (error) {
                    console.error("Lỗi accept:", error);
                    return false;
                }
            },

            declineConversation: async (conversationId) => {
                try {
                    await chatService.declineConversation(conversationId);
                    get()._setMyStatus(conversationId, "declined");
                    return true;
                } catch (error) {
                    console.error("Lỗi decline:", error);
                    return false;
                }
            },

            // ==================== RETRY FAILED MESSAGE ====================
            retryMessage: async ({ conversationId, tempId, type, senderUser }) => {
                if (!conversationId || !senderUser) return;
                if (get().sending[conversationId]) return;

                const list = get().messages[conversationId] || [];
                const temp = list.find((m) => m._id === tempId);
                if (!temp) return;

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

            // ==================== SEND IMAGE MESSAGE ====================
            sendImageMessage: async ({ conversationId, type, file, senderUser }) => {
                if (!conversationId || !senderUser || !file) return;
                if (get().sending[conversationId]) return;

                const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                const localUrl = URL.createObjectURL(file);

                const tempMsg = {
                    _id: tempId,
                    conversationId,
                    senderId: senderUser,
                    content: "",
                    imgURL: localUrl,
                    type: "image",
                    createdAt: new Date().toISOString(),
                    _pending: true,
                    _failed: false,
                };

                set((s) => ({
                    messages: {
                        ...s.messages,
                        [conversationId]: [...(s.messages[conversationId] || []), tempMsg],
                    },
                    sending: { ...s.sending, [conversationId]: true },
                }));
                get()._bumpConversation(conversationId, tempMsg, senderUser._id);
                get()._setMyStatus(conversationId, "accepted"); // trả lời -> lên chính thức


                try {
                    const realUrl = await chatService.uploadImage(file);

                    const realMsg = await chatService.sendMessage({
                        conversationId,
                        type,
                        content: "",
                        imgURL: realUrl,
                    });

                    const merged = { ...realMsg, senderId: senderUser, _pending: false, _failed: false };

                    get()._replaceMessage(conversationId, tempId, merged);

                    URL.revokeObjectURL(localUrl);
                } catch (err) {
                    console.error("Gửi ảnh thất bại:", err.response?.data || err);
                    set((s) => ({
                        messages: {
                            ...s.messages,
                            [conversationId]: (s.messages[conversationId] || []).map((m) =>
                                m._id === tempId ? { ...m, _pending: false, _failed: true } : m
                            ),
                        },
                    }));
                    get()._syncConversationLastMessage(conversationId);
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
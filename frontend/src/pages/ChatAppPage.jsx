// src/pages/ChatAppPage.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AppSidebar from "@/components/chat/SideBar";
import ChatList from "@/components/chat/ChatList";
import ChatWindow from "@/components/chat/ChatWindow";
import { useChatStore } from "@/stores/useChatStore";
import { chatService } from "@/services/chatService";
import { useAuthStore } from "@/stores/useAuthStore";
import { getMessageDivider } from "@/utils/date";
import { useSocketStore } from "@/stores/useSocketStore";

const ChatAppPage = () => {
    const [activeId, setActiveId] = useState(null);
    const [uploading, setUploading] = useState(false);
    const uploadingRef = useRef(false); // chặn double-click upload

    const { conversations, messages, cursors, messageLoading, fetchMessages } = useChatStore();
    const currentUser = useAuthStore((state) => state.user);
    const sending = useChatStore((s) => !!s.sending[activeId]);
    const onlineUsers = useSocketStore((state) => state.onlineUsers);


    useEffect(() => {
        useChatStore.getState().fetchConversations();
    }, []);

    useEffect(() => {
        useChatStore.getState().setActiveConversationId(activeId);

        if (activeId) {
            useChatStore.getState().markChatAsRead(activeId);
        }
    }, [activeId]);


    useEffect(() => {
        if (activeId) fetchMessages(activeId);
    }, [activeId, fetchMessages]);


    const handleLoadMore = useCallback(() => {
        if (!activeId) return;
        const nextCursor = cursors?.[activeId] ?? null;
        if (!nextCursor) return;
        fetchMessages(activeId, nextCursor);
    }, [activeId, cursors, fetchMessages]);

    const activeConversation = conversations.find((c) => c._id === activeId);

    const activeChat = useMemo(() => {
        if (!activeConversation) return null;
        let name, avatar;
        let isOnline = false;
        let lastActiveAt = null;

        if (activeConversation.type === "group") {
            name = activeConversation.group?.name || "Nhóm không tên";
            avatar = activeConversation.group?.avatarUrl ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
        } else {
            const otherUser = activeConversation.participants.find((p) => {
                const pId = p._id || p.userId?._id; // 🆕 Fix lại logic lấy ID cho chuẩn
                return pId?.toString() !== currentUser?._id?.toString();
            });

            const otherUserInfo = otherUser?.userId || otherUser;
            name = otherUserInfo?.displayName || "Người dùng ẩn";
            avatar = otherUserInfo?.avatarUrl ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

            // 🆕 Check online cho chat 1-1
            const otherUserId = otherUserInfo?._id?.toString();
            isOnline = onlineUsers.includes(otherUserId);
            lastActiveAt = otherUserInfo?.lastActiveAt;
        }

        return {
            id: activeConversation._id, name, avatar, isOnline, lastActiveAt,
            // 🆕 Ép kiểu an toàn 100% ở đây
            seenBy: (activeConversation.seenBy || []).map(s => s?._id?.toString() || s?.toString()),
            isGroup: activeConversation.type === "group",
            participants: activeConversation.participants
        };
    }, [activeConversation, currentUser, onlineUsers]);
    const chatMessages = useMemo(() => {
        const rawMessages = messages[activeId] || [];
        return rawMessages.map((m, index) => {
            const isMine = m.senderId?._id?.toString() === currentUser?._id?.toString();
            const currentDate = new Date(m.createdAt);
            const prevMessage = rawMessages[index - 1];
            const prevDate = prevMessage ? new Date(prevMessage.createdAt) : null;
            const dividerText = getMessageDivider(currentDate, prevDate);

            return {
                id: m._id,
                mine: isMine,
                text: m.content || "",
                imgURL: m.imgURL || null,
                sender: m.senderId?.displayName || "Ai đó",
                time: currentDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
                dividerText,
                pending: !!m._pending,
                failed: !!m._failed,
            };
        });
    }, [messages, activeId, currentUser]);

    const handleSend = useCallback((text) => {
        if (!activeConversation || !currentUser) return;
        useChatStore.getState().sendMessage({
            conversationId: activeConversation._id,
            type: activeConversation.type,
            content: text,
            senderUser: currentUser,
        });
    }, [activeConversation, currentUser]);

    const handleRetry = useCallback((tempId) => {
        if (!activeConversation || !currentUser) return;
        useChatStore.getState().retryMessage({
            conversationId: activeConversation._id,
            tempId,
            type: activeConversation.type,
            senderUser: currentUser,
        });
    }, [activeConversation, currentUser]);

    const handleUpload = useCallback(async (file) => {
        if (!activeConversation || !currentUser || uploadingRef.current) return;
        uploadingRef.current = true;
        setUploading(true);
        try {
            // Chỉ cần gọi hàm mới trong store
            await useChatStore.getState().sendImageMessage({
                conversationId: activeConversation._id,
                type: activeConversation.type,
                file,
                senderUser: currentUser,
            });
        } catch (err) {
            console.error("Upload ảnh thất bại:", err);
        } finally {
            uploadingRef.current = false;
            setUploading(false);
        }
    }, [activeConversation, currentUser]);

    const hasMore = !!cursors?.[activeId];

    return (
        <SidebarProvider defaultOpen={false} className="h-svh overflow-hidden">
            <AppSidebar />

            <SidebarInset className="flex flex-1 w-full min-w-0 flex-row overflow-hidden bg-background">
                <ChatList
                    activeId={activeId}
                    onSelect={setActiveId}
                    className={activeId ? "hidden md:flex" : "flex"}
                />

                <ChatWindow
                    key={activeId ?? "empty"}
                    chat={activeChat}
                    messages={chatMessages}
                    onBack={() => setActiveId(null)}
                    onSend={handleSend}
                    onRetry={handleRetry}
                    onUpload={handleUpload}
                    sending={sending}
                    uploading={uploading}
                    onLoadMore={handleLoadMore}
                    hasMore={hasMore}
                    loading={messageLoading}
                    className={activeId ? "flex" : "hidden md:flex"}
                />
            </SidebarInset>
        </SidebarProvider>
    );
};

export default ChatAppPage;
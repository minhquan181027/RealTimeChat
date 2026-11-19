// src/pages/ChatAppPage.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AppSidebar from "@/components/chat/SideBar";
import ChatList from "@/components/chat/ChatList";
import ChatWindow from "@/components/chat/ChatWindow";
import { useChatStore } from "@/stores/useChatStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { getMessageDivider } from "@/utils/date";
import { useSocketStore } from "@/stores/useSocketStore";

const ChatAppPage = () => {
    const [activeId, setActiveId] = useState(null);
    const [uploading, setUploading] = useState(false);
    const uploadingRef = useRef(false); // chặn double-click upload
    const [draftUser, setDraftUser] = useState(null); // người đang mở chat nháp
    const [view, setView] = useState("main"); // "main" | "pending"

    const { conversations, messages, cursors, messageLoading, fetchMessages } = useChatStore();
    const currentUser = useAuthStore((state) => state.user);
    const sending = useChatStore((s) => !!s.sending[activeId ?? "draft"]);
    const onlineUsers = useSocketStore((state) => state.onlineUsers);

    useEffect(() => {
        useChatStore.getState().fetchConversations();
    }, []);

    useEffect(() => {
        useChatStore.getState().setActiveConversationId(activeId);

        if (activeId) {
            // markChatAsRead trong store tự bỏ qua nếu cuộc trò chuyện đang pending
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
        // Chat nháp: chưa có conversation trong DB
        if (!activeConversation) {
            if (!draftUser) return null;
            const name = draftUser.displayName;
            return {
                id: null,
                name,
                avatar:
                    draftUser.avatarUrl ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
                isOnline: onlineUsers.includes(draftUser._id.toString()),
                lastActiveAt: null,
                seenBy: [],
                isGroup: false,
                participants: [],
                myStatus: "accepted",
            };
        }

        let name, avatar;
        let isOnline = false;
        let lastActiveAt = null;

        if (activeConversation.type === "group") {
            name = activeConversation.group?.name || "Nhóm không tên";
            avatar = activeConversation.group?.avatarUrl ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
        } else {
            const otherUser = activeConversation.participants.find((p) => {
                const pId = p._id || p.userId?._id;
                return pId?.toString() !== currentUser?._id?.toString();
            });

            const otherUserInfo = otherUser?.userId || otherUser;
            name = otherUserInfo?.displayName || "Người dùng ẩn";
            avatar = otherUserInfo?.avatarUrl ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

            const otherUserId = otherUserInfo?._id?.toString();
            isOnline = onlineUsers.includes(otherUserId);
            lastActiveAt = otherUserInfo?.lastActiveAt;
        }

        return {
            id: activeConversation._id, name, avatar, isOnline, lastActiveAt,
            seenBy: (activeConversation.seenBy || []).map((s) => s?._id?.toString() || s?.toString()),
            isGroup: activeConversation.type === "group",
            participants: activeConversation.participants,
            myStatus: activeConversation.myStatus || "accepted",
        };
    }, [activeConversation, draftUser, currentUser, onlineUsers]);

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

    const handleSelect = useCallback((id) => {
        setDraftUser(null);
        setActiveId(id);
    }, []);

    const handlePickUser = useCallback((user) => {
        const existing = conversations.find(
            (c) =>
                c.type === "direct" &&
                c.participants.some((p) => p._id?.toString() === user._id.toString())
        );
        if (existing) {
            setDraftUser(null);
            setView(existing.myStatus === "pending" ? "pending" : "main");
            setActiveId(existing._id);
        } else {
            setDraftUser(user);
            setView("main");
            setActiveId(null);
        }
    }, [conversations]);

    const handleBack = useCallback(() => {
        setActiveId(null);
        setDraftUser(null);
    }, []);

    const handleChangeView = useCallback((v) => {
        setView(v);
        setActiveId(null);
        setDraftUser(null);
    }, []);

    const handleOpenConversation = useCallback((id) => {
        setDraftUser(null);
        setView("main");
        setActiveId(id);
    }, []);

    const handleAccept = useCallback(async () => {
        if (!activeId) return;
        const ok = await useChatStore.getState().acceptConversation(activeId);
        if (ok) {
            setView("main");
            useChatStore.getState().markChatAsRead(activeId);
        }
    }, [activeId]);

    const handleDecline = useCallback(async () => {
        if (!activeId) return;
        const ok = await useChatStore.getState().declineConversation(activeId);
        if (ok) handleBack();
    }, [activeId, handleBack]);

    const handleSend = useCallback(async (text) => {
        if (!currentUser) return;

        if (activeConversation) {
            // Trả lời trong cuộc trò chuyện chờ -> lên chính thức
            if (activeConversation.myStatus === "pending") setView("main");
            useChatStore.getState().sendMessage({
                conversationId: activeConversation._id,
                type: activeConversation.type,
                content: text,
                senderUser: currentUser,
            });
            return;
        }

        // Chat nháp: tin đầu tiên sẽ tạo cuộc trò chuyện
        if (draftUser) {
            const convId = await useChatStore.getState().startDirectChat({
                recipientId: draftUser._id,
                content: text,
            });
            if (convId) {
                setDraftUser(null);
                setActiveId(convId);
            }
        }
    }, [activeConversation, draftUser, currentUser]);

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
        if (activeConversation.myStatus === "pending") setView("main");
        uploadingRef.current = true;
        setUploading(true);
        try {
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
    const hasOpenChat = !!activeId || !!draftUser;

    return (
        <SidebarProvider defaultOpen={false} className="h-svh overflow-hidden">
            <AppSidebar view={view} onChangeView={handleChangeView} />

            <SidebarInset className="flex min-w-0 w-full flex-1 flex-row overflow-hidden bg-background">
                <ChatList
                    activeId={activeId}
                    onSelect={handleSelect}
                    onPickUser={handlePickUser}
                    view={view}
                    onChangeView={handleChangeView}
                    className={hasOpenChat ? "hidden md:flex" : "flex"}
                />

                <ChatWindow
                    key={activeId ?? (draftUser ? `draft-${draftUser._id}` : "empty")}
                    chat={activeChat}
                    messages={chatMessages}
                    onBack={handleBack}
                    onSend={handleSend}
                    onRetry={handleRetry}
                    onUpload={handleUpload}
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                    sending={sending}
                    uploading={uploading}
                    onLoadMore={handleLoadMore}
                    hasMore={hasMore}
                    loading={messageLoading}
                    className={hasOpenChat ? "flex" : "hidden md:flex"}
                />
            </SidebarInset>
        </SidebarProvider>
    );
};

export default ChatAppPage;
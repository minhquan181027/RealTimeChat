// src/pages/ChatAppPage.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AppSidebar from "@/components/chat/SideBar";
import ChatList from "@/components/chat/ChatList";
import ChatWindow from "@/components/chat/ChatWindow";
import ContactsPage from "@/components/chat/ContactsPage";
import CallModal from "@/components/chat/CallModal";
import { useChatStore } from "@/stores/useChatStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSocketStore } from "@/stores/useSocketStore";
import { useFriendStore } from "@/stores/useFriendStore";
import { getMessageDivider } from "@/utils/date";
import { toast } from "sonner";
import ProfileDialog from "@/components/chat/ProfileDialog";
import { useCallStore } from "@/stores/useCallStore";

const ChatAppPage = () => {
    const [activeId, setActiveId] = useState(null);
    const [uploading, setUploading] = useState(false);
    const uploadingRef = useRef(false); // chặn double-click upload
    const [draftUser, setDraftUser] = useState(null); // người đang mở chat nháp
    const [view, setView] = useState("main"); // "main" | "pending" | "contacts"

    const { conversations, messages, cursors, messageLoading, fetchMessages } = useChatStore();
    const currentUser = useAuthStore((state) => state.user);
    const sending = useChatStore((s) => !!s.sending[activeId ?? "draft"]);
    const onlineUsers = useSocketStore((state) => state.onlineUsers);

    const friends = useFriendStore((s) => s.friends);
    const sentRequests = useFriendStore((s) => s.sent);
    const receivedRequests = useFriendStore((s) => s.received);
    const friendsLoaded = useFriendStore((s) => s.friendsLoaded);

    const [profileUser, setProfileUser] = useState(null);
    const socket = useSocketStore((s) => s.socket);
    const startOutgoingCall = useCallStore((s) => s.startOutgoingCall);

    useEffect(() => {
        useChatStore.getState().fetchConversations();
    }, []);

    useEffect(() => {
        useFriendStore.getState().fetchFriends();
        useFriendStore.getState().fetchRequests();
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
                otherUserId: draftUser._id.toString(),
            };
        }

        let name, avatar;
        let isOnline = false;
        let lastActiveAt = null;
        let otherUserId = null;

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

            otherUserId = otherUserInfo?._id?.toString();
            isOnline = onlineUsers.includes(otherUserId);
            lastActiveAt = otherUserInfo?.lastActiveAt;
        }

        return {
            id: activeConversation._id, name, avatar, isOnline, lastActiveAt,
            seenBy: (activeConversation.seenBy || []).map((s) => s?._id?.toString() || s?.toString()),
            isGroup: activeConversation.type === "group",
            participants: activeConversation.participants,
            myStatus: activeConversation.myStatus || "accepted",
            otherUserId,
        };
    }, [activeConversation, draftUser, currentUser, onlineUsers]);

    // Quan hệ bạn bè với người đang chat (chỉ áp dụng chat 1-1)
    const friendInfo = useMemo(() => {
        const id = activeChat?.otherUserId;
        if (!id || activeChat.isGroup || !friendsLoaded) return { status: null };

        if (friends.some((f) => f._id?.toString() === id)) return { status: "friend" };

        const sent = sentRequests.find((r) => r.to?._id?.toString() === id);
        if (sent) return { status: "sent", requestId: sent._id };

        const received = receivedRequests.find((r) => r.from?._id?.toString() === id);
        if (received) return { status: "received", requestId: received._id };

        return { status: "none" };
    }, [activeChat, friends, sentRequests, receivedRequests, friendsLoaded]);

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
                senderId: m.senderId?._id?.toString(),
                type: m.type,
                senderAvatar:
                    m.senderId?.avatarUrl ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(m.senderId?.displayName || "U")}&background=random`,
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


    const handleAvatarClick = useCallback((m) => {
        if (!m.senderId) return;
        setProfileUser({ _id: m.senderId, displayName: m.sender, avatarUrl: m.senderAvatar });
    }, []);

    const handleMessageUser = useCallback((user) => {
        setProfileUser(null);
        handlePickUser(user); // mở chat cũ hoặc chat nháp
    }, [handlePickUser]);

    const handleCallUser = useCallback((user) => {
        // Cuộc gọi dùng id cuộc trò chuyện 1-1 làm tên phòng
        const conv = conversations.find(
            (c) =>
                c.type === "direct" &&
                c.participants.some((p) => p._id?.toString() === user._id.toString())
        );
        if (!conv) {
            toast.error("Hãy nhắn tin cho người này trước khi gọi");
            return;
        }
        if (!socket || !currentUser) return;

        socket.emit("call_user", {
            targetUserIds: [user._id],
            roomName: conv._id,
            caller: currentUser,
        });
        startOutgoingCall({
            roomName: conv._id,
            targetUserIds: [user._id],
            targetName: user.displayName,
            targetAvatar: user.avatarUrl,
        });
        setProfileUser(null);
    }, [conversations, socket, currentUser, startOutgoingCall]);

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

    const handleSendFriend = useCallback(() => {
        if (activeChat?.otherUserId) {
            useFriendStore.getState().sendRequest(activeChat.otherUserId);
        }
    }, [activeChat]);

    const handleAcceptFriend = useCallback(() => {
        if (friendInfo.requestId) {
            useFriendStore.getState().acceptRequest(friendInfo.requestId);
        }
    }, [friendInfo]);

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
            <CallModal />
            <ProfileDialog
                user={profileUser}
                onClose={() => setProfileUser(null)}
                onMessage={handleMessageUser}
                onCall={handleCallUser}
            />

            <AppSidebar view={view} onChangeView={handleChangeView} />

            <SidebarInset className="flex min-w-0 w-full flex-1 flex-row overflow-hidden bg-background">
                {view === "contacts" ? (
                    <ContactsPage
                        onOpenChat={handlePickUser}
                        onBack={() => handleChangeView("main")}
                    />
                ) : (
                    <>
                        <ChatList
                            activeId={activeId}
                            onSelect={handleSelect}
                            onPickUser={handlePickUser}
                            onOpenConversation={handleOpenConversation}
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
                            onAvatarClick={handleAvatarClick}
                            friendStatus={friendInfo.status}
                            onSendFriend={handleSendFriend}
                            onAcceptFriend={handleAcceptFriend}
                            sending={sending}
                            uploading={uploading}
                            onLoadMore={handleLoadMore}
                            hasMore={hasMore}
                            loading={messageLoading}
                            className={hasOpenChat ? "flex" : "hidden md:flex"}
                        />
                    </>
                )}
            </SidebarInset>
        </SidebarProvider>
    );
};

export default ChatAppPage;
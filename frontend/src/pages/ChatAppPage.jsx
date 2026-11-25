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
import { useTranslation } from "react-i18next";

const ChatAppPage = () => {
    const [activeId, setActiveId] = useState(null);
    const [uploading, setUploading] = useState(false);
    const uploadingRef = useRef(false); // chặn double-click upload
    const [draftUser, setDraftUser] = useState(null); // người đang mở chat nháp
    const [view, setView] = useState("main"); // "main" | "pending" | "contacts"
    const [leavePromptRequest, setLeavePromptRequest] = useState(0);

    const { conversations, messages, cursors, messageLoading, fetchMessages } = useChatStore();
    const currentUser = useAuthStore((state) => state.user);
    const sending = useChatStore((s) => !!s.sending[activeId ?? "draft"]);
    const onlineUsers = useSocketStore((state) => state.onlineUsers);

    const friends = useFriendStore((s) => s.friends);
    const sentRequests = useFriendStore((s) => s.sent);
    const receivedRequests = useFriendStore((s) => s.received);
    const friendsLoaded = useFriendStore((s) => s.friendsLoaded);
    const blockStatuses = useFriendStore((s) => s.blockStatuses);
    const fetchBlockStatus = useFriendStore((s) => s.fetchBlockStatus);
    const blockUser = useFriendStore((s) => s.blockUser);
    const unblockUser = useFriendStore((s) => s.unblockUser);

    const [profileUser, setProfileUser] = useState(null);
    const socket = useSocketStore((s) => s.socket);
    const startOutgoingCall = useCallStore((s) => s.startOutgoingCall);

    const { t, i18n } = useTranslation();

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

    useEffect(() => {
        if (activeId && !conversations.some((c) => c._id === activeId)) setActiveId(null);
    }, [conversations, activeId]);

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
                otherUser: draftUser,
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
        let otherUser = null;

        if (activeConversation.type === "group") {
            name = activeConversation.group?.name || t("chatList.unnamedGroup");
            avatar = activeConversation.group?.avatarUrl ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
        } else {
            const otherParticipant = activeConversation.participants.find((p) => {
                const pId = p._id || p.userId?._id;
                return pId?.toString() !== currentUser?._id?.toString();
            });

            const directUser = otherParticipant?.userId || otherParticipant;
            name = directUser?.displayName || t("chatList.hiddenUser");
            avatar = directUser?.avatarUrl ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

            otherUserId = directUser?._id?.toString();
            otherUser = directUser;
            isOnline = onlineUsers.includes(otherUserId);
            lastActiveAt = directUser?.lastActiveAt;
        }

        return {
            id: activeConversation._id, name, avatar, isOnline, lastActiveAt,
            otherUser,
            seenBy: (activeConversation.seenBy || []).map((s) => s?._id?.toString() || s?.toString()),
            isGroup: activeConversation.type === "group",
            group: activeConversation.group,
            participants: activeConversation.participants,
            myStatus: activeConversation.myStatus || "accepted",
            otherUserId,
        };
    }, [activeConversation, draftUser, currentUser, onlineUsers]);

    useEffect(() => {
        if (activeChat?.otherUserId) {
            fetchBlockStatus(activeChat.otherUserId);
        }
    }, [activeChat?.otherUserId, fetchBlockStatus]);

    const directBlockStatus = activeChat?.otherUserId
        ? blockStatuses[activeChat.otherUserId]
        : undefined;

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
                translation:
                    !isMine && currentUser?.autoTranslate !== false
                        ? m.translations?.[currentUser?.language || "vi"] || null
                        : null,
                imgURL: m.imgURL || null,
                gifProvider: m.gifProvider || null,
                gifId: m.gifId || null,
                sender: m.senderId?.displayName || t("chatWindow.someone"),
                meta: m.meta,
                senderId: m.senderId?._id?.toString(),
                type: m.type,
                senderAvatar:
                    m.senderId?.avatarUrl ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(m.senderId?.displayName || "U")}&background=random`,
                reactions: m.reactions || {},
                recalledAt: m.recalledAt || null,
                time: currentDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
                dividerText,
                pending: !!m._pending,
                failed: !!m._failed,
            };
        });
    }, [messages, activeId, currentUser, t]);

    const handleSelect = useCallback((id) => {
        setDraftUser(null);
        setLeavePromptRequest(0);
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
            setLeavePromptRequest(0);
            setView(existing.myStatus === "pending" ? "pending" : "main");
            setActiveId(existing._id);
        } else {
            setLeavePromptRequest(0);
            setDraftUser(user);
            setView("main");
            setActiveId(null);
        }
    }, [conversations]);

    const handleBack = useCallback(() => {
        setLeavePromptRequest(0);
        setActiveId(null);
        setDraftUser(null);
    }, []);

    const handleChangeView = useCallback((v) => {
        setLeavePromptRequest(0);
        setView(v);
        setActiveId(null);
        setDraftUser(null);
    }, []);

    const handleOpenConversation = useCallback((id) => {
        setDraftUser(null);
        setLeavePromptRequest(0);
        setView("main");
        setActiveId(id);
    }, []);


    const handleAvatarClick = useCallback((m) => {
        if (!m.senderId) return;
        setProfileUser({ _id: m.senderId, displayName: m.sender, avatarUrl: m.senderAvatar });
    }, []);

    const handleMemberClick = useCallback((p) => {
        if (!p?._id) return;
        setProfileUser({ _id: p._id.toString(), displayName: p.displayName, avatarUrl: p.avatarUrl });
    }, []);

    const handleMessageUser = useCallback((user) => {
        setProfileUser(null);
        handlePickUser(user); // mở chat cũ hoặc chat nháp
    }, [handlePickUser]);

    const handleCallUser = useCallback(async (user) => {
        // Cuộc gọi dùng id cuộc trò chuyện 1-1 làm tên phòng
        const conv = conversations.find(
            (c) =>
                c.type === "direct" &&
                c.participants.some((p) => p._id?.toString() === user._id.toString())
        );
        if (!conv) {
            toast.error(t("toast.callFirst"))
            return;
        }
        if (!socket || !currentUser) return;
        const blockStatus = await useFriendStore.getState().fetchBlockStatus(user._id.toString());
        if (!blockStatus) return;
        if (blockStatus.blockedByMe || blockStatus.blockedMe) {
            toast.error(blockStatus.blockedByMe ? t("chatWindow.blockedByMe") : t("chatWindow.blockedMe"));
            return;
        }

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
    }, [conversations, socket, currentUser, startOutgoingCall, t]);

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

    const handleLeaveGroup = useCallback(async (newAdminId) => {
        if (!activeId) return false;
        const ok = await useChatStore.getState().leaveGroup(activeId, newAdminId);
        if (ok) handleBack();
        return ok;
    }, [activeId, handleBack]);

    const handleRequestLeaveGroup = useCallback((conversationId) => {
        setDraftUser(null);
        setView("main");
        setActiveId(conversationId);
        setLeavePromptRequest((request) => request + 1);
    }, []);

    const handleRemoveGroupMember = useCallback(async (memberId) => {
        if (!activeId) return false;
        return useChatStore.getState().removeGroupMember(activeId, memberId);
    }, [activeId]);

    const handleSetGroupDeputyAdmin = useCallback(async (memberId) => {
        if (!activeId) return false;
        return useChatStore.getState().setGroupDeputyAdmin(activeId, memberId);
    }, [activeId]);

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

    const handleTyping = useCallback((isTyping) => {
        if (!activeConversation || !socket) return;
        socket.emit("typing", { conversationId: activeConversation._id, isTyping });
    }, [activeConversation, socket]);

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

    const handleSendGif = useCallback(async (gif) => {
        if (!currentUser || gif?.provider !== "giphy" || !gif.id) return;

        if (activeConversation) {
            if (activeConversation.myStatus === "pending") setView("main");
            useChatStore.getState().sendMessage({
                conversationId: activeConversation._id,
                type: activeConversation.type,
                content: "",
                gifProvider: gif.provider,
                gifId: gif.id,
                senderUser: currentUser,
            });
            return;
        }

        if (draftUser) {
            const convId = await useChatStore.getState().startDirectChat({
                recipientId: draftUser._id,
                content: "",
                gifProvider: gif.provider,
                gifId: gif.id,
            });
            if (convId) {
                setDraftUser(null);
                setActiveId(convId);
            }
        }
    }, [activeConversation, currentUser, draftUser]);

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

            <AppSidebar view={view} onChangeView={handleChangeView} mobileHidden={hasOpenChat} />

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
                            onRequestLeaveGroup={handleRequestLeaveGroup}
                            onBlockUser={blockUser}
                            onUnblockUser={unblockUser}
                            view={view}
                            onChangeView={handleChangeView}
                            className={hasOpenChat ? "hidden md:flex" : "flex"}
                        />

                        <ChatWindow
                            key={activeId ?? (draftUser ? `draft-${draftUser._id}` : "empty")}
                            chat={activeChat}
                            messages={chatMessages}
                            onBack={handleBack}
                            onTyping={handleTyping}
                            onSend={handleSend}
                            onSendGif={handleSendGif}
                            onRetry={handleRetry}
                            onUpload={handleUpload}
                            onAccept={handleAccept}
                            onDecline={handleDecline}
                            onLeaveGroup={handleLeaveGroup}
                            leavePromptRequest={leavePromptRequest}
                            onClearLeavePromptRequest={() => setLeavePromptRequest(0)}
                            onRemoveMember={handleRemoveGroupMember}
                            onSetDeputyAdmin={handleSetGroupDeputyAdmin}
                            directBlockStatus={directBlockStatus}
                            onAvatarClick={handleAvatarClick}
                            onMemberClick={handleMemberClick}
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
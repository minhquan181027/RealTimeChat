// src/components/chat/ChatList.jsx
import { useState, useEffect } from "react";
import { BellOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { useChatStore } from "@/stores/useChatStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSocketStore } from "@/stores/useSocketStore";
import { formatTime } from "@/utils/date";
import { systemText } from "@/utils/systemMessage";
import ChatListHeader from "./ChatListHeader";
import StatusBadge from "./StatusBadge";

const ChatList = ({ activeId, onSelect, onPickUser, onOpenConversation, view = "main", onChangeView, className }) => {
    const { t } = useTranslation();
    const { conversations, typing } = useChatStore();
    const currentUser = useAuthStore((state) => state.user);
    const onlineUsers = useSocketStore((state) => state.onlineUsers);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 60000);
        return () => clearInterval(interval);
    }, []);

    if (!conversations || !Array.isArray(conversations)) {
        return (
            <div className={cn("h-full w-full flex-col border-r bg-background md:w-[350px]", className)}>
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    {t("chatList.none")}
                </div>
            </div>
        );
    }

    const pendingCount = conversations.filter((c) => c.myStatus === "pending").length;
    const visible = conversations.filter((c) =>
        view === "pending" ? c.myStatus === "pending" : c.myStatus !== "pending"
    );

    const getConversationInfo = (conversation) => {
        let name;
        let avatar;
        let otherUserId = null;

        if (conversation.type === "group") {
            name = conversation.group?.name || t("chatList.unnamedGroup");
            avatar = conversation.group?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
        } else {
            const otherUser = conversation.participants.find((p) => {
                const pId = p._id || p.userId?._id;
                return pId?.toString() !== currentUser?._id?.toString();
            });

            const otherUserInfo = otherUser?.userId || otherUser;
            name = otherUserInfo?.displayName || t("chatList.hiddenUser");
            avatar = otherUserInfo?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
            otherUserId = otherUserInfo?._id?.toString();
        }

        let lastMessageText;
        if (conversation.lastMessage) {
            const { type, content, senderId, meta } = conversation.lastMessage;

            if (type === "system") {
                lastMessageText = systemText(t, meta, content);
            } else {
                if (type === "image") lastMessageText = t("chatList.image");
                else if (type === "gif") lastMessageText = t("chatList.gif");
                else if (type === "video") lastMessageText = t("chatList.video");
                else lastMessageText = content || t("chatList.message");

                const senderIdStr = senderId?._id?.toString() || senderId?.toString() || senderId;
                const isMe = senderIdStr === currentUser?._id?.toString();
                const senderName = senderId?.userId?.displayName || senderId?.displayName;

                if (isMe) lastMessageText = `${t("chatList.you")}: ${lastMessageText}`;
                else if (conversation.type === "group" && senderName) {
                    lastMessageText = `${senderName}: ${lastMessageText}`;
                }
            }
        } else if (conversation.type === "group") {
            lastMessageText = t("chatList.newGroup");
        }

        const unreadCount =
            conversation.unreadCounts?.[currentUser?._id] ?? conversation.unreadCount ?? 0;

        return {
            name,
            avatar,
            lastMessageText,
            hasUnread: unreadCount > 0,
            unreadCount,
            isMuted: conversation.isMuted || false,
            isOnline: conversation.type === "direct" && onlineUsers.includes(otherUserId),
            time: formatTime(conversation.lastMessageAt || conversation.updatedAt, now),
            isTyping: Object.keys(typing[conversation._id] || {}).length > 0,
        };
    };

    return (
        <div className={cn("flex h-full w-full shrink-0 flex-col border-r bg-background md:w-[400px]", className)}>
            <ChatListHeader
                onPickUser={onPickUser}
                onOpenConversation={onOpenConversation}
                title={view === "pending" ? t("chatList.pendingTitle") : t("chatList.title")}
            />



            <div className="min-h-0 flex-1 overflow-y-auto">
                {visible.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        {view === "pending" ? t("chatList.emptyPending") : t("chatList.empty")}
                    </div>
                ) : (
                    visible.map((c) => {
                        const { name, avatar, lastMessageText, hasUnread, unreadCount, isMuted, isOnline, time, isTyping } =
                            getConversationInfo(c);

                        return (
                            <button
                                key={c._id}
                                onClick={() => onSelect(c._id)}
                                className={cn(
                                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                                    activeId === c._id && "bg-blue-50 md:bg-primary/10"
                                )}
                            >
                                <div className="relative size-12 shrink-0">
                                    <img src={avatar} alt={name} className="size-full rounded-full object-cover" />
                                    {c.type === "direct" && isOnline && (
                                        <StatusBadge status="online" className="absolute bottom-0 right-0" />
                                    )}
                                </div>

                                <div className="min-w-0 flex-1 border-b pb-3 md:border-none md:pb-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <h3 className={cn("truncate text-[15px]", hasUnread ? "font-semibold" : "font-medium")}>
                                            {name}
                                        </h3>
                                        <span
                                            className={cn(
                                                "flex shrink-0 items-center gap-1 text-xs",
                                                hasUnread ? "font-medium text-primary" : "text-muted-foreground"
                                            )}
                                        >
                                            {isMuted && <BellOff className="size-3.5" />}
                                            {time}
                                        </span>
                                    </div>
                                    <div className="mt-0.5 flex items-center justify-between gap-2">
                                        <p
                                            className={cn(
                                                "truncate text-sm",
                                                hasUnread ? "font-medium text-foreground" : "text-muted-foreground"
                                            )}
                                        >
                                            {isTyping ? (
                                                <span className="italic text-primary">{t("typing.one")}</span>
                                            ) : (
                                                lastMessageText
                                            )}
                                        </p>

                                        {hasUnread && (
                                            <span
                                                className={cn(
                                                    "flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold text-white",
                                                    isMuted ? "bg-muted-foreground" : "bg-red-500"
                                                )}
                                            >
                                                {unreadCount > 99 ? "99+" : unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ChatList;
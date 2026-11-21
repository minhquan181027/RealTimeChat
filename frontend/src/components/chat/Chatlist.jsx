import { useState, useEffect } from "react";
import { BellOff, MessageSquare, Users, User } from "lucide-react";
import { cn } from "cn";
import { useChatStore } from "@/stores/useChatStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSocketStore } from "@/stores/useSocketStore";
import { formatTime } from "@/utils/date";
import ChatListHeader from "./ChatListHeader";
import StatusBadge from "./StatusBadge";

const NAV_TOP = [
    { key: "main", icon: MessageSquare, label: "Tin nhắn" },
    { key: "contacts", icon: Users, label: "Danh bạ" },
    { key: "profile", icon: User, label: "Cá nhân" },
];

const ChatList = ({ activeId, onSelect, onPickUser, onOpenConversation, view = "main", onChangeView, className }) => {
    const { conversations } = useChatStore();
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
                    Không có cuộc trò chuyện nào
                </div>
            </div>
        );
    }

    // Tin chờ: myStatus === "pending". Cuộc trò chuyện cũ không có myStatus -> coi như chính thức
    const pendingCount = conversations.filter((c) => c.myStatus === "pending").length;
    const visible = conversations.filter((c) =>
        view === "pending" ? c.myStatus === "pending" : c.myStatus !== "pending"
    );

    const getConversationInfo = (conversation) => {
        let name;
        let avatar;
        let otherUserId = null;

        if (conversation.type === "group") {
            name = conversation.group?.name || "Nhóm không tên";
            avatar = conversation.group?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
        } else {
            const otherUser = conversation.participants.find((p) => {
                const pId = p._id || p.userId?._id;
                return pId?.toString() !== currentUser?._id?.toString();
            });

            const otherUserInfo = otherUser?.userId || otherUser;
            name = otherUserInfo?.displayName || "Người dùng ẩn";
            avatar = otherUserInfo?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
            otherUserId = otherUserInfo?._id?.toString();
        }

        let lastMessageText;
        if (conversation.lastMessage) {
            const { type, content, senderId } = conversation.lastMessage;

            if (type === "system") {
                lastMessageText = content;
            } else {
                if (type === "image") lastMessageText = "[Hình ảnh]";
                else if (type === "video") lastMessageText = "[Video]";
                else lastMessageText = content || "[Tin nhắn]";

                const senderIdStr = senderId?._id?.toString() || senderId?.toString() || senderId;
                const isMe = senderIdStr === currentUser?._id?.toString();
                const senderName = senderId?.userId?.displayName || senderId?.displayName;

                if (isMe) lastMessageText = `Bạn: ${lastMessageText}`;
                else if (conversation.type === "group" && senderName) {
                    lastMessageText = `${senderName}: ${lastMessageText}`;
                }
            }
        } else if (conversation.type === "group") {
            lastMessageText = "Nhóm mới được tạo";
        }

        const unreadCount =
            conversation.unreadCounts?.[currentUser?._id] ??
            conversation.unreadCount ??
            0;

        return {
            name,
            avatar,
            lastMessageText,
            hasUnread: unreadCount > 0,
            unreadCount,
            isMuted: conversation.isMuted || false,
            isOnline: conversation.type === "direct" && onlineUsers.includes(otherUserId),
            time: formatTime(conversation.lastMessageAt || conversation.updatedAt, now),
        };
    };

    return (
        <div className={cn("flex h-full w-full shrink-0 flex-col border-r bg-background md:w-[400px]", className)}>
            <ChatListHeader
                onPickUser={onPickUser}
                onOpenConversation={onOpenConversation}
                title={view === "pending" ? "Tin nhắn chờ" : "Đoạn chat"}
            />

            {/* Chuyển view trên mobile (sidebar chỉ có trên PC) */}
            <div className="px-4 pb-2 md:hidden">
                {view === "pending" ? (
                    <button onClick={() => onChangeView?.("main")} className="text-sm text-primary">
                        ← Quay lại đoạn chat
                    </button>
                ) : (
                    pendingCount > 0 && (
                        <button onClick={() => onChangeView?.("pending")} className="text-sm text-primary">
                            Tin nhắn đang chờ ({pendingCount})
                        </button>
                    )
                )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
                {visible.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        {view === "pending" ? "Không có tin nhắn đang chờ" : "Chưa có cuộc trò chuyện nào"}
                    </div>
                ) : (
                    visible.map((c) => {
                        const { name, avatar, lastMessageText, hasUnread, unreadCount, isMuted, isOnline, time } =
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
                                    <img
                                        src={avatar}
                                        alt={name}
                                        className="size-full rounded-full object-cover"
                                    />
                                    {c.type === "direct" && isOnline && (
                                        <StatusBadge
                                            status="online"
                                            className="absolute bottom-0 right-0"
                                        />
                                    )}
                                </div>

                                <div className="min-w-0 flex-1 border-b pb-3 md:border-none md:pb-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <h3
                                            className={cn(
                                                "truncate text-[15px]",
                                                hasUnread ? "font-semibold" : "font-medium"
                                            )}
                                        >
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
                                                hasUnread
                                                    ? "font-medium text-foreground"
                                                    : "text-muted-foreground"
                                            )}
                                        >
                                            {lastMessageText}
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

            <nav className="flex h-16 shrink-0 items-center justify-around border-t bg-background md:hidden">
                {NAV_TOP.map(({ key, icon: Icon, label }) => (
                    <button
                        key={key}
                        onClick={() => key === "contacts" && onChangeView?.("contacts")}
                        className={cn(
                            "flex flex-col items-center gap-0.5 text-[10px]",
                            key === "main" ? "text-primary" : "text-muted-foreground"
                        )}
                    >
                        <Icon className="size-6" />
                        <span>{label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
};

export default ChatList;
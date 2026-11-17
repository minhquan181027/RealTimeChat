// src/components/chat/ChatList.jsx
import { BellOff } from "lucide-react";
import { cn } from "cn";
import { NAV_TOP } from "@/components/data/Chatdata";
import { useChatStore } from "@/stores/useChatStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSocketStore } from "@/stores/useSocketStore";
import ChatListHeader from "./ChatListHeader";
import StatusBadge from "./StatusBadge";

const ChatList = ({ activeId, onSelect, className }) => {
    const { conversations } = useChatStore();
    const currentUser = useAuthStore((state) => state.user);
    const onlineUsers = useSocketStore((state) => state.onlineUsers);

    if (!conversations || !Array.isArray(conversations)) {
        return (
            <div className={cn("h-full w-full flex-col border-r bg-background md:w-[350px]", className)}>
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Không có cuộc trò chuyện nào
                </div>
            </div>
        );
    }

    const formatTime = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

        if (diffInHours < 1) return `${Math.floor((now - date) / (1000 * 60))} phút`;
        if (diffInHours < 24 && date.getDate() === now.getDate()) return `${diffInHours} giờ`;

        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) return "Hôm qua";

        const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
        if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) return days[date.getDay()];

        return `${date.getDate()}/${date.getMonth() + 1}`;
    };

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

            // Xử lý hiển thị text dựa vào type hoặc content
            if (type === "image") {
                lastMessageText = "[Hình ảnh]";
            } else if (type === "video") {
                lastMessageText = "[Video]";
            } else {
                lastMessageText = content || "[Tin nhắn]"; // Fallback nếu rỗng
            }

            // 🆕 SỬA LỖI isMe: Xử lý được cả trường hợp senderId là Object, String hay ObjectId
            const senderIdStr = senderId?._id?.toString() || senderId?.toString() || senderId;
            const currentIdStr = currentUser?._id?.toString();
            const isMe = senderIdStr === currentIdStr;

            // Tên người gửi (nếu là group và không phải mình)
            const senderName = senderId?.userId?.displayName || senderId?.displayName;

            if (conversation.type === "group") {
                if (isMe) lastMessageText = `Bạn: ${lastMessageText}`;
                else if (senderName) lastMessageText = `${senderName}: ${lastMessageText}`;
            } else {
                if (isMe) lastMessageText = `Bạn: ${lastMessageText}`;
            }
        }

        const unreadCount =
            conversation.unreadCounts?.[currentUser?._id] ??
            conversation.unreadCount ??
            0;

        const hasUnread = unreadCount > 0;
        const isMuted = conversation.isMuted || false;

        // 👇 TẠM THỜI FAKE — thay bằng presence store sau
        const isOnline = conversation.type === "direct" && onlineUsers.includes(otherUserId);

        return {
            name,
            avatar,
            lastMessageText,
            hasUnread,
            unreadCount,
            isMuted,
            isOnline,
            time: formatTime(conversation.lastMessageAt || conversation.updatedAt),
        };
    };

    return (
        <div className={cn("flex h-full w-full shrink-0 flex-col border-r bg-background md:w-[400px]", className)}>

            <ChatListHeader />

            <div className="min-h-0 flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        Chưa có cuộc trò chuyện nào
                    </div>
                ) : (
                    conversations.map((c) => {
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
                                {/* 👇 Avatar + StatusBadge */}
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
                                                hasUnread ? "text-primary font-medium" : "text-muted-foreground"
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
                {NAV_TOP.map(({ icon: Icon, label, active }) => (
                    <button
                        key={label}
                        className={cn(
                            "flex flex-col items-center gap-0.5 text-[10px]",
                            active ? "text-primary" : "text-muted-foreground"
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
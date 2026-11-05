// src/components/chat/ChatList.jsx
import { Search, Palette, Plus, UserPlus, Users, BellOff } from "lucide-react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { NAV_TOP, themes } from "@/components/data/Chatdata";
import { useChatStore } from "@/stores/useChatStore";
import { useAuthStore } from "@/stores/useAuthStore";

const ChatList = ({ activeId, onSelect, className }) => {
    // Lấy dữ liệu
    const { conversations } = useChatStore();
    const currentUser = useAuthStore((state) => state.user);


    // Nếu chưa có dữ liệu hoặc không phải mảng, trả về null
    if (!conversations || !Array.isArray(conversations)) {
        return (
            <div className={cn("h-full w-full flex-col border-r bg-background md:w-[350px]", className)}>
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Không có cuộc trò chuyện nào
                </div>
            </div>
        );
    }

    const handleThemeChange = (themeName) => {
        document.documentElement.setAttribute("data-theme", themeName.toLowerCase());
    };

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

        if (conversation.type === "group") {
            name = conversation.group?.name || "Nhóm không tên";
            avatar = conversation.group?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
        } else {
            // Xử lý fallback: Hỗ trợ cả trường hợp p._id (đã format) và p.userId._id (chưa format)
            const otherUser = conversation.participants.find((p) => {
                const pId = p._id || p.userId?._id;
                return pId?.toString() !== currentUser?._id?.toString();
            });

            const otherUserId = otherUser?._id || otherUser?.userId?._id;
            const otherUserInfo = otherUser?.userId || otherUser; // Fallback nếu backend chưa populate

            name = otherUserInfo?.displayName || "Người dùng ẩn";
            avatar = otherUserInfo?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
        }

        let lastMessageText = "Chưa có tin nhắn";
        if (conversation.lastMessage) {
            const { type, content, senderId } = conversation.lastMessage;
            const senderInfo = senderId?.userId || senderId; // Fallback

            if (type === "image") lastMessageText = "[Hình ảnh]";
            else if (type === "video") lastMessageText = "[Video]";
            else if (type === "call") lastMessageText = "[Cuộc gọi]";
            else lastMessageText = content || "";

            const isMe = senderInfo?._id?.toString() === currentUser?._id?.toString();

            if (conversation.type === "group") {
                if (isMe) lastMessageText = `Bạn: ${lastMessageText}`;
                else if (senderInfo?.displayName) lastMessageText = `${senderInfo.displayName}: ${lastMessageText}`;
            } else {
                if (isMe) lastMessageText = `Bạn: ${lastMessageText}`;
            }
        }

        const hasUnread = conversation.unreadCount > 0 || conversation.unreadCounts?.[currentUser?._id] > 0;
        const isMuted = conversation.isMuted || false;

        return {
            name,
            avatar,
            lastMessageText,
            hasUnread,
            isMuted,
            time: formatTime(conversation.lastMessageAt || conversation.updatedAt),
        };
    };

    return (
        <div className={cn("h-full w-full shrink-0 flex-col border-r bg-background md:w-[350px]", className)}>
            {/* Header */}
            <div className="flex items-center gap-1 border-b bg-background p-3 text-foreground">
                {/* ... (Giữ nguyên phần Header như cũ) ... */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-70" />
                    <Input placeholder="Tìm kiếm" className="h-9 rounded-full border-none bg-muted pl-9 text-foreground shadow-none placeholder:text-muted-foreground" />
                </div>

                <div className="dropdown dropdown-end">
                    <div tabIndex={0} role="button" className="flex size-9 items-center justify-center rounded-full hover:bg-muted cursor-pointer transition-colors">
                        <Palette className="size-5" />
                    </div>
                    <ul tabIndex={0} className="dropdown-content z-[100] menu p-2 shadow-2xl bg-base-200 text-base-content rounded-box w-56 mt-2 border border-base-300">
                        {themes.map((theme) => (
                            <li key={theme.name}>
                                <button onClick={() => handleThemeChange(theme.name)} className="flex justify-between items-center cursor-pointer w-full">
                                    <span className="text-sm font-medium">{theme.name}</span>
                                    <div className="flex gap-1">
                                        {theme.colors.map((color, idx) => (
                                            <span key={idx} className={`w-2.5 h-2.5 rounded-full ${color}`}></span>
                                        ))}
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="dropdown dropdown-end">
                    <div tabIndex={0} role="button" className="flex size-9 items-center justify-center rounded-full hover:bg-muted cursor-pointer transition-colors">
                        <Plus className="size-5" />
                    </div>
                    <ul tabIndex={0} className="dropdown-content z-[100] menu p-2 shadow-2xl bg-base-200 text-base-content rounded-box w-48 mt-2 border border-base-300">
                        <li><button className="flex items-center gap-3 w-full"><UserPlus className="size-4" /><span className="font-medium">Thêm bạn</span></button></li>
                        <li><button className="flex items-center gap-3 w-full"><Users className="size-4" /><span className="font-medium">Tạo nhóm</span></button></li>
                    </ul>
                </div>
            </div>

            {/* Danh sách chat */}
            <div className="min-h-0 flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        Chưa có cuộc trò chuyện nào
                    </div>
                ) : (
                    conversations.map((c) => {
                        const { name, avatar, lastMessageText, hasUnread, isMuted, time } = getConversationInfo(c);

                        return (
                            <button
                                key={c._id}
                                onClick={() => onSelect(c._id)}
                                className={cn(
                                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                                    activeId === c._id && "bg-blue-50 md:bg-primary/10"
                                )}
                            >
                                <img src={avatar} alt={name} className="size-12 shrink-0 rounded-full object-cover" />
                                <div className="min-w-0 flex-1 border-b pb-3 md:border-none md:pb-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <h3 className={cn("truncate text-[15px]", hasUnread ? "font-semibold" : "font-medium")}>
                                            {name}
                                        </h3>
                                        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                                            {isMuted && <BellOff className="size-3.5" />}
                                            {time}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 mt-0.5">
                                        <p className={cn("truncate text-sm", hasUnread ? "font-medium text-foreground" : "text-muted-foreground")}>
                                            {lastMessageText}
                                        </p>
                                        {hasUnread && <span className="size-2.5 shrink-0 rounded-full bg-red-500" />}
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>

            {/* Bottom nav */}
            <nav className="flex h-16 shrink-0 items-center justify-around border-t bg-background md:hidden">
                {NAV_TOP.map(({ icon: Icon, label, active }) => (
                    <button key={label} className={cn("flex flex-col items-center gap-0.5 text-[10px]", active ? "text-primary" : "text-muted-foreground")}>
                        <Icon className="size-6" />
                        <span>{label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
};

export default ChatList;
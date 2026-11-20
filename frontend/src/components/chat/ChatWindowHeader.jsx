// src/components/chat/ChatWindowHeader.jsx
import { Video, MoreVertical, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "./StatusBadge";
import { useState, useEffect } from "react";
import { formatLastSeen } from "@/utils/date";
import { useSocketStore } from "@/stores/useSocketStore";
import { useCallStore } from "@/stores/useCallStore";
import { useAuthStore } from "@/stores/useAuthStore"; // 🆕 Thêm import này

const ChatWindowHeader = ({ chat, onBack }) => {
    const [now, setNow] = useState(() => Date.now());

    const socket = useSocketStore(state => state.socket);
    const startOutgoingCall = useCallStore(state => state.startOutgoingCall);
    const currentUser = useAuthStore(state => state.user); // 🆕 Lấy currentUser

    useEffect(() => {
        // Cứ mỗi 60 giây, cập nhật `now` để ép component render lại
        const interval = setInterval(() => setNow(Date.now()), 60000);
        return () => clearInterval(interval);
    }, []);

    if (!chat) return null;

    const handleStartCall = () => {
        if (!chat.id || !socket || !currentUser) return;

        // Lấy ID của những người sẽ nhận cuộc gọi (trừ bản thân)
        // 🆕 Lưu ý: chat.participants phải được truyền từ ChatAppPage xuống, nếu lỗi bro check lại activeChat
        const targetUserIds = (chat.participants || [])
            .filter(p => {
                const pId = p._id || p.userId?._id;
                return pId?.toString() !== currentUser._id.toString();
            })
            .map(p => p._id || p.userId?._id);

        const callData = {
            roomName: chat.id,
            targetUserIds: targetUserIds,
            targetName: chat.name,
            targetAvatar: chat.avatar,
        };

        // Bắn Socket gọi
        socket.emit("call_user", {
            targetUserIds: targetUserIds,
            roomName: chat.id,
            caller: currentUser,
        });

        // Bật UI "Đang gọi..."
        startOutgoingCall(callData);
    };

    return (
        <>
            <div className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-3 md:px-4">
                <div className="flex min-w-0 items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
                        <ChevronLeft className="size-6" />
                    </Button>

                    <div className="relative shrink-0">
                        <img
                            src={chat.avatar}
                            alt={chat.name}
                            className="size-10 rounded-full object-cover"
                        />
                        {chat.isOnline && (
                            <StatusBadge
                                status="online"
                                className="absolute bottom-0 right-0 size-3.5 ring-background"
                            />
                        )}
                    </div>

                    <div className="flex flex-col min-w-0 justify-center">
                        <h2 className="truncate text-[15px] font-semibold md:text-base leading-tight">
                            {chat.name}
                        </h2>
                        <span className="text-xs text-muted-foreground truncate">
                            {chat.isOnline ? "Đang hoạt động" : formatLastSeen(chat.lastActiveAt)}
                        </span>
                    </div>
                </div>

                <div className="flex gap-1 text-muted-foreground">
                    {/* 🆕 Sửa lại onClick gọi hàm handleStartCall */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="hidden sm:inline-flex"
                        onClick={handleStartCall}
                        disabled={!chat.id} // Không cho gọi nếu là chat nháp
                    >
                        <Video className="size-5" />
                    </Button>
                    <Button variant="ghost" size="icon">
                        <MoreVertical className="size-5" />
                    </Button>
                </div>
            </div>
        </>
    );
};

export default ChatWindowHeader;
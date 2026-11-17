// src/components/chat/ChatWindowHeader.jsx
import { Video, MoreVertical, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "./StatusBadge";
import { useState, useEffect } from "react";
import { formatLastSeen } from "@/utils/date";

const ChatWindowHeader = ({ chat, onBack }) => {

    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        // Cứ mỗi 60 giây, cập nhật `now` để ép component render lại
        const interval = setInterval(() => setNow(Date.now()), 60000);
        return () => clearInterval(interval);
    }, []);

    if (!chat) return null;

    return (
        <div className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-3 md:px-4">
            <div className="flex min-w-0 items-center gap-3">
                {/* Nút Back chỉ hiện trên mobile */}
                <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
                    <ChevronLeft className="size-6" />
                </Button>

                {/* Avatar + Badge (Header vẫn giữ cả badge online/offline cho đẹp) */}
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

                {/* Cụm Tên và Trạng thái */}
                <div className="flex flex-col min-w-0 justify-center">
                    <h2 className="truncate text-[15px] font-semibold md:text-base leading-tight">
                        {chat.name}
                    </h2>
                    <span className="text-xs text-muted-foreground truncate">
                        {/* 🆕 HIỂN THỊ THỜI GIAN THẬT */}
                        {chat.isOnline
                            ? "Đang hoạt động"
                            : formatLastSeen(chat.lastActiveAt)
                        }
                    </span>
                </div>
            </div>

            <div className="flex gap-1 text-muted-foreground">
                <Button variant="ghost" size="icon" className="hidden sm:inline-flex">
                    <Video className="size-5" />
                </Button>
                <Button variant="ghost" size="icon">
                    <MoreVertical className="size-5" />
                </Button>
            </div>
        </div>
    );
};

export default ChatWindowHeader;
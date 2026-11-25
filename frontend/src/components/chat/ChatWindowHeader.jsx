// src/components/chat/ChatWindowHeader.jsx
import { useEffect, useState } from "react";
import { ChevronLeft, Info, Users, Video } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import StatusBadge from "./StatusBadge";
import { formatLastSeen } from "@/utils/date";
import { useSocketStore } from "@/stores/useSocketStore";
import { useCallStore } from "@/stores/useCallStore";
import { useAuthStore } from "@/stores/useAuthStore";

const ChatWindowHeader = ({
    chat,
    onBack,
    infoOpen,
    onToggleInfo,
    directBlockStatus,
}) => {
    const { t } = useTranslation();
    const [, setNow] = useState(() => Date.now());

    const socket = useSocketStore((state) => state.socket);
    const startOutgoingCall = useCallStore((state) => state.startOutgoingCall);
    const currentUser = useAuthStore((state) => state.user);
    const directIsBlocked = Boolean(directBlockStatus?.blockedByMe || directBlockStatus?.blockedMe);
    const directCallUnavailable = !chat?.isGroup && (!directBlockStatus || directIsBlocked);

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 60000);
        return () => clearInterval(interval);
    }, []);

    if (!chat) return null;

    const members = (chat.participants || []).filter((p) => p.status !== "declined");

    const handleStartCall = () => {
        if (!chat.id || !socket || !currentUser || directCallUnavailable) return;

        const targetUserIds = (chat.participants || [])
            .filter((p) => {
                const pId = p._id || p.userId?._id;
                return pId?.toString() !== currentUser._id.toString();
            })
            .map((p) => p._id || p.userId?._id);

        socket.emit("call_user", {
            targetUserIds,
            roomName: chat.id,
            caller: currentUser,
        });

        startOutgoingCall({
            roomName: chat.id,
            targetUserIds,
            targetName: chat.name,
            targetAvatar: chat.avatar,
        });
    };

    return (
        <div className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-3 md:px-4">
            <div className="flex min-w-0 items-center gap-3">
                <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
                    <ChevronLeft className="size-6" />
                </Button>

                <div className="relative shrink-0">
                    <img src={chat.avatar} alt={chat.name} className="size-10 rounded-full object-cover" />
                    {chat.isOnline && (
                        <StatusBadge status="online" className="absolute bottom-0 right-0 size-3.5 ring-background" />
                    )}
                </div>

                <div className="flex min-w-0 flex-col justify-center">
                    <h2 className="truncate text-[15px] font-semibold leading-tight md:text-base">{chat.name}</h2>
                    <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        {chat.isGroup ? (
                            <>
                                <Users className="size-3.5" />
                                {t("header.members", { n: members.length })}
                            </>
                        ) : chat.isOnline ? (
                            t("date.activeNow")
                        ) : (
                            formatLastSeen(chat.lastActiveAt)
                        )}
                    </span>
                </div>
            </div>

            <div className="flex shrink-0 gap-1 text-muted-foreground">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleStartCall}
                    disabled={!chat.id || directCallUnavailable}
                >
                    <Video className="size-5" />
                </Button>
                {chat.isGroup ? chat.id && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggleInfo}
                        title={t("groupInfo.title")}
                        className={infoOpen ? "bg-muted text-primary" : ""}
                    >
                        <Info className="size-5" />
                    </Button>
                ) : chat.otherUserId && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggleInfo}
                        title={t("directInfo.title")}
                        className={infoOpen ? "bg-muted text-primary" : ""}
                    >
                        <Info className="size-5" />
                    </Button>
                )}
            </div>
        </div>
    );
};

export default ChatWindowHeader;
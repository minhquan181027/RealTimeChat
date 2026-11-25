import { useEffect, useRef, useState } from "react";
import { Ban, LogOut, MoreVertical, Video } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCallStore } from "@/stores/useCallStore";
import { useFriendStore } from "@/stores/useFriendStore";
import { useSocketStore } from "@/stores/useSocketStore";

const ConversationActionsMenu = ({
    conversation,
    name,
    avatar,
    otherUserId,
    onRequestLeaveGroup,
    onBlockUser,
    onUnblockUser,
}) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
    const [blocking, setBlocking] = useState(false);
    const menuRef = useRef(null);

    const socket = useSocketStore((state) => state.socket);
    const currentUser = useAuthStore((state) => state.user);
    const startOutgoingCall = useCallStore((state) => state.startOutgoingCall);
    const directBlockStatus = useFriendStore((state) => otherUserId ? state.blockStatuses[otherUserId] : null);
    const fetchBlockStatus = useFriendStore((state) => state.fetchBlockStatus);

    const isGroup = conversation.type === "group";
    const directIsBlocked = Boolean(directBlockStatus?.blockedByMe || directBlockStatus?.blockedMe);
    const callUnavailable = !conversation._id || !socket || !currentUser ||
        (isGroup ? conversation.myStatus === "pending" : !directBlockStatus || directIsBlocked);

    useEffect(() => {
        if (!open) return undefined;
        const closeOnOutsideClick = (event) => {
            if (!menuRef.current?.contains(event.target)) setOpen(false);
        };
        document.addEventListener("pointerdown", closeOnOutsideClick);
        return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
    }, [open]);

    const handleToggleMenu = async (event) => {
        event.stopPropagation();
        if (open) {
            setOpen(false);
            return;
        }
        if (!isGroup && otherUserId && !directBlockStatus) {
            await fetchBlockStatus(otherUserId);
        }
        setOpen(true);
    };

    const handleStartCall = async (event) => {
        event.stopPropagation();
        if (callUnavailable) return;

        if (!isGroup && directBlockStatus?.blockedByMe) {
            toast.error(t("chatWindow.blockedByMe"));
            return;
        }
        if (!isGroup && directBlockStatus?.blockedMe) {
            toast.error(t("chatWindow.blockedMe"));
            return;
        }

        const targetUserIds = (conversation.participants || [])
            .filter((participant) => {
                const participantId = participant._id || participant.userId?._id;
                return (
                    participantId?.toString() !== currentUser._id.toString() &&
                    participant.status !== "declined"
                );
            })
            .map((participant) => participant._id || participant.userId?._id);
        if (!targetUserIds.length) return;

        const callId = crypto.randomUUID();
        socket.emit("call_user", {
            callId,
            targetUserIds,
            roomName: conversation._id,
        });
        startOutgoingCall({
            callId,
            roomName: conversation._id,
            targetUserIds,
            targetName: name,
            targetAvatar: avatar,
        });
        setOpen(false);
    };

    const handleConfirmBlock = async (event) => {
        event.stopPropagation();
        setBlocking(true);
        const blocked = await onBlockUser?.(otherUserId);
        setBlocking(false);
        if (blocked) {
            setBlockConfirmOpen(false);
            setOpen(false);
        }
    };

    const handleUnblock = async (event) => {
        event.stopPropagation();
        const unblocked = await onUnblockUser?.(otherUserId);
        if (unblocked) setOpen(false);
    };

    return (
        <>
            <div
                ref={menuRef}
                className={`relative shrink-0 [@media(hover:hover)]:hidden [@media(hover:hover)]:group-hover:block [@media(hover:hover)]:group-focus-within:block ${
                    open ? "[@media(hover:hover)]:!block" : ""
                }`}
            >
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleToggleMenu}
                    title={t("header.moreOptions")}
                    aria-label={t("header.moreOptions")}
                    aria-expanded={open}
                    className="size-9"
                >
                    <MoreVertical className="size-5" />
                </Button>
                {open && (
                    <div className="absolute right-0 top-full z-50 mt-1 min-w-48 rounded-lg border bg-background p-1 shadow-xl">
                        <button
                            type="button"
                            disabled={callUnavailable}
                            onClick={handleStartCall}
                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                        >
                            <Video className="size-4" />
                            {t("header.startVideoCall")}
                        </button>
                        {isGroup ? (
                            conversation.myStatus !== "pending" && (
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setOpen(false);
                                        onRequestLeaveGroup?.(conversation._id);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-destructive hover:bg-muted"
                                >
                                    <LogOut className="size-4" />
                                    {t("groupInfo.leave")}
                                </button>
                            )
                        ) : directBlockStatus ? (
                            directBlockStatus.blockedByMe ? (
                                <button
                                    type="button"
                                    onClick={handleUnblock}
                                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                                >
                                    <Ban className="size-4" />
                                    {t("directInfo.unblock")}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setOpen(false);
                                        setBlockConfirmOpen(true);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-destructive hover:bg-muted"
                                >
                                    <Ban className="size-4" />
                                    {t("directInfo.block")}
                                </button>
                            )
                        ) : (
                            <button
                                type="button"
                                disabled
                                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm opacity-50"
                            >
                                <Ban className="size-4" />
                                {t("directInfo.loadingStatus")}
                            </button>
                        )}
                    </div>
                )}
            </div>

            <Dialog
                open={blockConfirmOpen}
                onOpenChange={(nextOpen) => {
                    if (!blocking) setBlockConfirmOpen(nextOpen);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("directInfo.blockTitle")}</DialogTitle>
                        <DialogDescription>
                            {t("directInfo.blockConfirm", { name })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="secondary"
                            disabled={blocking}
                            onClick={() => setBlockConfirmOpen(false)}
                        >
                            {t("common.cancel")}
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={blocking}
                            onClick={handleConfirmBlock}
                        >
                            {blocking ? t("directInfo.blocking") : t("directInfo.block")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default ConversationActionsMenu;

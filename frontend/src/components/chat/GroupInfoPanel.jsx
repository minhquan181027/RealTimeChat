import { useState } from "react";
import { ChevronDown, LogOut, UserPlus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import StatusBadge from "./StatusBadge";
import AddMembersDialog from "./AddMembersDialog";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSocketStore } from "@/stores/useSocketStore";

const MEMBER_PREVIEW = 5;
const PHOTO_PREVIEW = 9;

const avatarOf = (u) =>
    u?.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(u?.displayName || "U")}&background=random`;

const Section = ({ title, children }) => {
    const [open, setOpen] = useState(true);
    return (
        <div className="border-t">
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/40"
            >
                {title}
                <ChevronDown className={cn("size-4 transition-transform", !open && "-rotate-90")} />
            </button>
            {open && <div className="px-4 pb-3">{children}</div>}
        </div>
    );
};

const GroupInfoPanel = ({ chat, messages, onClose, onMemberClick, onImageClick, onLeave }) => {
    const { t } = useTranslation();
    const currentUser = useAuthStore((s) => s.user);
    const onlineUsers = useSocketStore((s) => s.onlineUsers);
    const [addOpen, setAddOpen] = useState(false);
    const [showAllMembers, setShowAllMembers] = useState(false);
    const [showAllPhotos, setShowAllPhotos] = useState(false);

    const members = (chat.participants || []).filter((p) => p.status !== "declined");
    const shownMembers = showAllMembers ? members : members.slice(0, MEMBER_PREVIEW);
    const existingIds = (chat.participants || []).map((p) => p._id?.toString());
    const canAdd = chat.id && chat.myStatus !== "pending";

    // Ảnh mới nhất trước, bỏ ảnh đang tải lên
    const photos = [...messages].reverse().filter((m) => m.imgURL && !m.pending);
    const shownPhotos = showAllPhotos ? photos : photos.slice(0, PHOTO_PREVIEW);

    const [confirmLeave, setConfirmLeave] = useState(false);
    const [leaving, setLeaving] = useState(false);

    const handleLeave = async () => {
        setLeaving(true);
        const ok = await onLeave?.();
        if (!ok) setLeaving(false); // thành công thì panel tự biến mất cùng cuộc trò chuyện
    };

    return (
        <aside className="absolute inset-0 z-30 flex flex-col bg-background xl:static xl:z-auto xl:w-96 xl:shrink-0 xl:border-l">
            <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
                <h2 className="text-base font-semibold">{t("groupInfo.title")}</h2>
                <Button variant="ghost" size="icon" onClick={onClose} title={t("groupInfo.close")}>
                    <X className="size-5" />
                </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="flex flex-col items-center px-4 py-5">
                    <img src={chat.avatar} alt={chat.name} className="size-20 rounded-full object-cover" />
                    <h3 className="mt-3 max-w-full break-words text-center text-lg font-semibold">{chat.name}</h3>
                    <p className="text-xs text-muted-foreground">{t("header.members", { n: members.length })}</p>

                    {canAdd && (
                        <button
                            onClick={() => setAddOpen(true)}
                            className="mt-4 flex flex-col items-center gap-1 text-xs"
                        >
                            <span className="flex size-10 items-center justify-center rounded-full bg-muted hover:bg-muted/70">
                                <UserPlus className="size-5" />
                            </span>
                            {t("header.addMember")}
                        </button>
                    )}
                </div>

                <Section title={t("groupInfo.members")}>
                    <div className="-mx-2">
                        {shownMembers.map((p) => {
                            const id = p._id?.toString();
                            const isMe = id === currentUser?._id?.toString();
                            return (
                                <button
                                    key={id}
                                    onClick={() => !isMe && onMemberClick?.(p)}
                                    className={cn(
                                        "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left",
                                        isMe ? "cursor-default" : "hover:bg-muted/60"
                                    )}
                                >
                                    <div className="relative shrink-0">
                                        <img src={avatarOf(p)} alt="" className="size-10 rounded-full object-cover" />
                                        {onlineUsers.includes(id) && (
                                            <StatusBadge status="online" className="absolute bottom-0 right-0 size-3" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">
                                            {p.displayName}
                                            {isMe && ` (${t("groupInfo.you")})`}
                                        </p>
                                        {p.status === "pending" && (
                                            <p className="text-xs text-muted-foreground">{t("groupInfo.pendingMember")}</p>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    {members.length > MEMBER_PREVIEW && (
                        <Button
                            variant="secondary"
                            className="mt-2 w-full"
                            onClick={() => setShowAllMembers((v) => !v)}
                        >
                            {showAllMembers ? t("groupInfo.showLess") : t("groupInfo.showAll")}
                        </Button>
                    )}
                </Section>

                <Section title={t("groupInfo.photos")}>
                    {photos.length === 0 ? (
                        <p className="py-2 text-center text-sm text-muted-foreground">{t("groupInfo.noPhotos")}</p>
                    ) : (
                        <>
                            <div className="grid grid-cols-3 gap-1">
                                {shownPhotos.map((m) => (
                                    <button
                                        key={m.id}
                                        onClick={() => onImageClick?.(m.imgURL)}
                                        className="aspect-square overflow-hidden rounded-md bg-muted"
                                    >
                                        <img
                                            src={m.imgURL}
                                            alt=""
                                            loading="lazy"
                                            className="size-full object-cover transition-opacity hover:opacity-80"
                                        />
                                    </button>
                                ))}
                            </div>
                            {photos.length > PHOTO_PREVIEW && (
                                <Button
                                    variant="secondary"
                                    className="mt-2 w-full"
                                    onClick={() => setShowAllPhotos((v) => !v)}
                                >
                                    {showAllPhotos ? t("groupInfo.showLess") : t("groupInfo.showAll")}
                                </Button>
                            )}
                        </>
                    )}
                </Section>

                <Section title={t("groupInfo.files")}>
                    <p className="py-2 text-center text-sm text-muted-foreground">{t("groupInfo.noFiles")}</p>
                </Section>

                {chat.myStatus !== "pending" && (
                    <div className="border-t px-4 py-3">
                        {confirmLeave ? (
                            <div className="space-y-3">
                                <p className="text-sm">{t("groupInfo.confirmLeave", { name: chat.name })}</p>
                                <div className="flex gap-2">
                                    <Button
                                        variant="secondary"
                                        className="flex-1"
                                        disabled={leaving}
                                        onClick={() => setConfirmLeave(false)}
                                    >
                                        {t("common.cancel")}
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        className="flex-1"
                                        disabled={leaving}
                                        onClick={handleLeave}
                                    >
                                        {leaving ? t("groupInfo.leaving") : t("groupInfo.leave")}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setConfirmLeave(true)}
                                className="flex w-full items-center gap-3 rounded-md py-1 text-sm font-medium text-destructive hover:bg-muted/40"
                            >
                                <LogOut className="size-4" />
                                {t("groupInfo.leave")}
                            </button>
                        )}
                    </div>
                )}
            </div>

            <AddMembersDialog
                open={addOpen}
                onOpenChange={setAddOpen}
                conversationId={chat.id}
                existingIds={existingIds}
            />
        </aside>
    );
};

export default GroupInfoPanel;
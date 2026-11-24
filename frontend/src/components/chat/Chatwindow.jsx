// src/components/chat/ChatWindow.jsx
import { Fragment, useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { MessageSquare, UserPlus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import ChatInput from "./ChatInput";
import ChatWindowHeader from "./ChatWindowHeader";
import MessageItem from "./MessageItem";
import GroupInfoPanel from "./GroupInfoPanel";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";
import { useChatStore } from "@/stores/useChatStore";
import { fetchGiphyGifsByIds } from "@/services/giphyService";
import { toast } from "sonner";

const SCROLL_THRESHOLD = 80;

const ChatWindow = ({
    chat, messages, onBack, onTyping, onSend, onRetry, onUpload, onAccept, onDecline,
    onSendGif,
    sending, uploading, onLoadMore, hasMore, loading,
    friendStatus, onSendFriend, onAcceptFriend, onAvatarClick, onMemberClick, onLeaveGroup, onRemoveMember,
    onSetDeputyAdmin, className,
}) => {
    const { t } = useTranslation();

    const listRef = useRef(null);
    const prevScrollHeightRef = useRef(0);
    const firstLoadRef = useRef(true);
    const lastMsgIdRef = useRef(null);
    const isStickyBottomRef = useRef(true);

    const [selectedImage, setSelectedImage] = useState(null);
    const [infoOpen, setInfoOpen] = useState(false);
    const [gifMedia, setGifMedia] = useState({});
    const requestedGifIdsRef = useRef(new Set());

    const currentUser = useAuthStore((state) => state.user);

    const typingMap = useChatStore((s) => s.typing[chat?.id]);
    const typingNames = Object.values(typingMap || {});
    const typingCount = typingNames.length;

    useEffect(() => {
        const gifIds = [...new Set(
            messages
                .filter((message) => message.type === "gif" && message.gifProvider === "giphy" && message.gifId)
                .map((message) => message.gifId)
        )];
        const missingIds = gifIds.filter((id) => !requestedGifIdsRef.current.has(id));
        if (!missingIds.length) return;

        missingIds.forEach((id) => requestedGifIdsRef.current.add(id));
        fetchGiphyGifsByIds(missingIds)
            .then((resolvedGifs) => {
                setGifMedia((current) => ({
                    ...current,
                    ...Object.fromEntries(resolvedGifs.map((gif) => [gif.id, gif])),
                }));
            })
            .catch((error) => {
                console.error("Could not load GIPHY media:", error);
                toast.error(t("chatWindow.gifLoadFailed"));
            });
    }, [messages, t]);

    const handleGifSelect = useCallback((gif) => {
        if (!gif?.id || !gif.previewUrl) return;
        requestedGifIdsRef.current.add(gif.id);
        setGifMedia((current) => ({ ...current, [gif.id]: gif }));
        onSendGif?.({ provider: "giphy", id: gif.id });
    }, [onSendGif]);

    // Những người đã xem (không tính bản thân)
    const seenByOthers = (chat?.seenBy || []).filter(
        (id) => id?.toString() !== currentUser?._id?.toString()
    );
    const seenCount = seenByOthers.length;

    const handleImageLoad = useCallback(() => {
        if (isStickyBottomRef.current && listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, []);

    // 1) Load more khi gần top
    useEffect(() => {
        const el = listRef.current;
        if (!el || !chat) return;

        const onScroll = () => {
            const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
            isStickyBottomRef.current = distanceToBottom < 100;

            if (el.scrollTop > SCROLL_THRESHOLD) return;
            if (!hasMore || loading) return;
            prevScrollHeightRef.current = el.scrollHeight;
            onLoadMore?.();
        };

        el.addEventListener("scroll", onScroll, { passive: true });
        return () => el.removeEventListener("scroll", onScroll);
    }, [chat, hasMore, loading, onLoadMore]);

    // 2) Scroll logic
    useLayoutEffect(() => {
        const el = listRef.current;
        if (!el || messages.length === 0) return;

        const last = messages[messages.length - 1];
        const lastId = last?.id;
        const isAppendMine = lastId !== lastMsgIdRef.current && last?.mine;
        lastMsgIdRef.current = lastId;

        if (firstLoadRef.current) {
            el.scrollTop = el.scrollHeight;
            firstLoadRef.current = false;
            prevScrollHeightRef.current = 0;
            isStickyBottomRef.current = true;
            return;
        }

        if (prevScrollHeightRef.current > 0) {
            const delta = el.scrollHeight - prevScrollHeightRef.current;
            el.scrollTop += delta;
            prevScrollHeightRef.current = 0;
            return;
        }

        if (isAppendMine || isStickyBottomRef.current) {
            el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
        }
    }, [messages]);

    // 3) Avatar "đã xem" / chấm "đang soạn" làm list cao thêm -> kéo xuống cuối nếu đang ở đáy
    useLayoutEffect(() => {
        const el = listRef.current;
        if (!el || !isStickyBottomRef.current) return;
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }, [seenCount, typingCount]);

    if (!chat) {
        return (
            <div className={cn("flex-1 items-center justify-center bg-muted/40 text-muted-foreground", className)}>
                <div className="text-center">
                    <MessageSquare className="mx-auto mb-3 size-14 opacity-30" />
                    <p className="text-sm">{t("chatWindow.selectToStart")}</p>
                </div>
            </div>
        );
    }

    const inputDisabled = !!(sending || uploading);

    return (
        <div className={cn("relative min-w-0 flex-1 flex-row bg-muted/40", className)}>
            {/* Cột chat chính */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <ChatWindowHeader
                    chat={chat}
                    onBack={onBack}
                    infoOpen={infoOpen}
                    onToggleInfo={() => setInfoOpen((v) => !v)}
                />

                {(friendStatus === "none" || friendStatus === "sent" || friendStatus === "received") && (
                    <div className="flex items-center justify-between gap-3 border-b bg-background px-4 py-2.5">
                        <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                            <UserPlus className="size-4 shrink-0" />
                            <span className="truncate">
                                {friendStatus === "none" && t("chatWindow.friendNone")}
                                {friendStatus === "sent" && t("chatWindow.friendSent")}
                                {friendStatus === "received" && t("chatWindow.friendReceived", { name: chat.name })}
                            </span>
                        </div>
                        {friendStatus === "none" && (
                            <Button variant="secondary" onClick={onSendFriend}>{t("chatWindow.sendFriend")}</Button>
                        )}
                        {friendStatus === "received" && (
                            <Button onClick={onAcceptFriend}>{t("contacts.accept")}</Button>
                        )}
                    </div>
                )}

                <div
                    ref={listRef}
                    style={{ overflowAnchor: "none" }}
                    className="min-h-0 flex flex-1 flex-col gap-y-3 overflow-y-auto p-4"
                >
                    {loading && hasMore && (
                        <div className="flex justify-center py-2 text-xs text-muted-foreground">
                            {t("chatWindow.loadingOld")}
                        </div>
                    )}

                    {messages.map((m, index) => {
                        const isLastMessage = index === messages.length - 1;
                        const previousMessage = messages[index - 1];
                        const nextMessage = messages[index + 1];
                        const canGroupWith = (other) =>
                            other &&
                            m.type !== "system" &&
                            other.type !== "system" &&
                            !m.recalledAt &&
                            !other.recalledAt &&
                            m.senderId &&
                            m.senderId === other.senderId;
                        const sameSenderPrev = !m.dividerText && canGroupWith(previousMessage);
                        const sameSenderNext = !nextMessage?.dividerText && canGroupWith(nextMessage);
                        const showSeenAvatar = isLastMessage && m.mine && seenCount > 0;

                        return (
                            <Fragment key={m.id}>
                                {m.dividerText && (
                                    <div className="my-4 flex justify-center">
                                        <span className="rounded-full bg-muted-foreground/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                                            {m.dividerText}
                                        </span>
                                    </div>
                                )}

                                <MessageItem
                                    m={m}
                                    chat={chat}
                                    isLastMessage={isLastMessage}
                                    sameSenderPrev={sameSenderPrev}
                                    sameSenderNext={sameSenderNext}
                                    onRetry={onRetry}
                                    setSelectedImage={setSelectedImage}
                                    onImageLoad={handleImageLoad}
                                    onAvatarClick={onAvatarClick}
                                    gifPreviewUrl={gifMedia[m.gifId]?.previewUrl}
                                    gifMediaUrl={gifMedia[m.gifId]?.mediaUrl}
                                />

                                {showSeenAvatar && (
                                    <div className="mt-0.5 flex justify-end pr-2">
                                        {!chat.isGroup ? (
                                            <img
                                                src={chat.avatar}
                                                alt={t("chatWindow.seen")}
                                                className="size-[14px] rounded-full object-cover"
                                                title={t("chatWindow.seen")}
                                            />
                                        ) : (
                                            <div className="flex -space-x-1">
                                                {seenByOthers.slice(0, 3).map((item) => {
                                                    const seenerId = item?._id || item;
                                                    const participant = chat.participants?.find(
                                                        (p) => p._id?.toString() === seenerId?.toString()
                                                    );
                                                    return (
                                                        <img
                                                            key={seenerId}
                                                            src={
                                                                participant?.avatarUrl ||
                                                                `https://ui-avatars.com/api/?name=${encodeURIComponent(participant?.displayName || "U")}&background=random`
                                                            }
                                                            alt={t("chatWindow.seen")}
                                                            className="size-[14px] rounded-full object-cover ring-1 ring-background"
                                                            title={t("chatWindow.seen")}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Fragment>
                        );
                    })}

                    {typingCount > 0 && (
                        <div className="flex items-end gap-2 pt-3">
                            {!chat.isGroup && (
                                <img src={chat.avatar} alt="" className="size-9 shrink-0 rounded-full object-cover" />
                            )}
                            <div className="rounded-2xl bg-background px-4 py-3 shadow-sm">
                                <span className="flex gap-1">
                                    {[0, 150, 300].map((d) => (
                                        <span
                                            key={d}
                                            className="size-1.5 animate-bounce rounded-full bg-muted-foreground"
                                            style={{ animationDelay: `${d}ms` }}
                                        />
                                    ))}
                                </span>
                            </div>
                            {chat.isGroup && (
                                <span className="mb-2 text-xs text-muted-foreground">
                                    {typingCount === 1
                                        ? t("typing.named", { name: typingNames[0] })
                                        : t("typing.many")}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Banner cho cuộc trò chuyện đang chờ */}
                {chat.myStatus === "pending" && (
                    <div className="flex items-center justify-between gap-3 border-t bg-background px-4 py-3">
                        <p className="text-sm text-muted-foreground">
                            {chat.isGroup
                                ? t("chatWindow.pendingGroup")
                                : t("chatWindow.pendingDirect", { name: chat.name })}
                        </p>
                        <div className="flex shrink-0 gap-2">
                            <button
                                onClick={onDecline}
                                className="rounded-md bg-muted px-3 py-1.5 text-sm font-medium hover:bg-muted/80"
                            >
                                {t("common.delete")}
                            </button>
                            <button
                                onClick={onAccept}
                                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                            >
                                {t("contacts.accept")}
                            </button>
                        </div>
                    </div>
                )}

                <ChatInput onSend={onSend} onSendGif={handleGifSelect} onUpload={onUpload} onTyping={onTyping} disabled={inputDisabled} />
            </div>

            {/* Panel thông tin nhóm */}
            {chat.isGroup && infoOpen && (
                <GroupInfoPanel
                    chat={chat}
                    messages={messages}
                    onClose={() => setInfoOpen(false)}
                    onMemberClick={onMemberClick}
                    onImageClick={setSelectedImage}
                    onLeave={onLeaveGroup}
                    onRemoveMember={onRemoveMember}
                    onSetDeputyAdmin={onSetDeputyAdmin}

                />
            )}

            {/* Modal xem ảnh */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    <button
                        onClick={() => setSelectedImage(null)}
                        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                    >
                        <X className="size-6" />
                    </button>
                    <img
                        src={selectedImage}
                        alt={t("chatWindow.viewImage")}
                        className="max-h-full max-w-full object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};

export default ChatWindow;
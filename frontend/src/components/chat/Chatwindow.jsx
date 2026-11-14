// src/components/chat/ChatWindow.jsx
import { Fragment, useEffect, useLayoutEffect, useRef } from "react";
import { MessageSquare } from "lucide-react";
import { cn } from "cn";
import ChatInput from "./ChatInput";
import ChatWindowHeader from "./ChatWindowHeader";

const SCROLL_THRESHOLD = 80;

const ChatWindow = ({
    chat,
    messages,
    onBack,
    onSend,
    onRetry,
    onUpload,
    sending,
    uploading,
    onLoadMore,
    hasMore,
    loading,
    className,
}) => {
    const listRef = useRef(null);
    const prevScrollHeightRef = useRef(0);
    const firstLoadRef = useRef(true);
    const lastMsgIdRef = useRef(null);

    // 1) Load more khi gần top
    useEffect(() => {
        const el = listRef.current;
        if (!el || !chat) return;

        const onScroll = () => {
            if (el.scrollTop > SCROLL_THRESHOLD) return;
            if (!hasMore || loading) return;
            prevScrollHeightRef.current = el.scrollHeight;
            onLoadMore?.();
        };

        el.addEventListener("scroll", onScroll, { passive: true });
        return () => el.removeEventListener("scroll", onScroll);
    }, [chat, hasMore, loading, onLoadMore]);

    // 2) Scroll: lần đầu / prepend tin cũ / append tin của mình
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
            return;
        }

        if (prevScrollHeightRef.current > 0) {
            el.scrollTop += el.scrollHeight - prevScrollHeightRef.current;
            prevScrollHeightRef.current = 0;
            return;
        }

        if (isAppendMine) {
            el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
        }
    }, [messages]);

    if (!chat) {
        return (
            <div className={cn("flex-1 items-center justify-center bg-muted/40 text-muted-foreground", className)}>
                <div className="text-center">
                    <MessageSquare className="mx-auto mb-3 size-14 opacity-30" />
                    <p className="text-sm">Chọn một cuộc trò chuyện để bắt đầu</p>
                </div>
            </div>
        );
    }

    const inputDisabled = !!(sending || uploading);

    return (
        <div className={cn("min-w-0 flex-1 flex-col bg-muted/40", className)}>
            <ChatWindowHeader chat={chat} onBack={onBack} />

            <div
                ref={listRef}
                style={{ overflowAnchor: "none" }}
                className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
            >
                {loading && hasMore && (
                    <div className="flex justify-center py-2 text-xs text-muted-foreground">
                        Đang tải tin nhắn cũ...
                    </div>
                )}

                {messages.map((m) => {
                    // 🆕 Kiểm tra xem tin nhắn có CHỈ chứa ảnh (không kèm text) hay không
                    const isOnlyImage = m.imgURL && !m.text;

                    return (
                        <Fragment key={m.id}>
                            {m.dividerText && (
                                <div className="flex justify-center my-4">
                                    <span className="rounded-full bg-muted-foreground/10 px-3 py-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                        {m.dividerText}
                                    </span>
                                </div>
                            )}

                            <div className={cn("flex items-end gap-2", m.mine ? "justify-end" : "justify-start")}>
                                {!m.mine && (
                                    <img src={chat.avatar} alt="" className="size-9 self-end rounded-full" />
                                )}

                                {m.mine && m.failed && (
                                    <button
                                        type="button"
                                        onClick={() => onRetry?.(m.id)}
                                        className="mb-1 text-[11px] font-medium text-destructive hover:underline"
                                    >
                                        Gửi lại
                                    </button>
                                )}

                                <div
                                    className={cn(
                                        "flex flex-col max-w-[80%] text-base md:max-w-[60%]",
                                        // 🆕 Nếu CHỈ LÀ ẢNH -> Bỏ padding, bỏ background, bỏ shadow của bong bóng
                                        !isOnlyImage && "rounded-2xl px-4 py-2.5 shadow-sm",
                                        !isOnlyImage && (m.mine ? "bg-primary/20 text-foreground" : "bg-background"),
                                        m.pending && "opacity-60"
                                    )}
                                >
                                    {!m.mine && (
                                        <div className="mb-1 text-[13px] font-medium text-muted-foreground/60">
                                            {m.sender}
                                        </div>
                                    )}

                                    {/* 🆕 Ảnh: Nếu chỉ là ảnh thì bo góc to (rounded-2xl), nếu có text thì bo góc nhỏ (rounded-lg) */}
                                    {m.imgURL && (
                                        <img
                                            src={m.imgURL}
                                            alt="Ảnh"
                                            className={cn(
                                                "w-full object-cover shadow-sm",
                                                isOnlyImage
                                                    ? "max-h-[300px] rounded-2xl"
                                                    : "max-h-60 mb-1 rounded-lg"
                                            )}
                                            loading="lazy"
                                        />
                                    )}

                                    {m.text && (
                                        <p className="wrap-break-word text-foreground">{m.text}</p>
                                    )}


                                </div>
                            </div>
                        </Fragment>
                    );
                })}
            </div>

            <ChatInput onSend={onSend} onUpload={onUpload} disabled={inputDisabled} />
        </div>
    );
};

export default ChatWindow;
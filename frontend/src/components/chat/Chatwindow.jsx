// src/components/chat/ChatWindow.jsx
import { Fragment, useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { MessageSquare, X } from "lucide-react";
import { cn } from "cn";
import ChatInput from "./ChatInput";
import ChatWindowHeader from "./ChatWindowHeader";
import MessageItem from "./MessageItem"; // 🆕 Import file mới tạo

const SCROLL_THRESHOLD = 80;

const ChatWindow = ({ chat, messages, onBack, onSend, onRetry, onUpload, sending, uploading, onLoadMore, hasMore, loading, className }) => {
    const listRef = useRef(null);
    const prevScrollHeightRef = useRef(0);
    const firstLoadRef = useRef(true);
    const lastMsgIdRef = useRef(null);
    const isStickyBottomRef = useRef(true);

    const [selectedImage, setSelectedImage] = useState(null);

    // 🆕 Tách hàm onLoad của ảnh ra đây để truyền xuống Component con
    const handleImageLoad = useCallback(() => {
        if (isStickyBottomRef.current && listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, []);

    // 1) Load more khi gần top + Cập nhật trạng thái Sticky Bottom
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

                {/* 🆕 GỌN GÀNG HƠN RẤT NHIỀU NHỜ TÁCH COMPONENT */}
                {messages.map((m) => (
                    <Fragment key={m.id}>
                        {m.dividerText && (
                            <div className="flex justify-center my-4">
                                <span className="rounded-full bg-muted-foreground/10 px-3 py-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                    {m.dividerText}
                                </span>
                            </div>
                        )}

                        <MessageItem
                            m={m}
                            chat={chat}
                            onRetry={onRetry}
                            setSelectedImage={setSelectedImage}
                            onImageLoad={handleImageLoad}
                        />
                    </Fragment>
                ))}
            </div>

            <ChatInput onSend={onSend} onUpload={onUpload} disabled={inputDisabled} />

            {/* Modal xem ảnh */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    <button
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
                    >
                        <X className="size-6" />
                    </button>
                    <img
                        src={selectedImage}
                        alt="Xem ảnh"
                        className="max-h-full max-w-full object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};

export default ChatWindow;
// src/components/chat/MessageItem.jsx
import React from "react";
import { cn } from "cn";

// 🆕 Bọc React.memo: Nếu props không đổi, Component này sẽ KHÔNG render lại
const MessageItem = React.memo(({ m, chat, onRetry, setSelectedImage, onImageLoad, onAvatarClick }) => {
    // Kiểm tra xem tin nhắn chỉ có ảnh hay chỉ có emoji
    const isOnlyImage = m.imgURL && !m.text;
    const emojiRegex = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\s)+$/u;
    const isOnlyEmoji = m.text && emojiRegex.test(m.text.trim()) && m.text.trim().length <= 6;

    if (m.type === "system") {
        return (
            <div className="my-1 flex justify-center">
                <span className="rounded-full bg-muted-foreground/10 px-3 py-1 text-xs text-muted-foreground">
                    {m.text}
                </span>
            </div>
        );
    }

    return (
        <div className={cn("flex items-end gap-2", m.mine ? "justify-end" : "justify-start")}>
            {!m.mine && (
                <img src={m.senderAvatar || chat.avatar} alt=""
                    onClick={() => onAvatarClick?.(m)}
                    className="size-9 shrink-0 cursor-pointer self-end rounded-full object-cover hover:opacity-80"
                />
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
                    !isOnlyImage && !isOnlyEmoji && "rounded-2xl px-4 py-2.5 shadow-sm",
                    !isOnlyImage && !isOnlyEmoji && (m.mine ? "bg-primary/20 text-foreground" : "bg-background"),
                    m.pending && "opacity-60"
                )}
            >
                {!m.mine && chat.isGroup && (
                    <div className="mb-1 text-[13px] font-medium text-muted-foreground/60">
                        {m.sender}
                    </div>
                )}

                {/* Render Ảnh */}
                {m.imgURL && (
                    <div className={cn(
                        "relative w-fit max-w-full flex justify-center",
                        isOnlyImage ? "max-h-[300px]" : "max-h-60 mb-1"
                    )}>
                        <img
                            src={m.imgURL}
                            alt="Ảnh"
                            onClick={() => setSelectedImage(m.imgURL)}
                            onLoad={onImageLoad} // �u Nhận hàm xử lý cuộn từ file Cha
                            className={cn(
                                "max-h-[300px] max-w-full object-contain shadow-sm cursor-pointer hover:opacity-90 transition-opacity",
                                isOnlyImage ? "rounded-2xl" : "rounded-lg",
                                m.pending && "opacity-50 blur-[1px]"
                            )}
                            loading="lazy"
                        />
                        {m.pending && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="size-7 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
                            </div>
                        )}
                    </div>
                )}

                {/* Render Chữ / Emoji */}
                {m.text && (
                    <p className={cn(
                        "wrap-break-word text-foreground",
                        isOnlyEmoji && "text-4xl"
                    )}>
                        {m.text}
                    </p>
                )}
            </div>
        </div>
    );
});

export default MessageItem;
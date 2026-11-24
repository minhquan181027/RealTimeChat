// src/components/chat/MessageItem.jsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { systemText } from "@/utils/systemMessage";
import { Copy, Download, Ellipsis, Languages, RotateCcw, Smile } from "lucide-react";
import { useChatStore } from "@/stores/useChatStore";
import { toast } from "sonner";

const MessageItem = React.memo(({
    m,
    chat,
    isLastMessage,
    sameSenderPrev,
    sameSenderNext,
    onRetry,
    setSelectedImage,
    onImageLoad,
    onAvatarClick,
    gifPreviewUrl,
    gifMediaUrl,
}) => {
    const { t } = useTranslation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [reactionOpen, setReactionOpen] = useState(false);
    const [showOriginal, setShowOriginal] = useState(false);

    const displayedText = !m.mine && m.translation && !showOriginal ? m.translation : m.text;
    const isOnlyImage = (m.imgURL || m.type === "gif") && !m.text;
    const emojiRegex = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\s)+$/u;
    const isOnlyEmoji = displayedText && emojiRegex.test(displayedText.trim()) && displayedText.trim().length <= 6;

    if (m.type === "system") {
        return (
            <div className="my-1 flex justify-center">
                <span className="rounded-full bg-muted-foreground/10 px-3 py-1 text-xs text-muted-foreground">
                    {systemText(t, m.meta, m.text)}
                </span>
            </div>
        );
    }

    const copyText = async () => {
        if (!m.text) return;
        try {
            await navigator.clipboard.writeText(m.text);
            toast.success(t("chatWindow.copied"));
        } catch {
            toast.error(t("chatWindow.copyFailed"));
        }
        setMenuOpen(false);
    };

    const copyImage = async () => {
        if (!m.imgURL) return;
        try {
            const response = await fetch(m.imgURL);
            const blob = await response.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type || "image/png"]: blob }),
            ]);
            toast.success(t("chatWindow.copied"));
        } catch {
            toast.error(t("chatWindow.copyImageFailed"));
        }
        setMenuOpen(false);
    };

    const downloadImage = async () => {
        if (!m.imgURL) return;
        try {
            const response = await fetch(m.imgURL);
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = objectUrl;
            link.download = `chat-image-${m.id}.${blob.type.includes("png") ? "png" : "jpg"}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(objectUrl);
        } catch {
            toast.error(t("chatWindow.downloadFailed"));
        }
        setMenuOpen(false);
    };

    const handleTranslate = async () => {
        if (showOriginal) {
            setShowOriginal(false);
            setMenuOpen(false);
            return;
        }
        if (m.translation) {
            setShowOriginal(true);
            setMenuOpen(false);
            return;
        }
        const result = await useChatStore.getState().translateMessage(m.id);
        if (result) {
            useChatStore.getState().applyTranslation(result);
            setShowOriginal(false);
        }
        setMenuOpen(false);
    };

    const handleReaction = (emoji) => {
        useChatStore.getState().reactToMessage(m.id, emoji);
        setReactionOpen(false);
    };

    const reactions = m.reactions && typeof m.reactions === "object"
        ? Object.entries(m.reactions).filter(([, ids]) => Array.isArray(ids) && ids.length)
        : [];

    const mediaUrl = m.imgURL || gifPreviewUrl;
    const hasTextBubble = !!m.recalledAt || (!isOnlyImage && !isOnlyEmoji);
    const bubbleCorners = cn(
        hasTextBubble && "rounded-2xl",
        !m.recalledAt && !m.mine && sameSenderPrev && "rounded-tl-md",
        !m.recalledAt && !m.mine && sameSenderNext && "rounded-bl-md",
        !m.recalledAt && m.mine && sameSenderPrev && "rounded-tr-md",
        !m.recalledAt && m.mine && sameSenderNext && "rounded-br-md"
    );

    return (
        <div className={cn(
            "group/message relative flex w-full items-end gap-2",
            m.mine ? "justify-end" : "justify-start",
            sameSenderPrev && "-mt-2"
        )}>
            {!m.mine && (
                sameSenderNext ? (
                    <div className="size-9 shrink-0" />
                ) : (
                    <img
                        src={m.senderAvatar || chat.avatar}
                        alt=""
                        onClick={() => onAvatarClick?.(m)}
                        className="size-9 shrink-0 cursor-pointer self-end rounded-full object-cover hover:opacity-80"
                    />
                )
            )}

            {m.mine && m.failed && (
                <button
                    type="button"
                    onClick={() => onRetry?.(m.id)}
                    className="mb-1 text-[11px] font-medium text-destructive hover:underline"
                >
                    {t("chatWindow.retry")}
                </button>
            )}

            <div className={cn("flex max-w-[80%] flex-col md:max-w-[60%]", m.mine ? "items-end" : "items-start")}>
                <div className="group/bubble relative w-fit max-w-full">
                    {!m.recalledAt && (
                        <div className={cn(
                            "absolute bottom-0 z-30 hidden items-center gap-1 group-hover/message:flex group-focus-within/message:flex",
                            m.mine ? "right-full mr-2" : "left-full ml-2"
                        )}>
                            <div className="relative">
                                <button
                                    type="button"
                                    title={t("chatWindow.react")}
                                    onClick={() => setReactionOpen((v) => !v)}
                                    className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                                >
                                    <Smile className="size-4" />
                                </button>
                                {reactionOpen && (
                                    <div className="absolute bottom-full left-0 mb-1 flex gap-1 rounded-lg border bg-background p-1 shadow-lg">
                                        {["👍", "❤️", "😂", "😮", "😢", "😡"].map((emoji) => (
                                            <button
                                                key={emoji}
                                                type="button"
                                                onClick={() => handleReaction(emoji)}
                                                className="size-7 rounded-full text-base hover:bg-muted"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="relative">
                                <button
                                    type="button"
                                    title={t("chatWindow.more")}
                                    onClick={() => setMenuOpen((v) => !v)}
                                    className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                                >
                                    <Ellipsis className="size-4" />
                                </button>
                                {menuOpen && (
                                    <div className={cn(
                                        "absolute z-40 min-w-44 rounded-lg border bg-background p-1 shadow-xl",
                                        isLastMessage ? "bottom-full mb-1" : "top-full mt-1",
                                        m.mine ? "right-0" : "left-0"
                                    )}>
                                        {m.text && (
                                            <button type="button" onClick={copyText} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted">
                                                <Copy className="size-4" /> {t("chatWindow.copyMessage")}
                                            </button>
                                        )}
                                        {m.mine ? (
                                            <button type="button" onClick={() => useChatStore.getState().recallMessage(m.id)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-muted">
                                                <RotateCcw className="size-4" /> {t("chatWindow.recall")}
                                            </button>
                                        ) : (
                                            <>
                                                {m.imgURL && (
                                                    <>
                                                        <button type="button" onClick={copyImage} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted">
                                                            <Copy className="size-4" /> {t("chatWindow.copyImage")}
                                                        </button>
                                                        <button type="button" onClick={downloadImage} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted">
                                                            <Download className="size-4" /> {t("chatWindow.saveImage")}
                                                        </button>
                                                    </>
                                                )}
                                                {m.text && (
                                                    <button type="button" onClick={handleTranslate} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted">
                                                        <Languages className="size-4" />
                                                        {m.translation && !showOriginal ? t("chatWindow.viewOriginal") : t("chatWindow.translate")}
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div
                        className={cn(
                            "flex w-fit max-w-full flex-col text-base",
                            bubbleCorners,
                            hasTextBubble && "px-4 py-2.5",
                            m.recalledAt
                                ? "border border-border/70 bg-transparent shadow-sm"
                                : hasTextBubble && (m.mine ? "bg-primary/20 text-foreground shadow-sm" : "bg-background shadow-sm"),
                            m.pending && "opacity-60"
                        )}
                    >
                        {m.recalledAt ? (
                            <p className="italic text-muted-foreground">{t("chatWindow.recalled")}</p>
                        ) : (
                            <>
                                {!m.mine && chat.isGroup && !sameSenderPrev && (
                                    <div className="mb-1 text-[13px] font-medium text-muted-foreground">{m.sender}</div>
                                )}

                                {mediaUrl && (
                                    <div className={cn(
                                        "relative flex w-fit max-w-full justify-center",
                                        isOnlyImage ? "max-h-[300px]" : "mb-1 max-h-60"
                                    )}>
                                        <img
                                            src={mediaUrl}
                                            alt={m.type === "gif" ? "GIF" : t("chatWindow.imageAlt")}
                                            onClick={() => setSelectedImage(m.type === "gif" ? (gifMediaUrl || mediaUrl) : mediaUrl)}
                                            onLoad={onImageLoad}
                                            className={cn(
                                                "max-h-[300px] max-w-full cursor-pointer object-contain shadow-sm transition-opacity hover:opacity-90",
                                                m.type === "gif" && "w-40",
                                                isOnlyImage ? cn(
                                                    "rounded-2xl",
                                                    !m.mine && sameSenderPrev && "rounded-tl-md",
                                                    !m.mine && sameSenderNext && "rounded-bl-md",
                                                    m.mine && sameSenderPrev && "rounded-tr-md",
                                                    m.mine && sameSenderNext && "rounded-br-md"
                                                ) : "rounded-lg",
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
                                {m.type === "gif" && !mediaUrl && (
                                    <div className="flex h-28 w-40 items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
                                        GIF
                                    </div>
                                )}
                                {m.type === "gif" && (
                                    <a
                                        href="https://giphy.com"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-1 self-end text-[10px] font-medium text-muted-foreground hover:text-foreground"
                                    >
                                        Powered By GIPHY
                                    </a>
                                )}

                                {displayedText && (
                                    <p className={cn("wrap-break-word text-foreground", isOnlyEmoji && "text-4xl")}>
                                        {displayedText}
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                    {!m.recalledAt && reactions.length > 0 && (
                        <div className="absolute -bottom-2.5 right-2 z-10 flex items-center gap-0.5 rounded-full border bg-background/95 px-1.5 py-0.5 shadow-sm">
                            {reactions.map(([emoji, ids]) => (
                                <span key={emoji} className="text-xs leading-none" title={`${ids.length}`}>
                                    {emoji} {ids.length > 1 ? ids.length : ""}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

export default MessageItem;
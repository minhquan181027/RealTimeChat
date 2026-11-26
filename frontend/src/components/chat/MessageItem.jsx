// src/components/chat/MessageItem.jsx
import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { systemText } from "@/utils/systemMessage";
import { Copy, Download, Ellipsis, Languages, Pause, Phone, PhoneOff, Play, RotateCcw, Smile } from "lucide-react";
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
    onCallAgain,
    gifPreviewUrl,
    gifMediaUrl,
}) => {
    const { t } = useTranslation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [reactionOpen, setReactionOpen] = useState(false);
    const [showOriginal, setShowOriginal] = useState(false);
    const [audioPlaying, setAudioPlaying] = useState(false);
    const [audioCurrentTime, setAudioCurrentTime] = useState(0);
    const [mediaDuration, setMediaDuration] = useState(m.audioDuration || 0);
    const audioRef = useRef(null);

    const displayedText = !m.mine && m.translation && !showOriginal ? m.translation : m.text;
    const isOnlyImage = (m.imgURL || m.type === "gif") && !m.text;
    const isOnlyMedia = (m.imgURL || m.audioURL || m.type === "gif") && !m.text;
    const emojiRegex = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\s)+$/u;
    const isOnlyEmoji = displayedText && emojiRegex.test(displayedText.trim()) && displayedText.trim().length <= 6;

    if (m.type === "system" && m.meta?.action === "call_history") {
        const status = m.meta.status;
        const missed = ["missed", "rejected", "cancelled"].includes(status);

        const duration = Math.max(0, Math.floor(m.meta.duration || 0));
        const durationText = duration >= 60
            ? t("call.durationMinutes", {
                minutes: Math.floor(duration / 60),
                seconds: duration % 60,
            })
            : t("call.durationSeconds", { seconds: duration });
        const title = status === "missed"
            ? t("call.missedTitle")
            : status === "rejected"
                ? t("call.rejected")
                : status === "cancelled"
                    ? t("call.cancelled")
                    : t("call.videoCall");

        return (
            <div className={cn("my-1 flex w-full items-end gap-2", m.mine ? "justify-end" : "justify-start")}>
                {!m.mine && (
                    <img
                        src={m.senderAvatar || chat.avatar}
                        alt=""
                        className="size-9 shrink-0 rounded-full object-cover"
                    />
                )}
                <div className="w-60 max-w-[80%] rounded-2xl bg-muted p-2.5 text-foreground shadow-sm">
                    <div className="flex items-center gap-2.5">
                        <div className={cn(
                            "flex size-11 shrink-0 items-center justify-center rounded-full text-white",
                            !missed && "bg-primary"
                        )} style={missed ? { backgroundColor: "#ef4444" } : undefined}>
                            {missed ? <PhoneOff className="size-5" /> : <Phone className="size-5" />}
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{title}</p>
                            <p className="text-xs text-muted-foreground">
                                {status === "completed" ? durationText : m.time}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => onCallAgain?.(m)}
                        disabled={!onCallAgain}
                        className="mt-2 w-full rounded-lg bg-background/70 px-3 py-2 text-sm font-semibold hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {t("call.callAgain")}
                    </button>
                </div>
            </div>
        );
    }

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

    const toggleAudioPlayback = async () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (audio.paused) {
            try {
                await audio.play();
            } catch {
                toast.error(t("chatWindow.audioPlaybackFailed"));
            }
        } else {
            audio.pause();
        }
    };

    const seekAudio = (event) => {
        if (!audioRef.current || !mediaDuration) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
        audioRef.current.currentTime = ratio * mediaDuration;
        setAudioCurrentTime(audioRef.current.currentTime);
    };

    const handleAudioSeekKeyDown = (event) => {
        if (!audioRef.current || !mediaDuration) return;
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const offset = event.key === "ArrowRight" ? 5 : -5;
        audioRef.current.currentTime = Math.min(mediaDuration, Math.max(0, audioRef.current.currentTime + offset));
        setAudioCurrentTime(audioRef.current.currentTime);
    };

    const formatAudioTime = (seconds) => {
        const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
        const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
        return `${minutes}:${remainder}`;
    };

    const reactions = m.reactions && typeof m.reactions === "object"
        ? Object.entries(m.reactions).filter(([, ids]) => Array.isArray(ids) && ids.length)
        : [];

    const mediaUrl = m.imgURL || gifPreviewUrl;
    const hasTextBubble = !!m.recalledAt || (!isOnlyMedia && !isOnlyEmoji);
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
                            "absolute bottom-0 z-30 flex items-center gap-1 [@media(hover:hover)]:hidden [@media(hover:hover)]:group-hover/message:flex [@media(hover:hover)]:group-focus-within/message:flex",
                            m.mine ? "right-full mr-2" : "left-full ml-2"
                        )}>
                            <div className="relative">
                                <button
                                    type="button"
                                    title={t("chatWindow.react")}
                                    aria-label={t("chatWindow.react")}
                                    aria-expanded={reactionOpen}
                                    onClick={() => setReactionOpen((v) => !v)}
                                    className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                                >
                                    <Smile className="size-4" />
                                </button>
                                {reactionOpen && (
                                    <div className={cn(
                                        "absolute bottom-full z-40 mb-1 flex gap-1 rounded-lg border bg-background p-1 shadow-lg",
                                        m.mine ? "left-0" : "right-0"
                                    )}>
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
                                            !m.pending && !m.failed && !String(m.id).startsWith("temp-") && (
                                                <button type="button" onClick={() => useChatStore.getState().recallMessage(m.id)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-muted">
                                                    <RotateCcw className="size-4" /> {t("chatWindow.recall")}
                                                </button>
                                            )
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
                                : m.type === "audio" && !m.recalledAt
                                    ? cn("rounded-2xl px-3 py-2 shadow-sm", m.mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")
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

                                {m.type === "audio" && m.audioURL && (
                                    <div className="flex w-56 max-w-full items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={toggleAudioPlayback}
                                            title={audioPlaying ? t("chatWindow.pauseAudio") : t("chatWindow.playAudio")}
                                            className="flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-black/10"
                                        >
                                            {audioPlaying ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
                                        </button>
                                        <div className="min-w-0 flex-1">
                                            <div
                                                role="slider"
                                                tabIndex={0}
                                                aria-label={t("chatWindow.seekAudio")}
                                                aria-valuemin={0}
                                                aria-valuemax={mediaDuration || 0}
                                                aria-valuenow={audioCurrentTime}
                                                onClick={seekAudio}
                                                onKeyDown={handleAudioSeekKeyDown}
                                                className="flex h-8 cursor-pointer items-center gap-[2px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            >
                                                {Array.from({ length: 28 }, (_, index) => {
                                                    const progress = mediaDuration ? audioCurrentTime / mediaDuration : 0;
                                                    const height = 5 + ((index * 17 + 11) % 18);
                                                    return (
                                                        <span
                                                            key={index}
                                                            className={cn(
                                                                "min-w-[2px] flex-1 rounded-full",
                                                                index / 28 <= progress ? "bg-current" : "bg-current/40"
                                                            )}
                                                            style={{ height }}
                                                        />
                                                    );
                                                })}
                                            </div>
                                            <audio
                                                ref={audioRef}
                                                src={m.audioURL}
                                                preload="metadata"
                                                className="sr-only"
                                                onLoadedMetadata={(event) => {
                                                    if (Number.isFinite(event.currentTarget.duration)) setMediaDuration(event.currentTarget.duration);
                                                }}
                                                onTimeUpdate={(event) => setAudioCurrentTime(event.currentTarget.currentTime)}
                                                onPlay={() => setAudioPlaying(true)}
                                                onPause={() => setAudioPlaying(false)}
                                                onEnded={() => {
                                                    setAudioPlaying(false);
                                                    setAudioCurrentTime(0);
                                                }}
                                                onError={() => toast.error(t("chatWindow.audioPlaybackFailed"))}
                                            />
                                        </div>
                                        <span className="shrink-0 text-[11px] tabular-nums">
                                            {formatAudioTime(audioPlaying ? audioCurrentTime : mediaDuration || m.audioDuration || 0)}
                                        </span>
                                    </div>
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
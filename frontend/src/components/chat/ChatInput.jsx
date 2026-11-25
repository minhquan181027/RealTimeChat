// src/components/chat/ChatInput.jsx
import { useState, useRef, useEffect } from "react";
import { Mic, Paperclip, Smile, Send, Square, ThumbsUp, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import EmojiPickerButton from "./EmojiPickerButton";
import GifPickerButton from "./GifPickerButton";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const ChatInput = ({ onSend, onSendGif, onUpload, onSendAudio, onTyping, disabled = false }) => {
    const [text, setText] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const [audioPreview, setAudioPreview] = useState(null);
    const fileInputRef = useRef(null);
    const inputRef = useRef(null);
    const recorderRef = useRef(null);
    const streamRef = useRef(null);
    const chunksRef = useRef([]);
    const recordingTimerRef = useRef(null);
    const recordingElapsedRef = useRef(0);
    const cancelRecordingRef = useRef(false);
    const previewUrlRef = useRef(null);

    const isTyping = text.trim().length > 0;
    const { t } = useTranslation();

    const onTypingRef = useRef(onTyping);
    const typingRef = useRef(false);
    const lastEmitRef = useRef(0);
    const idleRef = useRef(null);

    useEffect(() => {
        onTypingRef.current = onTyping;
    });

    useEffect(() => () => {
        clearInterval(recordingTimerRef.current);
        cancelRecordingRef.current = true;
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
        streamRef.current?.getTracks().forEach((track) => track.stop());
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    }, []);

    const stopTyping = () => {
        clearTimeout(idleRef.current);
        if (typingRef.current) {
            typingRef.current = false;
            onTypingRef.current?.(false);
        }
    };

    const handleChange = (e) => {
        const value = e.target.value;
        setText(value);

        if (!value.trim()) {
            stopTyping();
            return;
        }

        // Bắn khi bắt đầu gõ, rồi làm mới mỗi 3 giây nếu vẫn đang gõ
        if (!typingRef.current || Date.now() - lastEmitRef.current > 3000) {
            typingRef.current = true;
            lastEmitRef.current = Date.now();
            onTypingRef.current?.(true);
        }

        clearTimeout(idleRef.current);
        idleRef.current = setTimeout(stopTyping, 2000);
    };

    const handleEmojiSelect = (emoji) => {
        const cursor = inputRef.current?.selectionStart || text.length;
        const newText = text.slice(0, cursor) + emoji + text.slice(cursor);
        setText(newText);

        setTimeout(() => {
            inputRef.current?.focus();
            const newCursor = cursor + emoji.length;
            inputRef.current?.setSelectionRange(newCursor, newCursor);
        }, 0);
    };

    const submit = () => {
        if (!isTyping || disabled) return;
        onSend(text.trim());
        onSend(text.trim());
        setText("");
    };

    const stopRecordingStream = () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
    };

    const clearAudioPreview = () => {
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
        setAudioPreview(null);
    };

    const handleStartRecording = async () => {
        if (disabled || isRecording || audioPreview) return;
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
            toast.error(t("chatInput.recordingUnsupported"));
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const supportedMimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
                .find((mimeType) => MediaRecorder.isTypeSupported?.(mimeType));
            const recorder = supportedMimeType
                ? new MediaRecorder(stream, { mimeType: supportedMimeType })
                : new MediaRecorder(stream);

            recorderRef.current = recorder;
            chunksRef.current = [];
            recordingElapsedRef.current = 0;
            cancelRecordingRef.current = false;
            stopTyping();

            recorder.ondataavailable = (event) => {
                if (event.data.size) chunksRef.current.push(event.data);
            };
            recorder.onstop = () => {
                clearInterval(recordingTimerRef.current);
                stopRecordingStream();
                if (cancelRecordingRef.current) return;
                setIsRecording(false);

                const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
                if (!blob.size) {
                    toast.error(t("chatInput.recordingEmpty"));
                    return;
                }

                const extension = blob.type.split("/")[1]?.split(";")[0] || "webm";
                const file = new File([blob], `voice-message.${extension}`, { type: blob.type });
                const previewUrl = URL.createObjectURL(blob);
                previewUrlRef.current = previewUrl;
                setAudioPreview({
                    file,
                    url: previewUrl,
                    duration: recordingElapsedRef.current,
                });
            };
            recorder.onerror = () => {
                cancelRecordingRef.current = true;
                setIsRecording(false);
                toast.error(t("chatInput.recordingFailed"));
                if (recorder.state === "recording") recorder.stop();
            };
            recorder.start();
            setRecordingSeconds(0);
            setIsRecording(true);
            recordingTimerRef.current = setInterval(() => {
                recordingElapsedRef.current += 1;
                setRecordingSeconds(recordingElapsedRef.current);
            }, 1000);
        } catch (error) {
            stopRecordingStream();
            console.error("Không thể bắt đầu ghi âm:", error);
            toast.error(t("chatInput.microphonePermission"));
        }
    };

    const handleStopRecording = () => {
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    };

    const handleCancelRecording = () => {
        cancelRecordingRef.current = true;
        clearInterval(recordingTimerRef.current);
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
        stopRecordingStream();
        setIsRecording(false);
        clearAudioPreview();
    };

    const handleSendAudio = () => {
        if (!audioPreview || disabled) return;
        onSendAudio?.(audioPreview.file, audioPreview.duration);
        clearAudioPreview();
    };

    const formatDuration = (seconds) => {
        const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
        const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
        return `${minutes}:${remainder}`;
    };

    const handleLike = () => {
        if (disabled) return;
        onSend("👍");
    };

    const handleFileClick = () => {
        if (disabled) return;
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        e.target.value = null; // reset để chọn lại cùng file vẫn trigger
        if (!file || disabled) return;

        if (!file.type.startsWith("image/")) {
            alert(t("chatInput.onlyImages"));
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert(t("chatInput.maxSize"));
            return;
        }

        onUpload?.(file);
    };

    return (
        <div className="flex shrink-0 items-center gap-1 border-t bg-background p-2 md:p-3">
            <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
            />

            {isRecording || audioPreview ? (
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-primary px-3 py-2 text-primary-foreground">
                    {isRecording ? (
                        <>
                            <span className="size-2 animate-pulse rounded-full bg-white" />
                            <span className="min-w-12 text-sm tabular-nums">{formatDuration(recordingSeconds)}</span>
                            <span className="flex-1 text-sm">{t("chatInput.recording")}</span>
                            <Button variant="ghost" size="icon" onClick={handleStopRecording} title={t("chatInput.stopRecording")} className="text-primary-foreground hover:bg-white/20 hover:text-white">
                                <Square className="size-4 fill-current" />
                            </Button>
                        </>
                    ) : (
                        <>
                            <audio controls src={audioPreview.url} className="h-9 min-w-0 flex-1" />
                            <Button variant="ghost" size="icon" onClick={handleSendAudio} title={t("chatInput.sendRecording")} disabled={disabled} className="text-primary-foreground hover:bg-white/20 hover:text-white">
                                <Send className="size-4" />
                            </Button>
                        </>
                    )}
                    <Button variant="ghost" size="icon" onClick={handleCancelRecording} title={t("common.cancel")} className="text-primary-foreground hover:bg-white/20 hover:text-white">
                        <X className="size-4" />
                    </Button>
                </div>
            ) : (
                <>
                    {!isTyping && (
                        <Button variant="ghost" size="icon" onClick={handleStartRecording} title={t("chatInput.recordVoice")} disabled={disabled}>
                            <Mic className="size-5" />
                        </Button>
                    )}

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleFileClick}
                        title={t("chatInput.sendImage")}
                        disabled={disabled}
                    >
                        <Paperclip className="size-5" />
                    </Button>

                    <Input
                        value={text}
                        onChange={handleChange}
                        onKeyDown={(e) => e.key === "Enter" && submit()}
                        placeholder={t("chatInput.placeholder")}
                        className="h-10 flex-1 rounded-full border-none bg-muted shadow-none focus-visible:ring-0"
                    />

                    <EmojiPickerButton onEmojiSelect={handleEmojiSelect} disabled={disabled} />
                    <GifPickerButton onGifSelect={onSendGif} disabled={disabled} />

                    {isTyping ? (
                        <Button
                            size="icon"
                            className="rounded-full transition-all duration-200"
                            onClick={submit}
                            title={t("chatInput.send")}
                            disabled={disabled}
                        >
                            <Send className="size-4" />
                        </Button>
                    ) : (
                        <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-full text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50 transition-all duration-200"
                            onClick={handleLike}
                            title={t("chatInput.like")}
                            disabled={disabled}
                        >
                            <ThumbsUp className="size-5" fill="currentColor" />
                        </Button>
                    )}
                </>
            )}
        </div>
    );
};

export default ChatInput;
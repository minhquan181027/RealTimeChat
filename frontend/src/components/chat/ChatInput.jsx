// src/components/chat/ChatInput.jsx
import { useState, useRef, useEffect } from "react";
import { Paperclip, Smile, Send, ThumbsUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import EmojiPickerButton from "./EmojiPickerButton";
import { useTranslation } from "react-i18next";

const ChatInput = ({ onSend, onUpload, onTyping, disabled = false }) => {
    const [text, setText] = useState("");
    const fileInputRef = useRef(null);
    const inputRef = useRef(null);

    const isTyping = text.trim().length > 0;
    const { t } = useTranslation();

    const onTypingRef = useRef(onTyping);
    const typingRef = useRef(false);
    const lastEmitRef = useRef(0);
    const idleRef = useRef(null);

    useEffect(() => {
        onTypingRef.current = onTyping;
    });

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
        </div>
    );
};

export default ChatInput;
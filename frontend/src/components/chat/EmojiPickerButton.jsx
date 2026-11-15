// src/components/chat/EmojiPickerButton.jsx
import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { Smile, Loader2 } from "lucide-react"; // 🆕 Thêm Loader2 để làm vòng xoay
import { Button } from "@/components/ui/button";

// 🆕 Lazy load thư viện Emoji Picker
const EmojiPicker = lazy(() => import("emoji-picker-react"));

const EmojiPickerButton = ({ onEmojiSelect, disabled }) => {
    const [showPicker, setShowPicker] = useState(false);
    const pickerRef = useRef(null);

    // Click ra ngoài để đóng
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target) && !event.target.closest('#emoji-button')) {
                setShowPicker(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative">
            <Button
                id="emoji-button"
                variant="ghost"
                size="icon"

                title="Chọn biểu tượng"
                disabled={disabled}
                onClick={() => setShowPicker((prev) => !prev)}
            >
                <Smile className="size-5" />
            </Button>

            {showPicker && (
                <div ref={pickerRef} className="absolute bottom-full right-0 mb-2 z-50 shadow-lg">
                    {/* 🆕 Bọc trong Suspense để hiển thị loading trong lúc tải thư viện */}
                    <Suspense
                        fallback={
                            <div className="flex h-[400px] w-[320px] items-center justify-center bg-background rounded-lg border shadow-xl">
                                <Loader2 className="size-6 animate-spin text-muted-foreground" />
                            </div>
                        }
                    >
                        <EmojiPicker
                            onEmojiClick={(emojiObj) => {
                                onEmojiSelect(emojiObj.emoji);
                            }}
                            theme="auto"
                            width={320}
                            height={400}
                        />
                    </Suspense>
                </div>
            )}
        </div>
    );
};

export default EmojiPickerButton;
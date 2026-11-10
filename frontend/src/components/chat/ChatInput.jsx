// src/components/chat/ChatInput.jsx
import { useState, useRef } from "react";
import { Paperclip, Smile, Send, ThumbsUp } from "lucide-react"; // Thêm ThumbsUp
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ChatInput = ({ onSend }) => {
    const [text, setText] = useState("");
    const fileInputRef = useRef(null);

    // Kiểm tra xem người dùng đã gõ chữ chưa (xóa khoảng trắng 2 đầu)
    const isTyping = text.trim().length > 0;

    const submit = () => {
        if (!isTyping) return;
        onSend(text.trim());
        setText(""); // Reset ô nhập sau khi gửi
    };

    // Hàm xử lý khi bấm nút Like (khi ô nhập rỗng)
    const handleLike = () => {
        onSend("👍"); // Gửi icon like dưới dạng text
    };

    // Kích hoạt hộp thoại chọn file
    const handleFileClick = () => {
        fileInputRef.current?.click();
    };

    // Xử lý khi chọn file
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            console.log("File đã chọn:", file);
            // Xử lý upload file ở đây
        }
        e.target.value = null;
    };

    return (
        <div className="flex shrink-0 items-center gap-1 border-t bg-background p-2 md:p-3">
            {/* Input file ẩn */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
            />

            <Button
                variant="ghost"
                size="icon"
                className="hidden sm:inline-flex"
                onClick={handleFileClick}
                title="Gửi file"
            >
                <Paperclip className="size-5" />
            </Button>

            <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Nhập tin nhắn..."
                className="h-10 flex-1 rounded-full border-none bg-muted shadow-none focus-visible:ring-0"
            />

            <Button variant="ghost" size="icon" className="hidden sm:inline-flex" title="Chọn biểu tượng">
                <Smile className="size-5" />
            </Button>

            {/* LOGIC ĐỔI NÚT Ở ĐÂY */}
            {isTyping ? (
                // Nếu đang gõ chữ -> Hiện nút Gửi
                <Button
                    size="icon"
                    className="rounded-full transition-all duration-200"
                    onClick={submit}
                    title="Gửi"
                >
                    <Send className="size-4" />
                </Button>
            ) : (
                // Nếu ô nhập rỗng -> Hiện nút Like (Màu vàng rực rỡ)
                <Button
                    size="icon"
                    variant="ghost"
                    // Đổi text-yellow-500 để icon vàng óng
                    // Đổi hover:bg-yellow-50 để khi hover vào có nền vàng nhạt
                    className="rounded-full text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50 transition-all duration-200"
                    onClick={handleLike}
                    title="Thích"
                >
                    {/* fill="currentColor" sẽ tự động lấy màu vàng ở trên tô đầy vào ruột icon */}
                    <ThumbsUp className="size-5" fill="currentColor" />
                </Button>
            )}
        </div>
    );
};

export default ChatInput;
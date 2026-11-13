// src/components/chat/ChatWindow.jsx
import {
    MessageSquare,
    Video,
    MoreVertical,
    ChevronLeft,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import ChatInput from "./ChatInput";
import ChatWindowHeader from "./ChatWindowHeader";

const ChatWindow = ({ chat, messages, onBack, onSend, className }) => {
    // Đã xóa state text, setText và hàm submit ở đây vì đã chuyển vào ChatInput

    // Chưa chọn chat (PC) -> màn hình chào
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

    return (
        <div className={cn("min-w-0 flex-1 flex-col bg-muted/40", className)}>
            {/* Header */}
            <ChatWindowHeader chat={chat} onBack={onBack} />

            {/* Tin nhắn */}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((m) => (
                    <div key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start gap-2")}>
                        {!m.mine && <img src={chat.avatar} alt="" className="size-9 self-end rounded-full" />}
                        <div
                            className={cn(
                                "max-w-[80%] rounded-2xl px-4 py-2.5 text-base shadow-sm md:max-w-[60%]",
                                m.mine ? "bg-primary/20 text-foreground" : "bg-background"
                            )}
                        >
                            {!m.mine && (
                                <div className="mb-1 text-[13px] font-medium text-muted-foreground/60">
                                    {m.sender}
                                </div>
                            )}

                            <p className="wrap-break-word text-foreground">{m.text}</p>
                            <div className="mt-1 text-[11px] text-muted-foreground/70 text-right">{m.time}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Ô nhập - Đã tách thành component riêng */}
            <ChatInput onSend={onSend} />
        </div>
    );
};

export default ChatWindow;
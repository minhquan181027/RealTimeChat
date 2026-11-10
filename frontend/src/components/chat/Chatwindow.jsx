// src/components/chat/ChatWindow.jsx
import {
    MessageSquare,
    Video,
    MoreVertical,
    ChevronLeft,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import ChatInput from "./ChatInput"; // Import component mới

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
            <div className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-3 md:px-4">
                <div className="flex min-w-0 items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
                        <ChevronLeft className="size-6" />
                    </Button>
                    <img src={chat.avatar} alt="" className="hidden size-10 rounded-full object-cover sm:block" />
                    <h2 className="truncate text-sm font-semibold md:text-base">{chat.name}</h2>
                </div>
                <div className="flex gap-1 text-muted-foreground">
                    <Button variant="ghost" size="icon" className="hidden sm:inline-flex"><Video className="size-5" /></Button>
                    <Button variant="ghost" size="icon"><MoreVertical className="size-5" /></Button>
                </div>
            </div>

            {/* Tin nhắn */}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((m) => (
                    <div key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start gap-2")}>
                        {!m.mine && <img src={chat.avatar} alt="" className="size-9 self-end rounded-full" />}
                        <div
                            className={cn(
                                "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm md:max-w-[60%]",
                                m.mine ? "bg-primary/20 text-foreground" : "bg-background"
                            )}
                        >
                            {!m.mine && (
                                <div className="mb-1 text-[11px] font-medium text-muted-foreground/60">
                                    {m.sender}
                                </div>
                            )}

                            <p className="wrap-break-word text-foreground">{m.text}</p>
                            <div className="mt-1 text-[10px] text-muted-foreground/70 text-right">{m.time}</div>
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
// src/components/chat/ChatWindow.jsx
import { useState } from "react";
import {
    MessageSquare,
    Phone,
    Video,
    MoreVertical,
    ChevronLeft,
    Paperclip,
    Smile,
    Send,
} from "lucide-react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ChatWindow = ({ chat, messages, onBack, onSend, className }) => {
    const [text, setText] = useState("");

    const submit = () => {
        if (!text.trim()) return;
        onSend(text.trim());
        setText("");
    };

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
                            {!m.mine && <div className="mb-0.5 text-xs text-muted-foreground">{m.sender}</div>}
                            <p className="break-words">{m.text}</p>
                            <div className="mt-1 text-[11px] text-muted-foreground">{m.time}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Ô nhập */}
            <div className="flex shrink-0 items-center gap-1 border-t bg-background p-2 md:p-3">
                <Button variant="ghost" size="icon" className="hidden sm:inline-flex"><Paperclip className="size-5" /></Button>
                <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    placeholder={`Nhập tin nhắn tới ${chat.name}`}
                    className="h-10 flex-1 rounded-full border-none bg-muted shadow-none focus-visible:ring-0"
                />
                <Button variant="ghost" size="icon" className="hidden sm:inline-flex"><Smile className="size-5" /></Button>
                <Button size="icon" className="rounded-full" onClick={submit}><Send className="size-4" /></Button>
            </div>
        </div>
    );
};

export default ChatWindow;
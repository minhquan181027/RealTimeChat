// src/pages/ChatAppPage.jsx
import React, { useState } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AppSidebar from "@/components/chat/AppSidebar";
import ChatList from "@/components/chat/Chatlist";
import ChatWindow from "@/components/chat/Chatwindow";
import { CHATS, INIT_MESSAGES } from "@/components/data/Chatdata";

const ChatAppPage = () => {
    // null = chưa mở chat nào (mobile hiện danh sách, PC hiện màn hình chào)
    const [activeId, setActiveId] = useState(null);
    const [messages, setMessages] = useState(INIT_MESSAGES);

    const activeChat = CHATS.find((c) => c.id === activeId) ?? null;

    const handleSend = (text) => {
        setMessages((prev) => ({
            ...prev,
            [activeId]: [
                ...(prev[activeId] ?? []),
                {
                    id: Date.now(),
                    mine: true,
                    text,
                    time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
                },
            ],
        }));
    };

    return (
        <SidebarProvider defaultOpen={false} className="h-svh overflow-hidden">
            <AppSidebar />

            <SidebarInset className="min-w-0 flex-row overflow-hidden">
                {/* Mobile: có chat đang mở thì ẩn list. PC: luôn hiện */}
                <ChatList
                    activeId={activeId}
                    onSelect={setActiveId}
                    className={activeId ? "hidden md:flex" : "flex"}
                />

                {/* Mobile: chưa mở chat thì ẩn khung chat. PC: luôn hiện */}
                <ChatWindow
                    chat={activeChat}
                    messages={messages[activeId] ?? []}
                    onBack={() => setActiveId(null)}
                    onSend={handleSend}
                    className={activeId ? "flex" : "hidden md:flex"}
                />
            </SidebarInset>
        </SidebarProvider>
    );
};

export default ChatAppPage;
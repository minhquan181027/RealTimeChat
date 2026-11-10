// src/pages/ChatAppPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AppSidebar from "@/components/chat/SideBar";
import ChatList from "@/components/chat/ChatList";
import ChatWindow from "@/components/chat/ChatWindow";
import { useChatStore } from "@/stores/useChatStore";
import { useAuthStore } from "@/stores/useAuthStore";

const ChatAppPage = () => {
    const [activeId, setActiveId] = useState(null);

    // Lấy dữ liệu từ Store
    const { conversations, messages, fetchMessages } = useChatStore();
    const currentUser = useAuthStore((state) => state.user);

    // 1. Gọi API lấy tin nhắn khi user click vào conversation
    useEffect(() => {
        if (activeId) {
            fetchMessages(activeId);
        }
    }, [activeId, fetchMessages]);

    // 2. Lấy thông tin conversation đang active để truyền cho ChatWindow
    const activeConversation = conversations.find((c) => c._id === activeId);

    const activeChat = useMemo(() => {
        if (!activeConversation) return null;

        let name, avatar;
        if (activeConversation.type === "group") {
            name = activeConversation.group?.name || "Nhóm không tên";
            avatar = activeConversation.group?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
        } else {
            const otherUser = activeConversation.participants.find(
                (p) => p._id?.toString() !== currentUser?._id?.toString()
            );
            name = otherUser?.displayName || "Người dùng ẩn";
            avatar = otherUser?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
        }
        return { id: activeConversation._id, name, avatar };
    }, [activeConversation, currentUser]);

    // 3. Map dữ liệu tin nhắn từ Backend sang format của ChatWindow
    const chatMessages = useMemo(() => {
        const rawMessages = messages[activeId] || [];

        return rawMessages.map((m) => {
            const isMine = m.senderId?._id?.toString() === currentUser?._id?.toString();
            return {
                id: m._id,
                mine: isMine,
                text: m.content || "",
                sender: m.senderId?.displayName || "Ai đó",
                time: new Date(m.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
            };
        });
    }, [messages, activeId, currentUser]);

    // Hàm gửi tin nhắn (Tạm thời vẫn dùng state cục bộ hoặc bro có thể viết thêm API gửi tin nhắn sau)
    const handleSend = (text) => {
        // Nếu bro muốn gửi tin nhắn thật, hãy gọi API ở đây và update lại store
        // Hiện tại mình sẽ log ra để bro biết nó chạy đúng
        console.log("Gửi tin nhắn:", text, "tới conversation:", activeId);

        // Mẹo nhỏ: Nếu muốn hiển thị ngay lập tức (Optimistic UI) thì có thể push tạm vào store
        // useChatStore.setState((state) => ({
        //     messages: {
        //         ...state.messages,
        //         [activeId]: [...(state.messages[activeId] || []), {
        //             _id: Date.now().toString(),
        //             senderId: currentUser,
        //             content: text,
        //             createdAt: new Date().toISOString()
        //         }]
        //     }
        // }))
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
                    messages={chatMessages} // Truyền mảng đã được map
                    onBack={() => setActiveId(null)}
                    onSend={handleSend}
                    className={activeId ? "flex" : "hidden md:flex"}
                />
            </SidebarInset>
        </SidebarProvider>
    );
};

export default ChatAppPage;
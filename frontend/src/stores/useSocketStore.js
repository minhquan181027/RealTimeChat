// src/stores/useSocketStore.js
import { create } from 'zustand';
import { io } from 'socket.io-client';
import { useAuthStore } from './useAuthStore';
import { useChatStore } from './useChatStore';
import { useFriendStore } from './useFriendStore';
import { useCallStore } from './useCallStore';

const baseURL = import.meta.env.VITE_SOCKET_URL;

export const useSocketStore = create((set, get) => ({
    socket: null,
    onlineUsers: [], // Lưu danh sách ID những người đang online

    connectSocket: () => {
        const accessToken = useAuthStore.getState().accessToken;

        if (!accessToken) {
            console.warn('Chưa có accessToken, không thể kết nối socket');
            return;
        }

        const existingSocket = get().socket;
        if (existingSocket?.connected) return;

        if (existingSocket) existingSocket.disconnect();

        const socket = io(baseURL, {
            auth: { token: accessToken },
            transports: ['websocket'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        set({ socket });

        socket.on("connect", () => {
            console.log("🟢 Đã kết nối với socket:", socket.id);
        });

        // 🆕 1. Lấy danh sách online ban đầu (Backend gửi ngay khi vừa kết nối)
        // Backend cần gửi: socket.emit("online-users", getOnlineUsers());
        socket.on("online-users", (userIds) => {
            set({ onlineUsers: userIds });
        });

        socket.on("user_online", (userId) => {
            set((state) => {
                // Nếu đã có trong mảng thì bỏ qua, tránh trùng lặp
                if (state.onlineUsers.includes(userId)) return state;
                return { onlineUsers: [...state.onlineUsers, userId] };
            });
        });

        socket.on("user_offline", (data) => {

            const offlineUserId = typeof data === "string" ? data : data.userId;
            const lastActive = typeof data === "object" ? data.lastActiveAt : new Date();

            set((state) => ({
                onlineUsers: state.onlineUsers.filter((id) => id !== offlineUserId)
            }));


            useChatStore.getState().updateUserLastActiveAt(offlineUserId, lastActive);
        });

        socket.on("conversation_seen", (data) => {
            useChatStore.getState().updateConversationSeen(data.conversationId, data.seenBy);
        });

        socket.on("typing", (data) => {
            useChatStore.getState().setTyping(data);
        });

        socket.on("message_translated", (data) => {
            useChatStore.getState().applyTranslation(data);
        });

        socket.on("friend_request_new", () => {
            useFriendStore.getState().fetchRequests();
        });

        socket.on("friend_accepted", () => {
            useFriendStore.getState().fetchFriends();
            useFriendStore.getState().fetchRequests();
        });

        socket.on("friend_removed", ({ userId }) => {
            useFriendStore.getState().dropFriend(userId);
        });

        socket.on("conversation_new", () => {
            useChatStore.getState().fetchConversations();
        });

        socket.on("conversation_status", ({ conversationId, status }) => {
            useChatStore.getState()._setMyStatus(conversationId, status);
        });

        socket.on("disconnect", () => {
            console.log("🔴 Mất kết nối socket");
            set({ onlineUsers: [] });
        });

        socket.on("new_message", (message) => {
            // Gọi hàm trong ChatStore để cập nhật UI
            useChatStore.getState().receiveMessage(message);

            // (Tùy chọn) Phát âm thanh thông báo nếu không phải là tin của mình
            const currentUser = useAuthStore.getState().user;
            if (message.senderId._id !== currentUser._id) {
                new Audio('/notification.mp3').play();
            }
        });

        socket.on("incoming_call", (data) => {
            useCallStore.getState().receiveIncomingCall(data);
        });

        socket.on("call_accepted", () => {
            useCallStore.getState().acceptCall();
        });

        socket.on("call_rejected", () => {
            useCallStore.getState().endCall();
            // Có thể hiện thông báo "Người dùng đã từ chối cuộc gọi"
        });

    },

    disconnectSocket: () => {
        const socket = get().socket;
        if (socket) {
            socket.removeAllListeners();
            socket.disconnect();
        }
        set({ socket: null, onlineUsers: [] });
    },
}));
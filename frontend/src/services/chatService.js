// src/services/chatService.js
import api from "@/lib/axios";

export const chatService = {
    fetchConversations: async () => {
        const res = await api.get("/conversation");
        return res.data;
    },

    // Thêm hàm này
    fetchMessages: async (conversationId, cursor = null, limit = 50) => {
        const res = await api.get(`/conversation/${conversationId}/messages`, {
            params: {
                limit,
                ...(cursor ? { cursor } : {}),
            },
        });
        return res.data; // { messages, nextCursor }
    },

    createConversation: async ({ type, memberIds, name, avatarUrl }) => {
        const res = await api.post("/conversation", { type, memberIds, name, avatarUrl });
        return res.data; // { conversation }
    },

    sendFirstMessage: async ({ recipientId, content }) => {
        const res = await api.post("/message/direct", { recipientId, content });
        return res.data.message;
    },

    sendMessage: async ({ conversationId, type, content, imgURL }) => {
        console.log("🚀 PAYLOAD GỬI ĐI:", { conversationId, type, content, imgURL });
        const url = type === "group" ? "/message/group" : "/message/direct";
        const res = await api.post(url, { conversationId, content, imgURL });
        return res.data.message; // backend trả { message }
    },

    acceptConversation: async (conversationId) => {
        const res = await api.put(`/conversation/${conversationId}/accept`);
        return res.data;
    },

    declineConversation: async (conversationId) => {
        const res = await api.put(`/conversation/${conversationId}/decline`);
        return res.data;
    },

    addMembers: async (conversationId, memberIds) => {
        const res = await api.post(`/conversation/${conversationId}/members`, { memberIds });
        return res.data;
    },

    uploadImage: async (file) => {
        const formData = new FormData();
        formData.append('image', file); // Key phải khớp với backend
        const res = await api.post('message/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data.url; // Trả về URL từ Cloudinary
    },

    markAsRead: async (conversationId) => {
        const res = await api.put(`/conversation/${conversationId}/read`);
        return res.data;
    },

    // Thêm vào object chatService
    getLiveKitToken: async (roomName) => {
        const res = await api.post("/livekit/token", { roomName });
        return res.data;
    },

    leaveGroup: async (conversationId) => {
        await api.post(`/conversation/${conversationId}/leave`);
    },
}
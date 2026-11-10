// src/services/chatService.js
import api from "@/lib/axios";

export const chatService = {
    fetchConversations: async () => {
        const res = await api.get("/conversation");
        return res.data;
    },

    // Thêm hàm này
    fetchMessages: async (conversationId, cursor = null, limit = 50) => {
        let url = `/conversation/${conversationId}/messages?limit=${limit}`;
        if (cursor) url += `&cursor=${cursor}`;

        const res = await api.get(url);
        return res.data; // Trả về { messages, nextCursor }
    }
}
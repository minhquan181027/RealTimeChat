import api from "@/lib/axios";
import axios from "axios";
export const chatService = {
    fetchConversations: async () => {
        const res = await api.get("/conversation");
        return res.data;

    },

}
import api from "@/lib/axios";

export const friendService = {
    sendRequest: async (to, message) => {
        const res = await api.post("/friend/request", { to, message });
        return res.data;
    },
    getFriends: async () => {
        const res = await api.get("/friend");
        return res.data.friends;
    },
};
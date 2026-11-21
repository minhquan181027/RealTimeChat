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
    getRequests: async () => {
        const res = await api.get("/friend/request");
        return res.data; // { received, sent }
    },
    acceptRequest: async (requestId) => {
        const res = await api.post(`/friend/request/${requestId}/accept`);
        return res.data; // { newFriend }
    },
    declineRequest: async (requestId) => {
        await api.post(`/friend/request/${requestId}/decline`);
    },
    removeFriend: async (friendId) => {
        await api.delete(`/friend/${friendId}`);
    },
};
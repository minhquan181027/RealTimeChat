import api from "@/lib/axios";

export const userService = {

    searchUsers: async (q) => {
        const res = await api.get("/user/search", { params: { q } });
        return res.data.users;
    },
    getProfile: async (id) => {
        const res = await api.get(`/user/${id}`);
        return res.data.user;
    },
    updateMe: async (payload) => {
        const res = await api.put("/user/me", payload);
        return res.data.user;
    },
};
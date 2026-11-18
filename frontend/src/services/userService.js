import api from "@/lib/axios";

export const userService = {

    searchUsers: async (q) => {
        const res = await api.get("/user/search", { params: { q } });
        return res.data.users;
    },
};
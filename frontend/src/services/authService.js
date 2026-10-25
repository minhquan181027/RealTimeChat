import api from "@/lib/axios";

export const authService = {
    signUp: async (username, password, email, firstName, lastName) => {
        const res = await api.post("/auth/signup", {
            username, password, email, firstName, lastName
        }, { withCredentials: true });

        return res.data;
    },

    signIn: async (email, password) => {
        const res = await api.post("/auth/signin", {
            email, password
        }, { withCredentials: true });

        return res.data; //data là accesstoken
    },
    signOut: async () => {
        return api.post('/auth/signout', {}, { withCredentials: true });
    }
}
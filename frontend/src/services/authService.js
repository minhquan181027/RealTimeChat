import api from "@/lib/axios";
import axios from "axios";

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
        });

        // console.log("SignIn response:", res.data);

        return res.data; //data là accesstoken
    },

    googleLogin: async (credential) => {
        const res = await api.post("/auth/google", { credential });
        return res.data;
    },

    signOut: async () => {
        return api.post('/auth/signout', {}, { withCredentials: true });
    },

    fetchMe: async () => {
        const res = await api.get("/user/me", { withCredentials: true });
        return res.data.user;
    },

    refreshToken: async () => {
        const res = await api.post("auth/refresh", {}, { withCredentials: true });
        return res.data;
    }
}
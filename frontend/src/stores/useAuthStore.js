import { create } from "zustand";
import { toast } from "sonner";
import { authService } from "@/services/authService";
import { useChatStore } from "./useChatStore";
import { useSocketStore } from "./useSocketStore";
import { useFriendStore } from "./useFriendStore";
import { userService } from "@/services/userService";
import { setLanguage } from "@/i18n";
import i18n from "@/i18n"

export const useAuthStore = create((set, get) => ({
    accessToken: null,
    user: null,
    loading: false,

    setAccessToken: (accessToken) => {
        set({ accessToken })
    }
    ,
    clearState: () => {
        set({ accessToken: null, user: null, loading: false });
        localStorage.clear();
        useChatStore.getState().reset();
        useFriendStore.getState().reset();
    },

    signUp: async (username, password, email, firstName, lastName) => {
        try {
            set({ loading: true });

            //gọi api
            await authService.signUp(username, password, email, firstName, lastName);
            toast.success(i18n.t("toast.signUpOk"))
        } catch (error) {
            console.error(error);
            throw error;
        } finally {
            set({ loading: false })
        }
    },

    signIn: async (email, password) => {
        try {
            set({ loading: true });


            const data = await authService.signIn(email, password);
            const accessToken = data.accessToken;

            useChatStore.getState().reset();

            get().setAccessToken(accessToken);
            const user = await get().fetchMe();
            if (user && !user.needsSetup) {
                void useChatStore.getState().fetchConversations();
            }



            toast.success(i18n.t("toast.signInOk"))
        } catch (error) {
            console.error(error);

            throw error;
        } finally {
            set({ loading: false })
        }
    },

    googleLogin: async (credential) => {
        try {
            set({ loading: true })

            const data = await authService.googleLogin(credential);
            const accessToken = data.accessToken;

            get().setAccessToken(accessToken);

            const user = await get().fetchMe();
            if (user && !user.needsSetup) {
                void useChatStore.getState().fetchConversations();
            }
            toast.success(i18n.t("toast.signInOk"))
        } catch (error) {
            console.error(error);
            throw error;
        } finally {
            set({ loading: false })
        }
    },

    signOut: async () => {
        try {
            get().clearState();
            await authService.signOut();
            toast.success(i18n.t("toast.signOutOk"));
        } catch (error) {
            console.error(error);
            toast.error(i18n.t("toast.signOutFail"));
        } finally {

            get().clearState();
            useSocketStore.getState().disconnectSocket();

        }
    },
    fetchMe: async () => {
        try {
            set({ loading: true });
            const { user, needsSetup, requiresPassword } = await authService.fetchMe();
            const currentUser = { ...user, needsSetup, requiresPassword };
            set({ user: currentUser });
            if (user?.language) setLanguage(user.language);
            return currentUser;
        } catch (error) {
            console.error(
                "FetchMe error:",
                error.response?.status,
                error.response?.data
            );

            set({ user: null });
            toast.error(i18n.t("toast.fetchMeFail"));
            return null;
        } finally {
            set({ loading: false });
        }
    },

    updateProfile: async (payload) => {
        const user = await userService.updateMe(payload);
        set({ user });
        return user;
    },

    completeSetup: async (payload) => {
        const user = await authService.completeSetup(payload);
        const currentUser = { ...user, needsSetup: false, requiresPassword: false };
        set({ user: currentUser });
        return currentUser;
    },

    refresh: async () => {
        try {
            const { user, fetchMe, clearState } = get();
            set({ loading: true });

            const { accessToken } = await authService.refreshToken();

            get().setAccessToken(accessToken);

            if (!user) {
                await fetchMe(); // Gọi fetchMe, interceptor sẽ tự gắn token
            }
        } catch (error) {
            console.error("Refresh error:", error);
            // Gọi clearState nếu có, nếu không thì set thủ công
            const { clearState } = get();
            if (typeof clearState === 'function') {
                clearState();
            } else {
                set({ accessToken: null, user: null });
            }
        } finally {
            set({ loading: false });
        }
    },

    // forgot password

    forgotPassword: async (email) => {
        try {
            set({ loading: true });
            await authService.forgotPassword(email);
        } catch (error) {
            console.error(error);
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    // Trong useAuthStore.js
    verifyOtp: async (email, otp) => {
        try {
            set({ loading: true });
            // Trả về data để lấy resetToken
            const data = await authService.verifyOtp(email, otp);
            return data;
        } catch (error) {
            console.error(error);
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    resetPassword: async (email, resetToken, newPassword) => { // Đổi otp thành resetToken
        try {
            set({ loading: true });
            await authService.resetPassword(email, resetToken, newPassword);
        } catch (error) {
            console.error(error);
            throw error;
        } finally {
            set({ loading: false });
        }
    },

}))
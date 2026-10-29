import { create } from "zustand";
import { toast } from "sonner";
import { authService } from "@/services/authService";

export const useAuthStore = create((set, get) => ({
    accessToken: null,
    user: null,
    loading: false,

    setAccessToken: (accessToken) => {
        set({ accessToken })
    }
    ,
    clearState: () => {
        set({ accessToken: null, user: null, loading: false })
    },

    signUp: async (username, password, email, firstName, lastName) => {
        try {
            set({ loading: true });

            //gọi api
            await authService.signUp(username, password, email, firstName, lastName);
            toast.success("Đăng ký thành công.")
        } catch (error) {
            console.error(error);
            throw error;
        } finally {
            set({ loading: false })
        }
    },

    signIn: async (email, password) => {
        try {
            set({ loading: true })

            const data = await authService.signIn(email, password);
            const accessToken = data.accessToken;

            get().setAccessToken(accessToken);

            await get().fetchMe();

            toast.success("Đăng nhập thành công")
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

            await get().fetchMe();

            toast.success("Đăng nhập thành công")
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
            toast.success("Logout thành công!");
        } catch (error) {
            console.error(error);
            toast.error("Lỗi logout");
        }
    },
    fetchMe: async () => {
        try {
            set({ loading: true });
            const user = await authService.fetchMe();
            set({ user });
        } catch (error) {
            console.error(
                "FetchMe error:",
                error.response?.status,
                error.response?.data
            );

            set({ user: null });

            toast.error("Không lấy được thông tin người dùng.");
        } finally {
            set({ loading: false });
        }
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


}))
import { create } from "zustand";
import { toast } from "sonner";
import { authService } from "@/services/authService";

export const useAuthStore = create((set, get) => ({
    accessToken: null,
    user: null,
    loading: false,

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
            toast.error('Đăng ký không thành công');
        } finally {
            set({ loading: false })
        }
    },

    signIn: async (email, password) => {
        try {
            set({ loading: true })

            const accessToken = await authService.signIn(email, password);

            set({ accessToken });
            toast.success("Đăng nhập thành công")
        } catch (error) {
            console.error(error);
            toast.error('Đăng nhập không thành công');
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
    }

}))
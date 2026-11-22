import { create } from "zustand";
import { toast } from "sonner";
import { friendService } from "@/services/friendService";
import i18n from "@/i18n"

export const useFriendStore = create((set, get) => ({
    friends: [],
    received: [],
    sent: [],
    loading: false,
    friendsLoaded: false,

    reset: () => set({ friends: [], received: [], sent: [], loading: false }),

    fetchFriends: async () => {
        try {
            set({ loading: true });
            const friends = await friendService.getFriends();
            set({ friends, loading: false, friendsLoaded: true });
        } catch (error) {
            console.error("Lỗi fetchFriends:", error);
            set({ loading: false });
        }
    },

    fetchRequests: async () => {
        try {
            const { received, sent } = await friendService.getRequests();
            set({ received, sent });
        } catch (error) {
            console.error("Lỗi fetchRequests:", error);
        }
    },

    sendRequest: async (to) => {
        try {
            await friendService.sendRequest(to);
            await get().fetchRequests();
            toast.success(i18n.t("toast.requestSent"));
        } catch (error) {
            toast.error(error.response?.data?.message || i18n.t("toast.requestFailed"));
        }
    },

    acceptRequest: async (requestId) => {
        try {
            const { newFriend } = await friendService.acceptRequest(requestId);
            set((s) => ({
                received: s.received.filter((r) => r._id !== requestId),
                friends: newFriend
                    ? [...s.friends.filter((f) => f._id !== newFriend._id), newFriend]
                    : s.friends,
            }));
            toast.success(i18n.t("toast.accepted"));
        } catch (error) {
            toast.error(error.response?.data?.message || i18n.t("toast.acceptFailed"));
        }
    },

    // Từ chối (người nhận) hoặc thu hồi (người gửi) đều dùng chung endpoint
    declineRequest: async (requestId) => {
        try {
            await friendService.declineRequest(requestId);
            set((s) => ({
                received: s.received.filter((r) => r._id !== requestId),
                sent: s.sent.filter((r) => r._id !== requestId),
            }));
        } catch (error) {
            toast.error(error.response?.data?.message || i18n.t("toast.actionFailed"));
        }
    },

    removeFriend: async (friendId) => {
        try {
            await friendService.removeFriend(friendId);
            set((s) => ({ friends: s.friends.filter((f) => f._id !== friendId) }));
            toast.success(i18n.t("toast.removed"));
            return true;
        } catch (error) {
            toast.error(error.response?.data?.message || i18n.t("toast.removeFailed"));
            return false;
        }
    },

    // Dùng cho socket: người kia vừa xóa mình
    dropFriend: (friendId) =>
        set((s) => ({ friends: s.friends.filter((f) => f._id !== friendId) })),
}));
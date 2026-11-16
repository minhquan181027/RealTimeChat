import { create } from 'zustand';
import { io } from 'socket.io-client';
import { useAuthStore } from './useAuthStore';

const baseURL = import.meta.env.VITE_SOCKET_URL;

export const useSocketStore = create((set, get) => ({
    socket: null,

    connectSocket: () => {
        const accessToken = useAuthStore.getState().accessToken;

        if (!accessToken) {
            console.warn('Chưa có accessToken, không thể kết nối socket');
            return;
        }
        const existingSocket = get().socket;
        if (existingSocket?.connected) return;

        if (existingSocket) existingSocket.disconnect();

        const socket = io(baseURL, {
            auth: { token: accessToken },
            transports: ['websocket'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        set({ socket });
    },

    disconnectSocket: () => {
        const socket = get().socket;
        if (socket) {
            socket.removeAllListeners();
            socket.disconnect();
        }
        set({ socket: null });
    },
}));
// src/stores/useCallStore.js
import { create } from 'zustand';

export const useCallStore = create((set) => ({
    // Trạng thái cuộc gọi
    // { type: 'outgoing' | 'incoming', roomName, conversationName, callerName, callerAvatar }
    callState: null,
    isInCall: false, // Trạng thái đã kết nối vào LiveKit chưa

    startOutgoingCall: (data) => set({
        callState: { ...data, startedAt: data.startedAt || Date.now(), type: 'outgoing' },
    }),
    receiveIncomingCall: (data) => set({
        callState: { ...data, startedAt: data.startedAt || Date.now(), type: 'incoming' },
    }),
    acceptCall: () => set({ isInCall: true }),
    endCall: (callId) => set((state) => {
        if (callId && state.callState?.callId !== callId) return state;
        return { callState: null, isInCall: false };
    }),
}));
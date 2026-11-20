// src/stores/useCallStore.js
import { create } from 'zustand';

export const useCallStore = create((set) => ({
    // Trạng thái cuộc gọi
    // { type: 'outgoing' | 'incoming', roomName, conversationName, callerName, callerAvatar }
    callState: null,
    isInCall: false, // Trạng thái đã kết nối vào LiveKit chưa

    startOutgoingCall: (data) => set({ callState: { ...data, type: 'outgoing' } }),
    receiveIncomingCall: (data) => set({ callState: { ...data, type: 'incoming' } }),
    acceptCall: () => set({ isInCall: true }),
    endCall: () => set({ callState: null, isInCall: false }),
}));
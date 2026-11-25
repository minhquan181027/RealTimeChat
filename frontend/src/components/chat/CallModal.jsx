// src/components/chat/CallModal.jsx
import { useEffect, useState } from "react";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";
import { PhoneOff, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useCallStore } from "@/stores/useCallStore";
import { useSocketStore } from "@/stores/useSocketStore";
import { chatService } from "@/services/chatService";

const CALL_RING_TIMEOUT_MS = 2 * 60 * 1000;

const LiveKitRoomWrapper = ({ roomName, onLeave }) => {
    const { t } = useTranslation();
    const [token, setToken] = useState(null);

    useEffect(() => {
        const fetchToken = async () => {
            const data = await chatService.getLiveKitToken(roomName);
            setToken(data.token);
        };
        fetchToken();
    }, [roomName]);

    if (!token) {
        return (
            <div className="flex h-full items-center justify-center text-white">
                {t("call.connecting")}
            </div>
        );
    }

    return (
        <LiveKitRoom
            data-lk-theme="default"
            token={token}
            serverUrl={import.meta.env.VITE_LIVEKIT_URL}
            connect={true}
            video={true}
            audio={true}
            onDisconnected={onLeave}
            style={{ height: "100dvh" }}
        >
            <VideoConference />
        </LiveKitRoom>
    );
};

const CallModal = () => {
    const { t } = useTranslation();
    const { callState, isInCall, endCall } = useCallStore();
    const socket = useSocketStore((state) => state.socket);
    const callId = callState?.callId;
    const startedAt = callState?.startedAt;

    useEffect(() => {
        if (!callId || isInCall) return undefined;
        const remaining = Math.max(
            0,
            CALL_RING_TIMEOUT_MS - (Date.now() - (startedAt || Date.now()))
        );
        const timeout = setTimeout(() => endCall(callId), remaining);
        return () => clearTimeout(timeout);
    }, [callId, startedAt, isInCall, endCall]);

    if (!callState) return null;

    const isOutgoing = callState.type === "outgoing";
    const isIncoming = callState.type === "incoming";

    const handleAccept = () => {
        socket?.emit("accept_call", { callId: callState.callId });
    };

    const handleEnd = () => {
        socket?.emit("reject_call", { callId: callState.callId });
        endCall();
    };

    if (isInCall) {
        return (
            <div className="fixed inset-0 z-[200] bg-black">
                <LiveKitRoomWrapper roomName={callState.roomName} onLeave={handleEnd} />
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gray-950 p-4 text-white">
            <div className="mb-10 flex flex-col items-center">
                <div className="relative mb-6">
                    <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
                    <img
                        src={isOutgoing ? callState.targetAvatar : callState.caller?.avatarUrl}
                        className="relative size-32 rounded-full object-cover ring-4 ring-primary/50"
                    />
                </div>
                <h2 className="text-2xl font-bold">
                    {isOutgoing ? callState.targetName : callState.caller?.displayName}
                </h2>
                <p className="mt-2 text-gray-400">
                    {isOutgoing ? t("call.calling") : t("call.incoming")}
                </p>
            </div>

            <div className="flex gap-6">
                {isIncoming ? (
                    <>
                        <Button onClick={handleEnd} variant="destructive" className="size-16 rounded-full">
                            <PhoneOff className="size-8" />
                        </Button>
                        <Button onClick={handleAccept} className="size-16 rounded-full bg-green-500 hover:bg-green-600">
                            <Phone className="size-8" />
                        </Button>
                    </>
                ) : (
                    <Button onClick={handleEnd} variant="destructive" className="size-16 rounded-full">
                        <PhoneOff className="size-8" />
                    </Button>
                )}
            </div>
        </div>
    );
};

export default CallModal;
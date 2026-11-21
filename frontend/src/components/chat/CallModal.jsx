// src/components/chat/CallModal.jsx
import { useEffect, useState } from "react";
import { useCallStore } from "@/stores/useCallStore";
import { useSocketStore } from "@/stores/useSocketStore";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";
import { PhoneOff, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { chatService } from "@/services/chatService";

const CallModal = () => {
    const { callState, isInCall, acceptCall, endCall } = useCallStore();
    const socket = useSocketStore((state) => state.socket);

    // Nếu chưa có cuộc gọi nào thì không hiện gì cả
    if (!callState) return null;

    const isOutgoing = callState.type === "outgoing";
    const isIncoming = callState.type === "incoming";

    // 🆕 Xử lý khi bấm "Nhận cuộc gọi"
    const handleAccept = () => {
        socket.emit("accept_call", {
            targetUserId: callState.caller._id, // Gửi lại cho người gọi
            roomName: callState.roomName,
        });
        acceptCall();
    };

    // 🆕 Xử lý khi bấm "Từ chối" hoặc "Hủy"
    const handleEnd = () => {
        if (isIncoming) {
            socket.emit("reject_call", {
                targetUserId: callState.caller._id,
                roomName: callState.roomName,
            });
        } else if (isOutgoing) {
            socket.emit("reject_call", {
                targetUserId: callState.targetUserIds[0], // Tạm thời gửi cho người đầu tiên
                roomName: callState.roomName,
            });
        }
        endCall();
    };

    if (isInCall) {
        return (
            <div className="fixed inset-0 z-[200] bg-black">
                <LiveKitRoomWrapper roomName={callState.roomName} onLeave={handleEnd} />
            </div>
        );
    }

    // Giao diện đang đổ chuông (Chưa kết nối LiveKit)
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
                    {isOutgoing ? "Đang gọi..." : "Cuộc gọi video đến..."}
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

// Component con để fetch Token trước khi vào LiveKit
const LiveKitRoomWrapper = ({ roomName, onLeave }) => {
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
                Đang kết nối...
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

export default CallModal;
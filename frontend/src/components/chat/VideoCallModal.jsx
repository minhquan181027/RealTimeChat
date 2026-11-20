// src/components/chat/VideoCallModal.jsx
import { useState, useEffect } from "react";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles"; // Import CSS của LiveKit
import { chatService } from "@/services/chatService";
import { X } from "lucide-react";

const VideoCallModal = ({ roomName, onClose }) => {
    const [token, setToken] = useState(null);

    useEffect(() => {
        const fetchToken = async () => {
            try {
                const data = await chatService.getLiveKitToken(roomName);
                setToken(data.token);
            } catch (error) {
                console.error("Không lấy được token LiveKit", error);
                alert("Không thể kết nối cuộc gọi!");
                onClose();
            }
        };
        if (roomName) fetchToken();
    }, [roomName, onClose]);

    if (!token) return null;

    return (
        <div className="fixed inset-0 z-[200] flex flex-col bg-black">
            <div className="flex justify-end p-4 absolute top-0 right-0 z-50">
                <button
                    onClick={onClose}
                    className="rounded-full bg-red-500 p-2 text-white hover:bg-red-600"
                    title="Kết thúc cuộc gọi"
                >
                    <X className="size-6" />
                </button>
            </div>

            <LiveKitRoom
                token={token}
                serverUrl={import.meta.env.VITE_LIVEKIT_URL}
                connect={true}
                video={true} // Bật camera
                audio={true} // Bật mic
                onDisconnected={onClose} // Tự động đóng khi thoát
                className="flex-1"
            >
                <VideoConference />
            </LiveKitRoom>
        </div>
    );
};

export default VideoCallModal;
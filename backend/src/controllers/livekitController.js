// src/controllers/livekitController.js
import { AccessToken } from "livekit-server-sdk";

export const getLiveKitToken = async (req, res) => {
    try {
        const { roomName } = req.body;
        const user = req.user; // Lấy từ middleware protectedRoute

        if (!roomName) {
            return res.status(400).json({ message: "Thiếu roomName" });
        }

        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;

        // Tạo token cho user
        const at = new AccessToken(apiKey, apiSecret, {
            identity: user._id.toString(), // ID định danh (bắt buộc phải là duy nhất)
            name: user.displayName,        // Tên hiển thị trong phòng
            ttl: "1h",                     // Token có hạn 1 tiếng
        });

        // Cấp quyền tham gia phòng
        at.addGrant({ roomJoin: true, room: roomName });

        const token = await at.toJwt();
        return res.status(200).json({ token });
    } catch (error) {
        console.error("Lỗi tạo LiveKit token:", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};
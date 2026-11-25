// src/socket/index.js
import { Server } from "socket.io";
import { socketAuthMiddleWare } from "../middlewares/socketMiddleware.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import { areUsersBlocked } from "../middlewares/friendMiddleware.js";

let io;

// 🆕 Dùng Map để lưu những người đang online: { userId: Set(socketId1, socketId2) }
const onlineUsers = new Map();

const memberCache = new Map(); // conversationId -> { at, members: [{ id, status }] }
const MEMBER_TTL = 30_000;

const getMembers = async (conversationId) => {
    const hit = memberCache.get(conversationId);
    if (hit && Date.now() - hit.at < MEMBER_TTL) return hit.members;

    const conv = await Conversation.findById(conversationId).select("participants").lean();
    if (!conv) return null;

    const members = conv.participants.map((p) => ({
        id: p.userId.toString(),
        status: p.status || "accepted",
    }));
    memberCache.set(conversationId, { at: Date.now(), members });
    return members;
};

export const invalidateMembers = (conversationId) => {
    memberCache.delete(conversationId.toString());
};

export const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: ["http://localhost:5173", "http://192.168.1.154:5173"], // Nhớ check lại IP
            credentials: true,
        },
    });
    io.use(socketAuthMiddleWare);

    io.on("connection", (socket) => {
        const user = socket.user;
        const userId = user._id.toString();

        console.log(`🟢 ${user.displayName} online với socketId: ${socket.id}`);


        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId).add(socket.id);


        socket.join(userId);

        socket.emit("online-users", Array.from(onlineUsers.keys()));

        io.emit("user_online", userId);

        socket.on("call_user", async ({ targetUserIds, roomName, caller }) => {
            try {
                if (!Array.isArray(targetUserIds)) return;
                const conversation = await Conversation.findById(roomName).select("type participants").lean();
                if (!conversation) return;
                const participantIds = conversation.participants.map((participant) => participant.userId.toString());
                if (
                    !participantIds.includes(userId) ||
                    targetUserIds.some((targetId) => !participantIds.includes(targetId.toString()))
                ) {
                    return;
                }
                if (conversation.type === "direct") {
                    const other = conversation.participants.find(
                        (participant) => participant.userId.toString() !== userId
                    );
                    if (
                        !other ||
                        !targetUserIds.some((targetId) => targetId.toString() === other.userId.toString()) ||
                        await areUsersBlocked(userId, other.userId)
                    ) {
                        return;
                    }
                }

                targetUserIds.forEach((id) => {
                    io.to(id).emit("incoming_call", { roomName, caller });
                });
            } catch (error) {
                console.error("Lỗi xử lý yêu cầu gọi:", error);
            }
        });


        socket.on("accept_call", ({ targetUserId, roomName }) => {
            io.to(targetUserId).emit("call_accepted", { roomName });
        });


        socket.on("reject_call", ({ targetUserId, roomName }) => {
            io.to(targetUserId).emit("call_rejected", { roomName });
        });


        socket.on("typing", async ({ conversationId, isTyping }) => {
            try {
                if (!mongoose.isValidObjectId(conversationId)) return;

                const members = await getMembers(conversationId);
                const me = members?.find((m) => m.id === userId);
                if (!me || me.status !== "accepted") return;

                // Chỉ báo cho người đã chấp nhận cuộc trò chuyện
                members.forEach((m) => {
                    if (m.id === userId || m.status !== "accepted") return;
                    io.to(m.id).emit("typing", {
                        conversationId,
                        userId,
                        displayName: user.displayName,
                        isTyping: !!isTyping,
                    });
                });
            } catch (err) {
                console.error("Lỗi typing:", err);
            }
        });

        socket.on("disconnect", async () => {
            console.log(`🔴 socket disconnected: ${socket.id}`);

            const userSockets = onlineUsers.get(userId);
            if (userSockets) {
                userSockets.delete(socket.id);

                if (userSockets.size === 0) {
                    onlineUsers.delete(userId);
                    await User.findByIdAndUpdate(userId, { lastActiveAt: new Date() });
                    io.emit("user_offline", { userId, lastActiveAt: new Date() }); // Báo cho mọi người
                }
            }
        });
    });

    return io;
};

export const getIO = () => io;

// 🆕 Hàm lấy danh sách những người đang online (để Frontend gọi lúc mới load)
export const getOnlineUsers = () => Array.from(onlineUsers.keys());
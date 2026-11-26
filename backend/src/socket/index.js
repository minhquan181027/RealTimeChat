// src/socket/index.js
import { Server } from "socket.io";
import { socketAuthMiddleWare } from "../middlewares/socketMiddleware.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { areUsersBlocked } from "../middlewares/friendMiddleware.js";

let io;

//  Dùng Map để lưu những người đang online: { userId: Set(socketId1, socketId2) }
const onlineUsers = new Map();
const activeCalls = new Map();
const CALL_RING_TIMEOUT_MS = 2 * 60 * 1000;

const memberCache = new Map(); // conversationId -> { at, members: [{ id, status }] }
const MEMBER_TTL = 30_000;

const saveCallHistory = async (call, status) => {
    const conversation = await Conversation.findById(call.roomName);
    if (!conversation) {
        console.warn(`Không tìm thấy cuộc trò chuyện để lưu lịch sử cuộc gọi ${call.callId}.`);
        return;
    }

    const duration = status === "completed" && call.acceptedAt
        ? Math.floor((Date.now() - call.acceptedAt) / 1000)
        : 0;
    const meta = {
        action: "call_history",
        callId: call.callId,
        status,
        duration,
        callType: "video",
    };
    const message = await Message.create({
        conversationId: conversation._id,
        senderId: call.callerId,
        content: "",
        type: "system",
        meta,
    });
    await message.populate("senderId", "displayName avatarUrl");

    conversation.set({
        lastMessage: {
            _id: message._id.toString(),
            content: "",
            meta,
            senderId: call.callerId,
            createdAt: message.createdAt,
            type: "system",
        },
        lastMessageAt: message.createdAt,
        seenBy: [call.callerId],
    });
    conversation.participants.forEach((participant) => {
        if (participant.status === "declined") return;
        const participantId = participant.userId.toString();
        const unreadCount = conversation.unreadCounts.get(participantId) || 0;
        conversation.unreadCounts.set(
            participantId,
            participantId === call.callerId.toString() ? 0 : unreadCount + 1
        );
    });
    await conversation.save();

    conversation.participants.forEach((participant) => {
        if (participant.status !== "declined") {
            io.to(participant.userId.toString()).emit("new_message", message);
        }
    });
};

const finishCall = async (callId, status) => {
    const call = activeCalls.get(callId);
    if (!call) return;

    activeCalls.delete(callId);
    clearTimeout(call.timeout);

    const payload = { callId, roomName: call.roomName, status };
    const recipients = new Set([call.callerId.toString(), ...call.targetUserIds]);
    recipients.forEach((recipientId) => {
        io.to(recipientId).emit(status === "missed" ? "call_timeout" : "call_ended", payload);
    });

    try {
        await saveCallHistory(call, status);
    } catch (error) {
        console.error(`Không thể lưu lịch sử cuộc gọi ${callId}:`, error);
    }
};

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
            origin: [
                "http://localhost:5173",
                "https://localhost:5173",
                "http://192.168.1.154:5173",
                "https://192.168.1.154:5173",
                process.env.CLIENT_URL,
            ], // Nhớ check lại IP
            credentials: true,
            methods: ["GET", "POST"],
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

        socket.on("call_user", async ({ callId, targetUserIds, roomName }) => {
            try {
                if (
                    typeof callId !== "string" ||
                    !callId ||
                    callId.length > 128 ||
                    !mongoose.isValidObjectId(roomName) ||
                    !Array.isArray(targetUserIds)
                ) {
                    socket.emit("call_failed", { callId });
                    return;
                }
                const conversation = await Conversation.findById(roomName).select("type participants").lean();
                if (!conversation || activeCalls.has(callId)) {
                    socket.emit("call_failed", { callId });
                    return;
                }
                const participantIds = conversation.participants
                    .filter((participant) => participant.status !== "declined")
                    .map((participant) => participant.userId.toString());
                const normalizedTargets = [...new Set(targetUserIds.map((id) => id?.toString()))];
                if (
                    !participantIds.includes(userId) ||
                    normalizedTargets.length === 0 ||
                    normalizedTargets.includes(userId) ||
                    normalizedTargets.some((targetId) => !participantIds.includes(targetId))
                ) {
                    socket.emit("call_failed", { callId });
                    return;
                }
                if (conversation.type === "direct") {
                    const other = conversation.participants.find(
                        (participant) => participant.userId.toString() !== userId
                    );
                    if (
                        !other ||
                        !normalizedTargets.includes(other.userId.toString()) ||
                        await areUsersBlocked(userId, other.userId)
                    ) {
                        socket.emit("call_failed", { callId });
                        return;
                    }
                }

                const call = {
                    callId,
                    roomName,
                    callerId: user._id,
                    targetUserIds: normalizedTargets,
                    acceptedAt: null,
                    acceptedBy: null,
                    startedAt: Date.now(),
                    timeout: null,
                };
                call.timeout = setTimeout(() => {
                    void finishCall(callId, "missed");
                }, CALL_RING_TIMEOUT_MS);
                activeCalls.set(callId, call);

                const caller = {
                    _id: user._id.toString(),
                    displayName: user.displayName,
                    avatarUrl: user.avatarUrl,
                };
                normalizedTargets.forEach((id) => {
                    io.to(id).emit("incoming_call", {
                        callId,
                        roomName,
                        caller,
                        startedAt: call.startedAt,
                    });
                });
            } catch (error) {
                console.error("Lỗi xử lý yêu cầu gọi:", error);
                socket.emit("call_failed", { callId });
            }
        });


        socket.on("accept_call", ({ callId }) => {
            const call = activeCalls.get(callId);
            if (!call || !call.targetUserIds.includes(userId)) {
                socket.emit("call_failed", { callId });
                return;
            }
            if (call.acceptedAt) {
                if (call.acceptedBy === userId) {
                    socket.emit("call_accepted", { callId, roomName: call.roomName });
                } else {
                    socket.emit("call_ended", {
                        callId,
                        roomName: call.roomName,
                        status: "answered_elsewhere",
                    });
                }
                return;
            }

            clearTimeout(call.timeout);
            call.acceptedAt = Date.now();
            call.acceptedBy = userId;
            const payload = {
                callId,
                roomName: call.roomName,
            };
            io.to(call.callerId.toString()).emit("call_accepted", payload);
            io.to(userId).emit("call_accepted", payload);
            call.targetUserIds
                .filter((targetId) => targetId !== userId)
                .forEach((targetId) => {
                    io.to(targetId).emit("call_ended", {
                        callId,
                        roomName: call.roomName,
                        status: "answered_elsewhere",
                    });
                });
        });


        socket.on("reject_call", ({ callId }) => {
            const call = activeCalls.get(callId);
            if (!call || (
                call.callerId.toString() !== userId &&
                !call.targetUserIds.includes(userId)
            )) return;

            const status = call.acceptedAt
                ? "completed"
                : call.callerId.toString() === userId
                    ? "cancelled"
                    : "rejected";
            void finishCall(callId, status);
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
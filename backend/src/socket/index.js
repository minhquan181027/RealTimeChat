// src/socket/index.js
import { Server } from "socket.io";
import { socketAuthMiddleWare } from "../middlewares/socketMiddleware.js";
import User from "../models/User.js";


let io;

// 🆕 Dùng Map để lưu những người đang online: { userId: Set(socketId1, socketId2) }
const onlineUsers = new Map();

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

        // 🆕 Cho socket này vào phòng mang tên userId
        socket.join(userId);

        socket.emit("online-users", Array.from(onlineUsers.keys()));

        io.emit("user_online", userId);


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
import { Server } from "socket.io";
import { socketAuthMiddleWare } from "../middlewares/socketMiddleware.js";

let io;

export const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: ["http://localhost:5173", "http://192.168.1.154:5173"],
            credentials: true,
        },
    });
    io.use(socketAuthMiddleWare);

    io.on("connection", (socket) => {
        const user = socket.user;
        console.log(` ${user.displayName} online với socketId: ${socket.id}`);
        socket.on("disconnect", () => console.log(`socket disconnected: ${socket.id}`));
    });

    return io;
};

export const getIO = () => io;
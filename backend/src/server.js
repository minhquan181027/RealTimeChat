// server.js
import 'dotenv/config';
import express from 'express';
import { connectDB } from './libs/db.js';
import authRoute from './routes/authRoute.js';
import userRoute from './routes/userRoute.js';
import friendRoute from './routes/friendRoute.js';
import messageRoute from './routes/messageRoute.js';
import conversationRoute from './routes/conversationRoute.js';
import cookieParser from 'cookie-parser';
import { protectedRoute } from './middlewares/authMiddleware.js';
import cors from 'cors';

import { createServer } from 'http';
import { initSocket } from './socket/index.js';

const app = express();
const server = createServer(app);
initSocket(server);

const PORT = process.env.PORT || 1234;

// middlewares
app.use(express.json());
app.use(cookieParser());

app.use(cors({
    origin: ["http://localhost:5173",
        "https://192.168.1.154:5173"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
}));

// public routes
app.use('/api/auth', authRoute);

// private routes
app.use(protectedRoute);
app.use('/api/user', userRoute);
app.use('/api/friend', friendRoute);
app.use('/api/message', messageRoute);
app.use('/api/conversation', conversationRoute);

connectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`Server bắt đầu trên cổng ${PORT}`);
    });
});
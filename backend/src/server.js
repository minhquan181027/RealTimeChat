
// server.js
import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { createServer } from 'http';


import { connectDB } from './libs/db.js';
import { initSocket } from './socket/index.js';

import { connectRedis } from './libs/redis.js';

import authRoute from './routes/authRoute.js';
import userRoute from './routes/userRoute.js';
import friendRoute from './routes/friendRoute.js';
import messageRoute from './routes/messageRoute.js';
import conversationRoute from './routes/conversationRoute.js';
import livekitRoute from './routes/livekitRoute.js';

import {
    protectedRoute,
    requireSetupComplete
} from './middlewares/authMiddleware.js';

const app = express();
const server = createServer(app);

const PORT = process.env.PORT || 1234;

// Render chạy sau reverse proxy
app.set('trust proxy', 1);

// CORS
const allowedOrigins = [
    'http://localhost:5173',
    process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// Middlewares
app.use(express.json());
app.use(cookieParser());

// Public routes
app.use('/api/auth', authRoute);

// Private routes
app.use(protectedRoute);

app.use('/api/user', userRoute);

app.use(requireSetupComplete);

app.use('/api/friend', friendRoute);
app.use('/api/message', messageRoute);
app.use('/api/conversation', conversationRoute);
app.use('/api/livekit', livekitRoute);

// Start server
async function startServer() {
    try {
        await connectDB();
        await connectRedis();

        initSocket(server);

        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

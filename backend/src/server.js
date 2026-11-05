import experss from 'express'
import dotenv from 'dotenv'
import { connectDB } from './libs/db.js';
import authRoute from './routes/authRoute.js'
import userRoute from './routes/userRoute.js'
import friendRoute from './routes/friendRoute.js'
import messageRoute from './routes/messageRoute.js'
import conversationRoute from './routes/conversationRoute.js'
import cookieParser from 'cookie-parser'
import { protectedRoute } from './middlewares/authMiddleware.js';
import cors from 'cors';
import helmet from 'helmet';
dotenv.config();

const app = experss();
const PORT = process.env.PORT || 1234;

//middlewares
app.use(experss.json());
app.use(cookieParser());
app.use(helmet({ crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" } }));
app.use(cors({
    origin: "http://localhost:5173", // 🔥 PHẢI ghi rõ domain FE, KHÔNG dùng "*"
    credentials: true, // 🔥 Bắt buộc để nhận cookie
    methods: ["GET", "POST", "PUT", "DELETE"],
}));

//public routes
app.use('/api/auth', authRoute);


//private routes
app.use(protectedRoute);
app.use('/api/user', userRoute);
app.use('/api/friend', friendRoute);
app.use('/api/message', messageRoute);
app.use('/api/conversation', conversationRoute);

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server  bắt đầu trên cổng ${PORT}`);
    });
});



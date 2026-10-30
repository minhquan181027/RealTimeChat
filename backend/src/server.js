import experss from 'express'
import dotenv from 'dotenv'
import { connectDB } from './libs/db.js';
import authRoute from './routes/authRoute.js'
import userRoute from './routes/userRoute.js'
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
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));

//public routes
app.use('/api/auth', authRoute);


app.use('/api/user', protectedRoute, userRoute);

//private routes

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server  bắt đầu trên cổng ${PORT}`);
    });
});



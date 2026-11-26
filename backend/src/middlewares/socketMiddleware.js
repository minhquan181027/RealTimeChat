
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const socketAuthMiddleWare = async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(new Error('Unauthorized - Token không tồn tại'));
        }

        const decoded = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET
        );

        if (!decoded.userId) {
            return next(new Error('Unauthorized - Invalid payload'));
        }

        const user = await User.findById(decoded.userId)
            .select('+hashedPassword');

        if (!user) {
            return next(new Error('User không tồn tại'));
        }

        if (!user.onboardingCompleted || !user.hashedPassword) {
            return next(new Error('Vui lòng hoàn tất thiết lập tài khoản.'));
        }

        const safeUser = user.toObject();
        delete safeUser.hashedPassword;

        socket.user = safeUser;

        next();
    } catch (error) {
        console.error('Socket authentication error:', error.message);
        next(new Error('Unauthorized'));
    }
};

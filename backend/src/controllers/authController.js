import bcrypt from 'bcrypt'
import User from '../models/User.js'
import jwt from 'jsonwebtoken'
import crypto, { hash } from 'crypto'
import Session from '../models/Session.js';
import { OAuth2Client } from 'google-auth-library';
import { sendOtpEmail } from '../utils/sendEmail.js';
import PasswordResetOTP from "../models/PasswordResetOTP.js";


const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60 * 1000;
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
export const signUp = async (req, res) => {
    try {
        const { username, password, email, firstName, lastName } = req.body;
        if (!username || !password || !email || !firstName || !lastName) {
            return res.status(400).json({ message: "Không thể thiếu username,password,...." })
        }
        const duplicateUsername = await User.findOne({ username });
        if (duplicateUsername) {
            return res.status(409).json({
                field: "username",
                message: "Username đã được sử dụng"
            });
        }
        const duplicateEmail = await User.findOne({ email });
        if (duplicateEmail) {
            return res.status(409).json({
                field: "email",
                message: "Email đã được sử dụng"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            username,
            hashedPassword,
            email,
            displayName: `${firstName} ${lastName}`

        });
        return res.sendStatus(204);


    } catch (error) {
        console.error('Lỗi khi gọi signUp');
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}
export const signIn = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(409).json({ message: "Vui lòng nhập email và password" });

        const user = await User.findOne({ email }).select("+hashedPassword");

        if (!user) {
            return res.status(401).json({ message: "Email hoặc mật khẩu chưa chính xác" });
        }
        // Tài khoản Google chưa có mật khẩu
        if (!user.hashedPassword) {
            return res.status(400).json({
                code: "GOOGLE_ACCOUNT",
                message: "Tài khoản này được đăng ký bằng Google. Vui lòng đăng nhập bằng Google hoặc thiết lập mật khẩu."
            });
        }

        const passCorrect = await bcrypt.compare(password, user.hashedPassword);
        if (!passCorrect) return res.status(401).json({ message: "mật khẩu chưa chính xác" });

        // Tạo accessToken với JWT
        const accessToken = jwt.sign(
            { userId: user._id },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '1h' }
        );

        // Tạo refresh token 
        const refreshToken = crypto.randomBytes(64).toString("hex");

        //Tạo session mới để lưu refresh token
        await Session.create({
            userId: user._id,
            refreshToken,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL),
        })

        //trả refresh token về trong cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: REFRESH_TOKEN_TTL
        });

        return res.status(200).json({ message: `User ${user.displayName} đã login thành công`, accessToken });

    } catch (error) {
        console.error("Lỗi signIn:", error);

        return res.status(500).json({
            message: "Lỗi hệ thống"
        });
    }
}

export const googleLogin = async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({ message: "Không có xác thực idGoogle" });
        }

        // Xác thực token với Google
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });


        const payload = ticket.getPayload();

        if (!payload?.sub || !payload.email || payload.email_verified !== true) {
            return res.status(401).json({ message: "Tài khoản Google không được xác thực" });
        }

        const googleId = payload.sub;
        const email = payload.email.toLowerCase();
        const displayName = payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`.trim() || "Người dùng Google";

        // 1. Kiểm tra xem user đã tồn tại trong DB chưa (tìm theo email)
        let user = await User.findOne({ email });

        // 2. Nếu chưa có, tạo mới user
        if (!user) {
            // Tạo username tự động từ email (vd: nguyenvana@gmail.com -> nguyenvana)
            // Cần xử lý trùng lặp username nếu có nhiều người cùng prefix email
            let baseUsername = email.split('@')[0];
            let username = baseUsername;
            let counter = 1;

            while (await User.findOne({ username })) {
                username = `${baseUsername}${counter}`;
                counter++;
            }

            user = await User.create({
                username: username,
                email: email,
                googleId: googleId,
                displayName: displayName,
                // Không cần hashedPassword vì đăng nhập bằng Google
                // googleId: googleId, // (Khuyên dùng) Bạn nên thêm field này vào Schema User
            });
        }

        // 3. Tạo accessToken với JWT (Giống hệt hàm signIn)
        const accessToken = jwt.sign(
            { userId: user._id },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '1h' }
        );

        // 4. Tạo refresh token
        const refreshToken = crypto.randomBytes(64).toString("hex");

        // 5. Tạo session mới để lưu refresh token
        await Session.create({
            userId: user._id,
            refreshToken,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL),
        });

        // 6. Trả refresh token về trong cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: REFRESH_TOKEN_TTL
        });

        // 7. Trả về kết quả
        return res.status(200).json({
            message: `User ${user.displayName} đã login bằng Google thành công`,
            accessToken
        });

    } catch (error) {
        console.error("Lỗi googleLogin:", error);
        return res.status(500).json({
            message: "Lỗi hệ thống hoặc xác thực Google thất bại"
        });
    }
}

export const signOut = async (req, res) => {
    try {
        // lấy refreshtoken từ cookie
        const token = req.cookies?.refreshToken;
        if (token) {
            // xóa refresh token trong session
            await Session.deleteOne({ refreshToken: token });
            // xóa trong cookie
            res.clearCookie("refreshToken");
        }
        return res.sendStatus(204);


    } catch (error) {
        console.error("Lỗi signout:", error);

        return res.status(500).json({
            message: "Lỗi hệ thống"
        });
    }
}
// tạo accesstoken mới từ refresh token
export const refreshToken = async (req, res) => {
    try {
        // Lấy refreshtoken từ cookie
        const token = req.cookies?.refreshToken;
        if (!token) {
            return res.status(401).json({ message: "Token không tồn tại" });

        }
        const session = await Session.findOne({ refreshToken: token });

        if (!session) {
            return res.status(403).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
        }
        if (session.expiresAt < new Date()) {
            return res.status(403).json({ message: "Token đã hết hạn" });
        }
        const accessToken = jwt.sign(
            { userId: session.userId },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '1h' }
        );
        return res.json({ accessToken });
    } catch (error) {
        console.error("Lỗi refreshtoken:", error);

        return res.status(500).json({
            message: "Lỗi hệ thống"
        });
    }
}

//========================= LUỒNG QUÊN MẬT KHẨU ================================

export const forgotPassword = async (req, res) => {
    try {

        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Vui lòng nhập email" });
        const normalizedEmail = email.trim().toLowerCase();

        const user = await User.findOne({ email });
        // Bảo mật: Dù email không tồn tại, vẫn trả về 200 để tránh bị dò quét email
        if (!user) {
            return res.status(200).json({ message: "Nếu email tồn tại, mã OTP đã được gửi." });
        }

        // Tạo mã OTP 6 số
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Mã hóa OTP trước khi lưu DB (để bảo mật, tránh lộ mã nếu DB bị hack)
        const hashedOtp = await bcrypt.hash(otp, 10);

        // Lưu vào DB, hết hạn sau 5 phút
        await PasswordResetOTP.deleteMany({
            email: normalizedEmail
        });
        await PasswordResetOTP.create({
            email: normalizedEmail,
            otp: hashedOtp,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        });

        // Gửi mail (chạy nền hoặc await đều được)
        try {
            await sendOtpEmail(email, otp);
        } catch (mailError) {
            console.error("Lỗi gửi mail:", mailError);
            return res.status(500).json({ message: "Không thể gửi email. Vui lòng thử lại sau." });
        }

        return res.status(200).json({ message: "Mã OTP đã được gửi đến email của bạn." });
    } catch (error) {
        console.error("Lỗi forgotPassword:", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

export const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ message: "Thiếu thông tin" });

        const resetRecord = await PasswordResetOTP.findOne({ email });

        if (!resetRecord) {
            return res.status(400).json({ message: "Yêu cầu không hợp lệ hoặc đã hết hạn" });
        }

        // Chống brute-force: Nếu nhập sai quá 5 lần
        if (resetRecord.attempts >= 5) {
            return res.status(429).json({ message: "Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới." });
        }

        // Kiểm tra hết hạn (đề phòng TTL của Mongo chưa kịp xoá)
        if (resetRecord.expiresAt < new Date()) {
            return res.status(400).json({ message: "Mã OTP đã hết hạn" });
        }

        // Kiểm tra mã OTP
        const isValid = await bcrypt.compare(otp, resetRecord.otp);
        if (!isValid) {
            // Tăng attempts lên 1
            resetRecord.attempts += 1;
            await resetRecord.save();
            return res.status(400).json({ message: "Mã OTP không chính xác" });
        }

        // OTP HỢP LỆ -> Tạo resetToken an toàn
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedResetToken = await bcrypt.hash(resetToken, 10);

        // Cập nhật trạng thái đã xác thực và lưu resetToken
        resetRecord.verifiedAt = new Date();
        resetRecord.resetTokenHash = hashedResetToken;
        resetRecord.resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // Token có tác dụng 15 phút
        await resetRecord.save();

        // Trả resetToken về cho Frontend
        return res.status(200).json({
            message: "Xác thực thành công",
            resetToken
        });
    } catch (error) {
        console.error("Lỗi verifyOtp:", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// 3. Đặt lại mật khẩu
export const resetPassword = async (req, res) => {
    try {
        // LƯU Ý: Payload bây giờ nhận resetToken thay vì otp
        const { email, resetToken, newPassword } = req.body;

        if (!email || !resetToken || !newPassword) {
            return res.status(400).json({ message: "Thiếu thông tin yêu cầu" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự" });
        }

        const resetRecord = await PasswordResetOTP.findOne({ email });

        if (!resetRecord || !resetRecord.resetTokenHash || !resetRecord.resetTokenExpires) {
            return res.status(400).json({ message: "Yêu cầu không hợp lệ hoặc chưa xác thực OTP" });
        }

        // Kiểm tra resetToken hết hạn
        if (resetRecord.resetTokenExpires < new Date()) {
            return res.status(400).json({ message: "Phiên đặt lại mật khẩu đã hết hạn. Vui lòng thử lại." });
        }

        // Kiểm tra resetToken có khớp không
        const isValidToken = await bcrypt.compare(resetToken, resetRecord.resetTokenHash);
        if (!isValidToken) {
            return res.status(403).json({ message: "Mã xác thực không hợp lệ" });
        }

        // Mọi thứ hợp lệ -> Cập nhật mật khẩu
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy người dùng" });
        }

        user.hashedPassword = await bcrypt.hash(newPassword, 10);
        await user.save();

        // Xoá record OTP này (dùng xong thì huỷ)
        await PasswordResetOTP.deleteOne({ email });

        // BẢO MẬT: Đăng xuất khỏi mọi thiết bị
        await Session.deleteMany({ userId: user._id });

        return res.status(200).json({ message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại." });
    } catch (error) {
        console.error("Lỗi resetPassword:", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};
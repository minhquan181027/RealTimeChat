import nodemailer from 'nodemailer';

export const sendOtpEmail = async (email, otp) => {
    // Cấu hình tài khoản gửi mail (Nên dùng App Password của Gmail)
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER, // ví dụ: your-email@gmail.com
            pass: process.env.EMAIL_PASS  // Mật khẩu ứng dụng (App Password)
        }
    });

    const mailOptions = {
        from: '"Hệ thống" <no-reply@yourdomain.com>',
        to: email,
        subject: 'Mã xác thực khôi phục mật khẩu',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #333; text-align: center;">Khôi phục mật khẩu</h2>
                <p>Xin chào,</p>
                <p>Bạn đã yêu cầu khôi phục mật khẩu. Dưới đây là mã xác thực (OTP) của bạn:</p>
                <h1 style="text-align: center; color: #4F46E5; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
                <p style="color: #666; font-size: 14px;">Mã này sẽ hết hạn sau <b>5 phút</b>. Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
};
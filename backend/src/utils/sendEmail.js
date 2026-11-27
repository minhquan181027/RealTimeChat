import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOtpEmail = async (email, otp) => {
    const { data, error } = await resend.emails.send({
        // Nếu chưa có domain riêng, Resend cho dùng mặc định onboarding@resend.dev (chỉ gửi được tới email bạn dùng đăng ký Resend)
        // Nếu muốn gửi cho mọi người dùng, cần add 1 domain miễn phí/rẻ tiền vào Resend
        from: 'Hệ thống <onboarding@resend.dev>',
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
    });

    if (error) {
        throw new Error(error.message);
    }
};
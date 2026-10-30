import { z } from "zod";

// Bước 1: Nhập email để nhận OTP
export const forgotEmailSchema = z.object({
    email: z
        .string()
        .min(1, "Email là bắt buộc")
        .email("Email không hợp lệ"),
});

// Bước 2: Nhập mã OTP 6 số
export const otpSchema = z.object({
    otp: z
        .string()
        .min(1, "Mã OTP là bắt buộc")
        .length(6, "Mã OTP phải có đúng 6 chữ số")
        .regex(/^\d+$/, "Mã OTP chỉ được chứa chữ số"),
});

// Bước 3: Đặt lại mật khẩu
export const resetPasswordSchema = z
    .object({
        password: z
            .string()
            .min(1, "Mật khẩu là bắt buộc")
            .min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
        confirmPassword: z
            .string()
            .min(1, "Vui lòng xác nhận mật khẩu"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        path: ["confirmPassword"],
        message: "Mật khẩu xác nhận không khớp",
    });
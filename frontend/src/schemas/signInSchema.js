
import { z } from "zod";

export const signInSchema = z.object({
    email: z.string().min(1, "Email là bắt buộc").email("Email không hợp lệ"),
    password: z.string().min(1, "Mật khẩu là bắt buộc"),
});

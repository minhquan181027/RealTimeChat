import { cn } from "@/lib/utils";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { forgotEmailSchema, resetPasswordSchema } from "@/schemas/forgotPasswordSchema";
import { useAuthStore } from "@/stores/useAuthStore";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

export function ForgotPasswordForm({ className, ...props }) {
    const navigate = useNavigate();
    const { forgotPassword, verifyOtp, resetPassword } = useAuthStore();

    const [step, setStep] = useState(1);
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
    const [otpError, setOtpError] = useState("");
    const [countdown, setCountdown] = useState(RESEND_SECONDS);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [resetToken, setResetToken] = useState("");

    const otpRefs = useRef([]);

    const emailForm = useForm({
        resolver: zodResolver(forgotEmailSchema),
        defaultValues: { email: "" },
    });

    const passwordForm = useForm({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: { password: "", confirmPassword: "" },
    });

    useEffect(() => {
        if (step !== 2 || countdown <= 0) return;
        const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [step, countdown]);

    // ==== STEP 1 ====
    const onSendOtp = async (data) => {
        try {
            setLoading(true);
            await forgotPassword(data.email);
            setEmail(data.email);
            setOtp(Array(OTP_LENGTH).fill(""));
            setOtpError("");
            setCountdown(RESEND_SECONDS);
            setStep(2);
            toast.success("Mã OTP đã được gửi đến email của bạn.");
        } catch (error) {
            emailForm.setError("root", {
                type: "server",
                message: error.response?.data?.message || "Không thể gửi mã OTP. Vui lòng thử lại.",
            });
        } finally {
            setLoading(false);
        }
    };

    // ==== STEP 2 ====
    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];

        if (value.length > 1) {
            const digits = value.slice(0, OTP_LENGTH - index).split("");
            digits.forEach((d, i) => {
                if (index + i < OTP_LENGTH) newOtp[index + i] = d;
            });
            setOtp(newOtp);
            const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
            otpRefs.current[nextIndex]?.focus();
            return;
        }

        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
        if (e.key === "ArrowLeft" && index > 0) otpRefs.current[index - 1]?.focus();
        if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
    };

    const handleOtpPaste = (index, e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH - index);
        if (!pasted) return;
        const newOtp = [...otp];
        pasted.split("").forEach((d, i) => { newOtp[index + i] = d; });
        setOtp(newOtp);
        otpRefs.current[Math.min(index + pasted.length, OTP_LENGTH - 1)]?.focus();
    };

    const onResendOtp = async () => {
        if (countdown > 0 || loading) return;
        try {
            setLoading(true);
            await forgotPassword(email);
            setCountdown(RESEND_SECONDS);
            setOtp(Array(OTP_LENGTH).fill(""));
            setOtpError("");
            otpRefs.current[0]?.focus();
            toast.success("Đã gửi lại mã OTP.");
        } catch (error) {
            toast.error("Không thể gửi lại mã. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    const onVerifyOtp = async () => {
        const code = otp.join("");
        if (code.length !== OTP_LENGTH) {
            setOtpError("Vui lòng nhập đủ 6 chữ số.");
            return;
        }
        try {
            setLoading(true);
            setOtpError("");
            const res = await verifyOtp(email, code);
            setResetToken(res.resetToken); // LƯU LẠI TOKEN
            setStep(3);
            toast.success("Xác thực thành công. Vui lòng đặt mật khẩu mới.");
        } catch (error) {
            setOtpError(error.response?.data?.message || "Mã OTP không đúng hoặc đã hết hạn.");
        } finally {
            setLoading(false);
        }
    };

    // ==== STEP 3 ====
    const onResetPassword = async (data) => {
        try {
            setLoading(true);
            await resetPassword(email, resetToken, data.password);
            toast.success("Đặt lại mật khẩu thành công. Vui lòng đăng nhập.");
            navigate("/signin");
        } catch (error) {
            passwordForm.setError("root", {
                type: "server",
                message: error.response?.data?.message || "Đặt lại mật khẩu thất bại. Vui lòng thử lại.",
            });
        } finally {
            setLoading(false);
        }
    };

    const resetToStep1 = () => {
        setStep(1);
        setOtp(Array(OTP_LENGTH).fill(""));
        setOtpError("");
        setCountdown(RESEND_SECONDS);
        passwordForm.reset();
    };

    return (
        // SỬA Ở ĐÂY: Thêm w-full max-w-4xl mx-auto để form không bị kéo giãn toàn màn hình
        <div className={cn("flex flex-col gap-6 w-full max-w-4xl mx-auto", className)} {...props}>
            <Card className="overflow-hidden p-0 border-border shadow-lg">
                <CardContent className="grid p-0 md:grid-cols-2">
                    <div className="p-6 md:p-8">
                        {step > 1 && (
                            <button
                                type="button"
                                onClick={resetToStep1}
                                className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Quay lại
                            </button>
                        )}

                        <div className="flex flex-col items-center text-center gap-2 mb-6">
                            <Link to="/" className="mx-auto block w-fit transition-transform hover:scale-105">
                                <img src="/logo.svg" alt="Logo" className="h-10 w-auto" />
                            </Link>
                            <h1 className="text-2xl font-bold tracking-tight">
                                {step === 1 && "Quên mật khẩu"}
                                {step === 2 && "Nhập mã xác thực"}
                                {step === 3 && "Đặt lại mật khẩu"}
                            </h1>
                            <p className="text-muted-foreground text-sm text-balance">
                                {step === 1 && "Nhập email để nhận mã xác thực đặt lại mật khẩu"}
                                {step === 2 && (
                                    <>Mã 6 chữ số đã được gửi đến <span className="font-semibold text-foreground">{email}</span></>
                                )}
                                {step === 3 && "Tạo mật khẩu mới cho tài khoản của bạn"}
                            </p>
                        </div>

                        {/* STEP 1 */}
                        {step === 1 && (
                            <form onSubmit={emailForm.handleSubmit(onSendOtp)} className="flex flex-col gap-6" noValidate>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <div className="relative group">
                                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="name@example.com"
                                            autoComplete="email"
                                            autoFocus
                                            className="pl-9 bg-muted/50 focus-visible:bg-transparent transition-colors"
                                            {...emailForm.register("email")}
                                            aria-invalid={!!emailForm.formState.errors.email}
                                        />
                                    </div>
                                    {emailForm.formState.errors.email && (
                                        <p className="text-[13px] font-medium text-destructive animate-in fade-in slide-in-from-top-1">
                                            {emailForm.formState.errors.email.message}
                                        </p>
                                    )}
                                </div>

                                {emailForm.formState.errors.root && (
                                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                                        <p role="alert" className="text-sm text-destructive font-medium">
                                            {emailForm.formState.errors.root.message}
                                        </p>
                                    </div>
                                )}

                                <Button type="submit" className="w-full font-semibold shadow-md hover:shadow-lg transition-all duration-200" disabled={loading}>
                                    {loading ? "Đang gửi..." : "Gửi mã xác thực"}
                                </Button>

                                <div className="text-center text-sm text-muted-foreground">
                                    Nhớ ra mật khẩu rồi?{" "}
                                    <Link to="/signin" className="font-semibold text-primary hover:underline underline-offset-4">
                                        Đăng nhập
                                    </Link>
                                </div>
                            </form>
                        )}

                        {/* STEP 2 */}
                        {step === 2 && (
                            <div className="flex flex-col gap-6">
                                <div className="space-y-3">
                                    <Label className="flex items-center gap-2">
                                        <ShieldCheck className="h-4 w-4 text-primary" />
                                        Mã OTP
                                    </Label>

                                    <div className="flex justify-between gap-2">
                                        {otp.map((digit, index) => (
                                            <Input
                                                key={index}
                                                ref={(el) => (otpRefs.current[index] = el)}
                                                type="text"
                                                inputMode="numeric"
                                                autoComplete="one-time-code"
                                                maxLength={1}
                                                value={digit}
                                                autoFocus={index === 0}
                                                onChange={(e) => handleOtpChange(index, e.target.value)}
                                                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                                onPaste={(e) => handleOtpPaste(index, e)}
                                                className="h-12 w-12 text-center text-lg font-semibold bg-muted/50 focus-visible:bg-transparent transition-colors"
                                                aria-invalid={!!otpError}
                                            />
                                        ))}
                                    </div>

                                    {otpError && (
                                        <p className="text-[13px] font-medium text-destructive animate-in fade-in slide-in-from-top-1">
                                            {otpError}
                                        </p>
                                    )}
                                </div>

                                <Button
                                    type="button"
                                    onClick={onVerifyOtp}
                                    className="w-full font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                                    disabled={loading || otp.some((d) => !d)}
                                >
                                    {loading ? "Đang xác thực..." : "Xác nhận"}
                                </Button>

                                <div className="text-center text-sm text-muted-foreground">
                                    {countdown > 0 ? (
                                        <>Gửi lại mã sau <span className="font-semibold text-foreground tabular-nums">{formatTime(countdown)}</span></>
                                    ) : (
                                        <button type="button" onClick={onResendOtp} disabled={loading} className="font-semibold text-primary hover:underline underline-offset-4 disabled:opacity-50">
                                            Gửi lại mã OTP
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* STEP 3 */}
                        {step === 3 && (
                            <form onSubmit={passwordForm.handleSubmit(onResetPassword)} className="flex flex-col gap-6" noValidate>
                                <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-md">
                                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                                    <p className="text-xs text-muted-foreground">
                                        Email <span className="font-medium text-foreground">{email}</span> đã được xác thực.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password">Mật khẩu mới</Label>
                                    <div className="relative group">
                                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            autoComplete="new-password"
                                            autoFocus
                                            className="pl-9 pr-10 bg-muted/50 focus-visible:bg-transparent transition-colors"
                                            {...passwordForm.register("password")}
                                            aria-invalid={!!passwordForm.formState.errors.password}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((p) => !p)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    {passwordForm.formState.errors.password && (
                                        <p className="text-[13px] font-medium text-destructive animate-in fade-in slide-in-from-top-1">
                                            {passwordForm.formState.errors.password.message}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                                    <div className="relative group">
                                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                        <Input
                                            id="confirmPassword"
                                            type={showConfirm ? "text" : "password"}
                                            placeholder="••••••••"
                                            autoComplete="new-password"
                                            className="pl-9 pr-10 bg-muted/50 focus-visible:bg-transparent transition-colors"
                                            {...passwordForm.register("confirmPassword")}
                                            aria-invalid={!!passwordForm.formState.errors.confirmPassword}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm((p) => !p)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    {passwordForm.formState.errors.confirmPassword && (
                                        <p className="text-[13px] font-medium text-destructive animate-in fade-in slide-in-from-top-1">
                                            {passwordForm.formState.errors.confirmPassword.message}
                                        </p>
                                    )}
                                </div>

                                {passwordForm.formState.errors.root && (
                                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                                        <p role="alert" className="text-sm text-destructive font-medium">
                                            {passwordForm.formState.errors.root.message}
                                        </p>
                                    </div>
                                )}

                                <Button type="submit" className="w-full font-semibold shadow-md hover:shadow-lg transition-all duration-200" disabled={loading}>
                                    {loading ? "Đang cập nhật..." : "Đặt lại mật khẩu"}
                                </Button>
                            </form>
                        )}
                    </div>

                    {/* SỬA Ở ĐÂY: Thêm min-h-[500px] để ảnh không bị xẹp */}
                    <div className="relative hidden bg-muted md:block min-h-[500px]">
                        <img src="/placeholder.png" alt="Minh họa quên mật khẩu" className="absolute inset-0 h-full w-full object-cover" />
                    </div>
                </CardContent>
            </Card>

            <FieldDescription className="px-6 text-center text-xs text-muted-foreground">
                Bằng cách tiếp tục, bạn đồng ý với{" "}
                <a href="#" className="underline hover:text-primary transition-colors">Điều khoản dịch vụ</a>{" "}
                và{" "}
                <a href="#" className="underline hover:text-primary transition-colors">Chính sách bảo mật</a>.
            </FieldDescription>
        </div>
    );
}
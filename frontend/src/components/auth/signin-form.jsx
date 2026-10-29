import { cn } from "@/lib/utils";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { signInSchema } from "@/schemas/signInSchema";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNavigate } from "react-router";
import { toast } from "sonner";
// Quay lại dùng GoogleLogin như ban đầu
import { GoogleLogin } from "@react-oauth/google";

export function SignInForm({ className, ...props }) {
    const [showPassword, setShowPassword] = useState(false);
    const { signIn, googleLogin } = useAuthStore();
    const navigate = useNavigate();
    const {
        register,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(signInSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const onSubmit = async (data) => {
        try {
            const { email, password } = data;
            await signIn(email, password);
            navigate("/");
        } catch (error) {
            setError("root", {
                type: "server",
                message:
                    error.response?.data?.message ||
                    "Đăng nhập thất bại. Vui lòng thử lại.",
            });
        }
    };

    // Logic gốc của bro (nhận response.credential)
    const handleGoogleSuccess = async (response) => {
        try {
            if (!response.credential) {
                toast.error("Không nhận được thông tin xác thực Google.");
                return;
            }

            await googleLogin(response.credential);

            toast.success("Đăng nhập thành công!");
            navigate("/");
        } catch (error) {
            const message =
                error.response?.data?.message ||
                "Đăng nhập bằng Google thất bại.";

            toast.error(message);
        }
    };

    return (
        <div
            className={cn("flex flex-col gap-6", className)}
            {...props}
        >
            <Card className="overflow-hidden p-0 border-border shadow-lg">
                <CardContent className="grid p-0 md:grid-cols-2">
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="p-6 md:p-8"
                        noValidate
                    >
                        <div className="flex flex-col gap-6">
                            {/* Header */}
                            <div className="flex flex-col items-center text-center gap-2 mb-2">
                                <a href="/" className="mx-auto block w-fit transition-transform hover:scale-105">
                                    <img src="/logo.svg" alt="Logo" className="h-10 w-auto" />
                                </a>

                                <h1 className="text-2xl font-bold tracking-tight">
                                    Chào mừng trở lại
                                </h1>

                                <p className="text-muted-foreground text-sm text-balance">
                                    Nhập email và mật khẩu để tiếp tục
                                </p>
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>

                                <div className="relative group">
                                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />

                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        autoComplete="email"
                                        className="pl-9 bg-muted/50 focus-visible:bg-transparent transition-colors"
                                        {...register("email")}
                                        aria-invalid={!!errors.email}
                                    />
                                </div>

                                {errors.email && (
                                    <p className="text-[13px] font-medium text-destructive animate-in fade-in slide-in-from-top-1">
                                        {errors.email.message}
                                    </p>
                                )}
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <Label htmlFor="password">Mật khẩu</Label>

                                    <a
                                        href="/forgot-password"
                                        className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        Quên mật khẩu?
                                    </a>
                                </div>

                                <div className="relative group">
                                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />

                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        className="pl-9 pr-10 bg-muted/50 focus-visible:bg-transparent transition-colors"
                                        {...register("password")}
                                        aria-invalid={!!errors.password}
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        aria-label={
                                            showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                                        }
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>

                                {errors.password && (
                                    <p className="text-[13px] font-medium text-destructive animate-in fade-in slide-in-from-top-1">
                                        {errors.password.message}
                                    </p>
                                )}
                            </div>

                            {/* Server error */}
                            {errors.root && (
                                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                                    <p
                                        role="alert"
                                        className="text-sm text-destructive font-medium"
                                    >
                                        {errors.root.message}
                                    </p>
                                </div>
                            )}

                            {/* Submit */}
                            <Button
                                type="submit"
                                className="w-full font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
                            </Button>

                            {/* Divider */}
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-border" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-card px-2 text-muted-foreground font-medium tracking-wider">
                                        Hoặc tiếp tục với
                                    </span>
                                </div>
                            </div>

                            {/* Google - Giữ nguyên component gốc, chỉnh theme cho đẹp hơn */}
                            <div className="w-full flex justify-center">
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={() => {
                                        toast.error("Không thể xác thực với Google.");
                                    }}
                                    text="signin_with"
                                    shape="rectangular"
                                    size="large"
                                    theme="outline" /* Thêm theme outline cho hợp với form */
                                    width="320"
                                />
                            </div>

                            {/* Sign up */}
                            <div className="text-center text-sm text-muted-foreground">
                                Chưa có tài khoản?{" "}
                                <a
                                    href="/signup"
                                    className="font-semibold text-primary hover:underline underline-offset-4"
                                >
                                    Đăng ký ngay
                                </a>
                            </div>
                        </div>
                    </form>

                    {/* Side image - Đã bỏ overlay theo yêu cầu */}
                    <div className="relative hidden bg-muted md:block">
                        <img
                            src="/placeholder.png"
                            alt="Minh họa đăng nhập"
                            className="absolute inset-0 h-full w-full object-cover"
                        />
                    </div>
                </CardContent>
            </Card>

            <FieldDescription className="px-6 text-center text-xs text-muted-foreground">
                Bằng cách tiếp tục, bạn đồng ý với{" "}
                <a href="#" className="underline hover:text-primary transition-colors">
                    Điều khoản dịch vụ
                </a>{" "}
                và{" "}
                <a href="#" className="underline hover:text-primary transition-colors">
                    Chính sách bảo mật
                </a>
                .
            </FieldDescription>
        </div>
    );
}
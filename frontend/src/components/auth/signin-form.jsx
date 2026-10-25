
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

export function SignInForm({ className, ...props }) {
    const [showPassword, setShowPassword] = useState(false);
    const { signIn } = useAuthStore();
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

    return (
        <div
            className={cn("flex flex-col gap-6", className)}
            {...props}
        >
            <Card className="overflow-hidden p-0 border-border">
                <CardContent className="grid p-0 md:grid-cols-2">
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="p-6 md:p-8"
                        noValidate
                    >
                        <div className="flex flex-col gap-6">
                            {/* Header */}
                            <div className="flex flex-col items-center text-center gap-2">
                                <a href="/" className="mx-auto block w-fit">
                                    <img src="/logo.svg" alt="Logo" />
                                </a>

                                <h1 className="text-2xl font-bold">
                                    Đăng nhập
                                </h1>

                                <p className="text-muted-foreground text-balance">
                                    Chào mừng bạn quay trở lại!
                                </p>
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>

                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        autoComplete="email"
                                        className="pl-9"
                                        {...register("email")}
                                        aria-invalid={!!errors.email}
                                    />
                                </div>

                                {errors.email && (
                                    <p className="text-sm text-destructive">
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
                                        className="text-sm underline underline-offset-4 hover:text-primary"
                                    >
                                        Quên mật khẩu?
                                    </a>
                                </div>

                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Nhập mật khẩu..."
                                        autoComplete="current-password"
                                        className="pl-9 pr-10"
                                        {...register("password")}
                                        aria-invalid={!!errors.password}
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                                    <p className="text-sm text-destructive">
                                        {errors.password.message}
                                    </p>
                                )}
                            </div>

                            {/* Server error */}
                            {errors.root && (
                                <p
                                    role="alert"
                                    className="text-sm text-destructive"
                                >
                                    {errors.root.message}
                                </p>
                            )}

                            {/* Submit */}
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
                            </Button>

                            {/* Divider */}
                            <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                                <span className="relative z-10 bg-background px-2 text-muted-foreground">
                                    Hoặc tiếp tục với
                                </span>
                            </div>

                            {/* Google */}
                            <Button
                                variant="outline"
                                type="button"
                                className="w-full flex items-center justify-center gap-2"
                                onClick={() => {
                                    // TODO: Tích hợp Google OAuth
                                }}
                            >
                                <svg
                                    className="h-4 w-4"
                                    viewBox="0 0 48 48"
                                    aria-hidden="true"
                                >
                                    <path
                                        fill="#EA4335"
                                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 3.2 13.22l7.98 6.19C13.07 13.72 18.12 9.5 24 9.5Z"
                                    />
                                    <path
                                        fill="#4285F4"
                                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.77 7.18l7.73 6C44.4 37.94 46.98 31.7 46.98 24.55Z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M11.18 28.59A14.4 14.4 0 0 1 10.4 24c0-1.59.27-3.13.76-4.59L3.2 13.22A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 3.2 10.78l7.98-6.19Z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.14 1.43-4.89 2.28-8.17 2.28-5.88 0-10.93-3.96-12.82-9.3L3.2 35.38C6.51 42.62 14.62 48 24 48Z"
                                    />
                                </svg>

                                Đăng nhập bằng Google
                            </Button>

                            {/* Sign up */}
                            <div className="text-center text-sm">
                                Chưa có tài khoản?{" "}
                                <a
                                    href="/signup"
                                    className="underline underline-offset-4 hover:text-primary"
                                >
                                    Đăng ký ngay
                                </a>
                            </div>
                        </div>
                    </form>

                    {/* Side image */}
                    <div className="relative hidden bg-muted md:block">
                        <img
                            src="/placeholder.png"
                            alt="Minh họa đăng nhập"
                            className="absolute inset-0 h-full w-full object-cover"
                        />
                    </div>
                </CardContent>
            </Card>

            <FieldDescription className="px-6 text-center">
                Bằng cách tiếp tục, bạn đồng ý với{" "}
                <a href="#" className="underline">
                    Điều khoản dịch vụ
                </a>{" "}
                và{" "}
                <a href="#" className="underline">
                    Chính sách bảo mật
                </a>
                .
            </FieldDescription>
        </div>
    );
}

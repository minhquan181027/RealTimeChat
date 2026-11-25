import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { chatService } from "@/services/chatService";
import { useAuthStore } from "@/stores/useAuthStore";

const SetupProfilePage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const completeSetup = useAuthStore((state) => state.completeSetup);
    const signOut = useAuthStore((state) => state.signOut);
    const requiresPassword = user?.requiresPassword;
    const fileRef = useRef(null);
    const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const {
        register,
        handleSubmit,
        getValues,
        setError,
        clearErrors,
        formState: { errors, isSubmitting },
    } = useForm({
        defaultValues: {
            username: user?.username || "",
            displayName: user?.displayName || "",
            bio: user?.bio || "",
            gender: user?.gender || "",
            dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().slice(0, 10) : "",
            password: "",
            confirmPassword: "",
        },
    });

    const onSubmit = async ({ confirmPassword, ...data }) => {
        if (requiresPassword && data.password !== confirmPassword) {
            setError("confirmPassword", { type: "validate", message: t("setup.passwordMismatch") });
            return;
        }

        try {
            await completeSetup({ ...data, avatarUrl: avatarUrl || undefined });
            navigate("/", { replace: true });
        } catch (error) {
            const { field, message } = error.response?.data ?? {};
            if (field) {
                setError(field, { type: "server", message: message || t("setup.saveError") });
            } else {
                setError("root", { type: "server", message: message || t("setup.saveError") });
            }
        }
    };

    const handleAvatarSelect = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setError("root", { type: "validate", message: t("setup.avatarImageOnly") });
            return;
        }

        setUploadingAvatar(true);
        clearErrors("root");
        try {
            const url = await chatService.uploadImage(file);
            setAvatarUrl(url);
        } catch (error) {
            setError("root", {
                type: "server",
                message: error.response?.data?.message || t("setup.avatarUploadFailed"),
            });
        } finally {
            setUploadingAvatar(false);
        }
    };

    const fieldError = (name) => errors[name] && (
        <p className="text-sm text-destructive" role="alert">{errors[name].message}</p>
    );

    return (
        <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-lg shadow-lg">
                <CardContent className="p-6 sm:p-8">
                    <div className="mb-6 flex flex-col items-center gap-3 text-center">
                        <img src="/logo.svg" alt="Logo" className="h-10 w-auto" />
                        <h1 className="text-2xl font-bold">{t("setup.title")}</h1>
                        <p className="text-sm text-muted-foreground">{t("setup.description")}</p>
                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                        <div className="flex items-center gap-4 rounded-lg border p-4">
                            <img
                                src={avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || "U")}&background=random`}
                                alt={t("setup.avatar")}
                                className={`size-16 rounded-full object-cover ${uploadingAvatar ? "opacity-50" : ""}`}
                            />
                            <div className="space-y-2">
                                <p className="text-sm font-medium">{t("setup.avatar")}</p>
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleAvatarSelect}
                                />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    disabled={uploadingAvatar || isSubmitting}
                                    onClick={() => fileRef.current?.click()}
                                >
                                    <Camera />
                                    {uploadingAvatar ? t("setup.uploadingAvatar") : t("setup.chooseAvatar")}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="displayName">{t("setup.displayName")}</Label>
                            <Input
                                id="displayName"
                                autoComplete="name"
                                aria-invalid={!!errors.displayName}
                                {...register("displayName", {
                                    required: t("setup.nameRequired"),
                                    maxLength: { value: 50, message: t("setup.nameMax") },
                                })}
                            />
                            {fieldError("displayName")}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="username">{t("setup.username")}</Label>
                            <Input
                                id="username"
                                autoComplete="username"
                                aria-invalid={!!errors.username}
                                {...register("username", {
                                    required: t("setup.usernameRequired"),
                                    minLength: { value: 3, message: t("setup.usernameFormat") },
                                    maxLength: { value: 30, message: t("setup.usernameFormat") },
                                    pattern: { value: /^[a-zA-Z0-9._]+$/, message: t("setup.usernameFormat") },
                                })}
                            />
                            {fieldError("username")}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bio">{t("setup.bio")}</Label>
                            <textarea
                                id="bio"
                                maxLength={500}
                                rows={3}
                                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                                {...register("bio", {
                                    maxLength: { value: 500, message: t("setup.bioMax") },
                                })}
                            />
                            {fieldError("bio")}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="gender">{t("setup.gender")}</Label>
                                <select
                                    id="gender"
                                    className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                                    {...register("gender")}
                                >
                                    <option value="">{t("setup.genderOptional")}</option>
                                    <option value="male">{t("gender.male")}</option>
                                    <option value="female">{t("gender.female")}</option>
                                    <option value="other">{t("gender.other")}</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dateOfBirth">{t("setup.dateOfBirth")}</Label>
                                <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
                            </div>
                        </div>

                        {requiresPassword && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="password">{t("setup.password")}</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        autoComplete="new-password"
                                        aria-invalid={!!errors.password}
                                        {...register("password", {
                                            required: t("setup.passwordRequired"),
                                            minLength: { value: 6, message: t("setup.passwordMin") },
                                        })}
                                    />
                                    {fieldError("password")}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">{t("setup.confirmPassword")}</Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        autoComplete="new-password"
                                        aria-invalid={!!errors.confirmPassword}
                                        {...register("confirmPassword", {
                                            required: t("setup.passwordRequired"),
                                            validate: (value) => value === getValues("password") || t("setup.passwordMismatch"),
                                        })}
                                    />
                                    {fieldError("confirmPassword")}
                                </div>
                            </>
                        )}

                        {errors.root && (
                            <p className="text-sm text-destructive" role="alert">{errors.root.message}</p>
                        )}

                        <Button type="submit" className="w-full" disabled={isSubmitting || uploadingAvatar}>
                            {isSubmitting ? t("setup.saving") : t("setup.continue")}
                        </Button>
                    </form>

                    <Button
                        type="button"
                        variant="ghost"
                        className="mt-2 w-full"
                        onClick={async () => {
                            await signOut();
                            navigate("/signin", { replace: true });
                        }}
                    >
                        {t("setup.signOut")}
                    </Button>
                </CardContent>
            </Card>
        </main>
    );
};

export default SetupProfilePage;

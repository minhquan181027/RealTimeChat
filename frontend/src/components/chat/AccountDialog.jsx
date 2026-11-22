import { useRef, useState } from "react";
import { Camera, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/useAuthStore";
import { chatService } from "@/services/chatService";
import { localeOf } from "@/i18n";

const GENDERS = ["male", "female", "other"];

const formatDob = (d) => (d ? new Date(d).toLocaleDateString(localeOf(), { timeZone: "UTC" }) : null);

const avatarOf = (u) =>
    u?.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(u?.displayName || "U")}&background=random`;

const Row = ({ label, value }) => {
    const { t } = useTranslation();
    return (
        <div className="flex gap-4 py-1 text-sm">
            <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
            <span className="min-w-0 break-words font-medium">
                {value || <span className="font-normal text-muted-foreground">{t("common.notSet")}</span>}
            </span>
        </div>
    );
};

const AccountBody = () => {
    const { t } = useTranslation();
    const user = useAuthStore((s) => s.user);
    const fileRef = useRef(null);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [form, setForm] = useState({});

    const startEdit = () => {
        setForm({
            displayName: user.displayName || "",
            gender: user.gender || "",
            dateOfBirth: user.dateOfBirth ? user.dateOfBirth.slice(0, 10) : "",
            phone: user.phone || "",
            bio: user.bio || "",
        });
        setEditing(true);
    };

    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

    const handleSave = async () => {
        if (!form.displayName.trim()) {
            toast.error(t("account.nameEmpty"));
            return;
        }
        setSaving(true);
        try {
            await useAuthStore.getState().updateProfile(form);
            toast.success(t("account.updated"));
            setEditing(false);
        } catch (err) {
            toast.error(err.response?.data?.message || t("account.updateFailed"));
        } finally {
            setSaving(false);
        }
    };

    const handleAvatar = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        setUploading(true);
        try {
            const url = await chatService.uploadImage(file);
            await useAuthStore.getState().updateProfile({ avatarUrl: url });
            toast.success(t("account.avatarChanged"));
        } catch (err) {
            toast.error(err.response?.data?.message || t("account.avatarFailed"));
        } finally {
            setUploading(false);
        }
    };

    return (
        <>
            <div className="h-28 bg-gradient-to-r from-primary/40 to-primary/10" />

            <div className="-mt-10 flex items-end gap-3 px-4">
                <div className="relative shrink-0">
                    <img
                        src={avatarOf(user)}
                        alt={user.displayName}
                        className={`size-20 rounded-full object-cover ring-4 ring-background ${uploading ? "opacity-50" : ""}`}
                    />
                    <button
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border bg-background shadow hover:bg-muted"
                        title={t("account.changeAvatar")}
                    >
                        <Camera className="size-4" />
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
                </div>
                <h3 className="mb-1 truncate text-lg font-semibold">{user.displayName}</h3>
            </div>

            <div className="mt-4 border-t px-4 py-4">
                <p className="mb-2 text-sm font-semibold">{t("profile.personal")}</p>

                {!editing ? (
                    <>
                        <Row label={t("account.email")} value={user.email} />
                        <Row label={t("profile.gender")} value={user.gender ? t(`gender.${user.gender}`) : null} />
                        <Row label={t("profile.dob")} value={formatDob(user.dateOfBirth)} />
                        <Row label={t("account.phone")} value={user.phone} />
                        <Row label={t("account.bio")} value={user.bio} />
                        <Button variant="secondary" className="mt-4 w-full" onClick={startEdit}>
                            <Pencil /> {t("account.update")}
                        </Button>
                    </>
                ) : (
                    <div className="space-y-3">
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">{t("account.displayName")}</label>
                            <Input value={form.displayName} onChange={set("displayName")} maxLength={50} />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">{t("profile.gender")}</label>
                            <div className="flex gap-4 text-sm">
                                {GENDERS.map((g) => (
                                    <label key={g} className="flex cursor-pointer items-center gap-1.5">
                                        <input
                                            type="radio"
                                            name="gender"
                                            checked={form.gender === g}
                                            onChange={() => setForm((f) => ({ ...f, gender: g }))}
                                        />
                                        {t(`gender.${g}`)}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">{t("profile.dob")}</label>
                            <Input
                                type="date"
                                value={form.dateOfBirth}
                                max={new Date().toISOString().slice(0, 10)}
                                onChange={set("dateOfBirth")}
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">{t("account.phoneLabel")}</label>
                            <Input value={form.phone} onChange={set("phone")} placeholder={t("account.phonePlaceholder")} />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">
                                {t("account.bio")} ({form.bio.length}/500)
                            </label>
                            <textarea
                                value={form.bio}
                                onChange={set("bio")}
                                maxLength={500}
                                rows={3}
                                className="w-full resize-none rounded-lg border bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                            />
                        </div>

                        <div className="flex gap-2 pt-1">
                            <Button variant="secondary" className="flex-1" onClick={() => setEditing(false)}>
                                {t("common.cancel")}
                            </Button>
                            <Button className="flex-1" disabled={saving} onClick={handleSave}>
                                {saving ? t("account.saving") : t("account.save")}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

const AccountDialog = ({ open, onOpenChange }) => {
    const { t } = useTranslation();
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-md">
                <DialogHeader className="px-4 py-3">
                    <DialogTitle>{t("account.title")}</DialogTitle>
                </DialogHeader>
                {open && <AccountBody />}
            </DialogContent>
        </Dialog>
    );
};

export default AccountDialog;
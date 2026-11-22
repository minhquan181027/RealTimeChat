import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LANGUAGES, setLanguage } from "@/i18n";
import { useAuthStore } from "@/stores/useAuthStore";

const LanguageDialog = ({ open, onOpenChange }) => {
    const { t, i18n } = useTranslation();
    const user = useAuthStore((s) => s.user);
    const autoTranslate = user?.autoTranslate !== false;

    const choose = async (code) => {
        setLanguage(code);
        onOpenChange(false);
        try {
            await useAuthStore.getState().updateProfile({ language: code });
        } catch (err) {
            console.error("Không lưu được ngôn ngữ:", err);
        }
    };

    const toggleAuto = async (checked) => {
        try {
            await useAuthStore.getState().updateProfile({ autoTranslate: checked });
        } catch (err) {
            toast.error(err.response?.data?.message || t("account.updateFailed"));
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="gap-0 p-0 sm:max-w-sm">
                <DialogHeader className="px-4 py-3">
                    <DialogTitle>{t("language.title")}</DialogTitle>
                </DialogHeader>

                <div className="border-t py-1">
                    {LANGUAGES.map((l) => (
                        <button
                            key={l.code}
                            onClick={() => choose(l.code)}
                            className="flex w-full items-center justify-between px-4 py-3 text-sm hover:bg-muted/60"
                        >
                            {l.label}
                            {i18n.language === l.code && <Check className="size-4 text-primary" />}
                        </button>
                    ))}
                </div>

                <label className="flex cursor-pointer items-start gap-3 border-t px-4 py-3">
                    <input
                        type="checkbox"
                        className="mt-1"
                        checked={autoTranslate}
                        onChange={(e) => toggleAuto(e.target.checked)}
                    />
                    <span className="text-sm">
                        {t("language.autoTranslate")}
                        <span className="block text-xs text-muted-foreground">
                            {t("language.autoTranslateHint")}
                        </span>
                    </span>
                </label>
            </DialogContent>
        </Dialog>
    );
};

export default LanguageDialog;
import { useState } from "react";
import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useUserSearch } from "@/hooks/useUserSearch";
import { friendService } from "@/services/friendService";

const avatarOf = (u) =>
    u.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName)}&background=random`;

const AddFriendBody = ({ onPickUser, onClose }) => {
    const { t } = useTranslation();
    const [keyword, setKeyword] = useState("");
    const { canSearch, searching, users, patchUser } = useUserSearch(keyword);

    const handleAdd = async (e, user) => {
        e.stopPropagation();
        try {
            await friendService.sendRequest(user._id);
            patchUser(user._id, { relation: "sent" });
            toast.success(t("toast.requestSent"));
        } catch (err) {
            toast.error(err.response?.data?.message || t("toast.requestFailed"));
        }
    };

    const handleOpenChat = (user) => {
        onPickUser?.(user);
        onClose();
    };

    const renderAction = (u) => {
        if (u.relation === "friend")
            return <span className="text-xs text-muted-foreground">{t("addFriend.friend")}</span>;
        if (u.relation === "sent")
            return <span className="text-xs text-muted-foreground">{t("addFriend.sentReq")}</span>;
        if (u.relation === "received")
            return <span className="text-xs text-muted-foreground">{t("addFriend.waiting")}</span>;
        return (
            <button
                onClick={(e) => handleAdd(e, u)}
                className="rounded-md border px-3 py-1 text-sm font-medium text-primary hover:bg-muted"
            >
                {t("addFriend.add")}
            </button>
        );
    };

    return (
        <>
            <div className="px-4 pb-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-70" />
                    <Input
                        autoFocus
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder={t("addFriend.placeholder")}
                        className="h-10 rounded-full border-none bg-muted pl-9 pr-9 shadow-none"
                    />
                    {keyword && (
                        <button
                            onClick={() => setKeyword("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        >
                            <X className="size-4" />
                        </button>
                    )}
                </div>
            </div>

            <div className="h-96 overflow-y-auto border-t">
                {!canSearch ? (
                    <p className="p-4 text-sm text-muted-foreground">{t("addFriend.minChars")}</p>
                ) : searching ? (
                    <p className="p-4 text-sm text-muted-foreground">{t("addFriend.searching")}</p>
                ) : users.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">{t("addFriend.notFound")}</p>
                ) : (
                    users.map((u) => (
                        <div
                            key={u._id}
                            role="button"
                            onClick={() => handleOpenChat(u)}
                            className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-muted/60"
                        >
                            <img src={avatarOf(u)} alt={u.displayName} className="size-11 rounded-full object-cover" />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{u.displayName}</p>
                                <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                            </div>
                            {renderAction(u)}
                        </div>
                    ))
                )}
            </div>
        </>
    );
};

const AddFriendDialog = ({ open, onOpenChange, onPickUser }) => {
    const { t } = useTranslation();
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="gap-0 p-0 sm:max-w-xl">
                <DialogHeader className="px-4 py-3">
                    <DialogTitle>{t("addFriend.title")}</DialogTitle>
                </DialogHeader>
                <AddFriendBody onPickUser={onPickUser} onClose={() => onOpenChange(false)} />
            </DialogContent>
        </Dialog>
    );
};

export default AddFriendDialog;
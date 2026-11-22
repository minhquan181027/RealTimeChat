import { useEffect, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "cn";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUserSearch } from "@/hooks/useUserSearch";
import { friendService } from "@/services/friendService";
import { chatService } from "@/services/chatService";
import { useChatStore } from "@/stores/useChatStore";

const avatarOf = (u) =>
    u.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName)}&background=random`;

const AddMembersBody = ({ conversationId, existingIds, onClose }) => {
    const { t } = useTranslation();
    const [keyword, setKeyword] = useState("");
    const [selected, setSelected] = useState({});
    const [friends, setFriends] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const { canSearch, searching, users } = useUserSearch(keyword);

    useEffect(() => {
        let cancelled = false;
        friendService
            .getFriends()
            .then((l) => !cancelled && setFriends(l))
            .catch(() => !cancelled && setFriends([]));
        return () => { cancelled = true; };
    }, []);

    const toggle = (u) =>
        setSelected((s) => {
            const next = { ...s };
            if (next[u._id]) delete next[u._id];
            else next[u._id] = u;
            return next;
        });

    const selectedList = Object.values(selected);
    const source = canSearch ? users : friends || [];
    const list = source.filter((u) => !existingIds.includes(u._id?.toString()));
    const loading = canSearch ? searching : friends === null;

    const handleAdd = async () => {
        setSubmitting(true);
        try {
            await chatService.addMembers(conversationId, selectedList.map((u) => u._id));
            await useChatStore.getState().fetchConversations();
            toast.success(t("addMembers.done"));
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || t("addMembers.failed"));
            setSubmitting(false);
        }
    };

    return (
        <>
            <div className="px-4 pb-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-70" />
                    <Input
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder={t("addMembers.search")}
                        className="h-10 rounded-full border-none bg-muted pl-9 shadow-none"
                    />
                </div>
            </div>

            {selectedList.length > 0 && (
                <div className="flex flex-wrap gap-2 px-4 pb-2">
                    {selectedList.map((u) => (
                        <span key={u._id} className="flex items-center gap-1 rounded-full bg-muted py-1 pl-1 pr-2 text-xs">
                            <img src={avatarOf(u)} alt="" className="size-5 rounded-full object-cover" />
                            {u.displayName}
                            <button onClick={() => toggle(u)}><X className="size-3" /></button>
                        </span>
                    ))}
                </div>
            )}

            <div className="h-80 overflow-y-auto border-t">
                <p className="px-4 pt-3 text-xs font-semibold text-muted-foreground">
                    {canSearch ? t("createGroup.results") : t("createGroup.friends")}
                </p>
                {loading ? (
                    <p className="p-4 text-sm text-muted-foreground">{t("common.loading")}</p>
                ) : list.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">{t("addMembers.nobody")}</p>
                ) : (
                    list.map((u) => {
                        const checked = !!selected[u._id];
                        return (
                            <div
                                key={u._id}
                                role="button"
                                onClick={() => toggle(u)}
                                className="flex cursor-pointer items-center gap-3 px-4 py-2 hover:bg-muted/60"
                            >
                                <span className={cn(
                                    "flex size-5 shrink-0 items-center justify-center rounded-full border",
                                    checked && "border-primary bg-primary text-primary-foreground"
                                )}>
                                    {checked && <Check className="size-3" />}
                                </span>
                                <img src={avatarOf(u)} alt={u.displayName} className="size-10 rounded-full object-cover" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">{u.displayName}</p>
                                    {canSearch && u.relation !== "friend" && (
                                        <p className="text-xs text-muted-foreground">{t("addMembers.stranger")}</p>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <div className="flex justify-end gap-2 border-t bg-background px-4 py-3">
                <Button variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
                <Button disabled={selectedList.length === 0 || submitting} onClick={handleAdd}>
                    {submitting
                        ? t("addMembers.adding")
                        : `${t("addMembers.add")}${selectedList.length ? ` (${selectedList.length})` : ""}`}
                </Button>
            </div>
        </>
    );
};

const AddMembersDialog = ({ open, onOpenChange, conversationId, existingIds }) => {
    const { t } = useTranslation();
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="gap-0 p-0 sm:max-w-xl">
                <DialogHeader className="px-4 py-3">
                    <DialogTitle>{t("addMembers.title")}</DialogTitle>
                </DialogHeader>
                <AddMembersBody
                    conversationId={conversationId}
                    existingIds={existingIds}
                    onClose={() => onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    );
};

export default AddMembersDialog;
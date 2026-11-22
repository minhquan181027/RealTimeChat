import { useEffect, useState } from "react";
import { Camera, Check, Search, X } from "lucide-react";
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

const CreateGroupBody = ({ onClose, onCreated }) => {
    const { t } = useTranslation();
    const [name, setName] = useState("");
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [keyword, setKeyword] = useState("");
    const [selected, setSelected] = useState({});
    const [friends, setFriends] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const { canSearch, searching, users } = useUserSearch(keyword);

    useEffect(() => {
        let cancelled = false;
        friendService
            .getFriends()
            .then((list) => !cancelled && setFriends(list))
            .catch(() => !cancelled && setFriends([]));
        return () => { cancelled = true; };
    }, []);

    useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

    const handleFile = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setFile(f);
        setPreview(URL.createObjectURL(f));
    };

    const toggle = (u) =>
        setSelected((s) => {
            const next = { ...s };
            if (next[u._id]) delete next[u._id];
            else next[u._id] = u;
            return next;
        });

    const selectedList = Object.values(selected);
    const canCreate = name.trim() && selectedList.length >= 2 && !submitting;

    const handleCreate = async () => {
        setSubmitting(true);
        try {
            const avatarUrl = file ? await chatService.uploadImage(file) : undefined;
            const { conversation } = await chatService.createConversation({
                type: "group",
                name: name.trim(),
                memberIds: selectedList.map((u) => u._id),
                avatarUrl,
            });
            await useChatStore.getState().fetchConversations();
            onCreated?.(conversation._id);
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || t("createGroup.failed"));
            setSubmitting(false);
        }
    };

    const list = canSearch ? users : friends || [];
    const loading = canSearch ? searching : friends === null;

    const hint = !name.trim()
        ? t("createGroup.enterName")
        : selectedList.length < 2
            ? t("createGroup.pickMore", { n: 2 - selectedList.length })
            : t("createGroup.selected", { n: selectedList.length });

    return (
        <>
            <div className="flex items-center gap-3 px-4 pb-3">
                <label className="flex size-12 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border bg-muted">
                    {preview ? (
                        <img src={preview} alt={t("createGroup.photo")} className="size-full object-cover" />
                    ) : (
                        <Camera className="size-5 text-muted-foreground" />
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
                </label>
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={50}
                    placeholder={t("createGroup.namePlaceholder")}
                    className="border-0 border-b shadow-none focus-visible:ring-0"
                />
            </div>

            <div className="px-4 pb-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-70" />
                    <Input
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder={t("createGroup.search")}
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

            <div className="h-96 overflow-y-auto border-t">
                <p className="px-4 pt-3 text-xs font-semibold text-muted-foreground">
                    {canSearch ? t("createGroup.results") : t("createGroup.friends")}
                </p>
                {loading ? (
                    <p className="p-4 text-sm text-muted-foreground">{t("common.loading")}</p>
                ) : list.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">
                        {canSearch ? t("addFriend.notFound") : t("createGroup.noFriends")}
                    </p>
                ) : (
                    list.map((u) => {
                        const checked = !!selected[u._id];
                        const stranger = canSearch && u.relation !== "friend";
                        return (
                            <div
                                key={u._id}
                                role="button"
                                onClick={() => toggle(u)}
                                className="flex cursor-pointer items-center gap-3 px-4 py-2 hover:bg-muted/60"
                            >
                                <span
                                    className={cn(
                                        "flex size-5 shrink-0 items-center justify-center rounded-full border",
                                        checked && "border-primary bg-primary text-primary-foreground"
                                    )}
                                >
                                    {checked && <Check className="size-3" />}
                                </span>
                                <img src={avatarOf(u)} alt={u.displayName} className="size-10 rounded-full object-cover" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">{u.displayName}</p>
                                    {stranger && (
                                        <p className="text-xs text-muted-foreground">{t("createGroup.stranger")}</p>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t bg-background px-4 py-3">
                <p className="text-xs text-muted-foreground">{hint}</p>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
                    <Button disabled={!canCreate} onClick={handleCreate}>
                        {submitting ? t("createGroup.creating") : t("createGroup.create")}
                    </Button>
                </div>
            </div>
        </>
    );
};

const CreateGroupDialog = ({ open, onOpenChange, onCreated }) => {
    const { t } = useTranslation();
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="gap-0 p-0 sm:max-w-2xl">
                <DialogHeader className="px-4 py-3">
                    <DialogTitle>{t("createGroup.title")}</DialogTitle>
                </DialogHeader>
                <CreateGroupBody onClose={() => onOpenChange(false)} onCreated={onCreated} />
            </DialogContent>
        </Dialog>
    );
};

export default CreateGroupDialog;
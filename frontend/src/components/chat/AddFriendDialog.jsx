import { useState } from "react";
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useUserSearch } from "@/hooks/useUserSearch";
import { friendService } from "@/services/friendService";

const avatarOf = (u) =>
    u.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName)}&background=random`;

// State nằm trong Body nên đóng dialog là tự reset
const AddFriendBody = ({ onPickUser, onClose }) => {
    const [keyword, setKeyword] = useState("");
    const { canSearch, searching, users, patchUser } = useUserSearch(keyword);

    const handleAdd = async (e, user) => {
        e.stopPropagation();
        try {
            await friendService.sendRequest(user._id);
            patchUser(user._id, { relation: "sent" });
            toast.success("Đã gửi lời mời kết bạn");
        } catch (err) {
            toast.error(err.response?.data?.message || "Không gửi được lời mời");
        }
    };

    const handleOpenChat = (user) => {
        onPickUser?.(user);
        onClose();
    };

    const renderAction = (u) => {
        if (u.relation === "friend")
            return <span className="text-xs text-muted-foreground">Bạn bè</span>;
        if (u.relation === "sent")
            return <span className="text-xs text-muted-foreground">Đã gửi lời mời</span>;
        if (u.relation === "received")
            return <span className="text-xs text-muted-foreground">Chờ bạn phản hồi</span>;
        return (
            <button
                onClick={(e) => handleAdd(e, u)}
                className="rounded-md border px-3 py-1 text-sm font-medium text-primary hover:bg-muted"
            >
                Kết bạn
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
                        placeholder="Nhập tên hoặc email..."
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
                    <p className="p-4 text-sm text-muted-foreground">
                        Nhập ít nhất 2 ký tự để tìm người dùng
                    </p>
                ) : searching ? (
                    <p className="p-4 text-sm text-muted-foreground">Đang tìm...</p>
                ) : users.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">Không tìm thấy người dùng</p>
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

const AddFriendDialog = ({ open, onOpenChange, onPickUser }) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="gap-0 p-0 sm:max-w-xl">
            <DialogHeader className="px-4 py-3">
                <DialogTitle>Thêm bạn</DialogTitle>
            </DialogHeader>
            <AddFriendBody onPickUser={onPickUser} onClose={() => onOpenChange(false)} />
        </DialogContent>
    </Dialog>
);

export default AddFriendDialog;
import { useEffect, useState } from "react";
import { MessageCircle, Phone, UserPlus, UserCheck, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { userService } from "@/services/userService";
import { useFriendStore } from "@/stores/useFriendStore";

const avatarOf = (u) =>
    u?.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(u?.displayName || "U")}&background=random`;

const ProfileBody = ({ user, onMessage, onCall }) => {
    const [profile, setProfile] = useState(null);
    const [confirming, setConfirming] = useState(false);
    const friends = useFriendStore((s) => s.friends);
    const sent = useFriendStore((s) => s.sent);
    const received = useFriendStore((s) => s.received);
    const friendsLoaded = useFriendStore((s) => s.friendsLoaded);

    useEffect(() => {
        let cancelled = false;
        userService
            .getProfile(user._id)
            .then((p) => !cancelled && setProfile(p))
            .catch(() => { });
        return () => { cancelled = true; };
    }, [user._id]);

    const id = user._id.toString();
    const info = profile || user; // hiện tạm thông tin có sẵn trong lúc chờ tải
    const receivedReq = received.find((r) => r.from?._id?.toString() === id);

    let relation = null;
    if (friendsLoaded) {
        if (friends.some((f) => f._id?.toString() === id)) relation = "friend";
        else if (sent.some((r) => r.to?._id?.toString() === id)) relation = "sent";
        else if (receivedReq) relation = "received";
        else relation = "none";
    }

    const handleRemove = async () => {
        const ok = await useFriendStore.getState().removeFriend(id);
        if (ok) setConfirming(false);
    };

    return (
        <>
            <div className="h-28 bg-gradient-to-r from-primary/40 to-primary/10" />
            <div className="-mt-10 flex items-end gap-3 px-4">
                <img
                    src={avatarOf(info)}
                    alt={info.displayName}
                    className="size-20 rounded-full object-cover ring-4 ring-background"
                />
                <h3 className="mb-1 truncate text-lg font-semibold">{info.displayName}</h3>
            </div>

            <div className="flex gap-2 px-4 py-4">
                {relation === "none" && (
                    <Button variant="secondary" className="flex-1"
                        onClick={() => useFriendStore.getState().sendRequest(id)}>
                        <UserPlus /> Kết bạn
                    </Button>
                )}
                {relation === "sent" && (
                    <Button variant="secondary" className="flex-1" disabled>
                        <UserCheck /> Đã gửi lời mời
                    </Button>
                )}
                {relation === "received" && (
                    <Button variant="secondary" className="flex-1"
                        onClick={() => useFriendStore.getState().acceptRequest(receivedReq._id)}>
                        <UserCheck /> Chấp nhận kết bạn
                    </Button>
                )}
                {relation === "friend" && (
                    <Button variant="secondary" className="flex-1" onClick={() => onCall(info)}>
                        <Phone /> Gọi điện
                    </Button>
                )}
                <Button className="flex-1" onClick={() => onMessage(info)}>
                    <MessageCircle /> Nhắn tin
                </Button>
            </div>

            <div className="border-t px-4 py-3">
                <p className="mb-1 text-sm font-semibold">Giới thiệu</p>
                <p className="text-sm text-muted-foreground">
                    {profile ? profile.bio || "Chưa có giới thiệu" : "Đang tải..."}
                </p>
            </div>

            {relation === "friend" && (
                <div className="border-t px-4 py-3">
                    {confirming ? (
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm">Xóa {info.displayName} khỏi danh sách bạn bè?</p>
                            <div className="flex shrink-0 gap-2">
                                <Button variant="secondary" onClick={() => setConfirming(false)}>Hủy</Button>
                                <Button variant="destructive" onClick={handleRemove}>Xóa</Button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setConfirming(true)}
                            className="flex w-full items-center gap-3 rounded-md px-1 py-2 text-sm text-destructive hover:bg-muted/60"
                        >
                            <Trash2 className="size-4" />
                            Xóa khỏi danh sách bạn bè
                        </button>
                    )}
                </div>
            )}
        </>
    );
};

const ProfileDialog = ({ user, onClose, onMessage, onCall }) => (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
            <DialogHeader className="sr-only">
                <DialogTitle>Thông tin tài khoản</DialogTitle>
            </DialogHeader>
            {user && (
                <ProfileBody key={user._id} user={user} onMessage={onMessage} onCall={onCall} />
            )}
        </DialogContent>
    </Dialog>
);

export default ProfileDialog;
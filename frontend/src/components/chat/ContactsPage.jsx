// src/components/chat/ContactsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, UserCheck, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFriendStore } from "@/stores/useFriendStore";
import { localeOf } from "@/i18n";

const avatarOf = (u) =>
    u?.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(u?.displayName || "U")}&background=random`;

// "Đức" -> "D", "Ba" -> "B", ký tự lạ -> "#"
const letterOf = (name = "") => {
    const c = name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/gi, "d")
        .trim()
        .charAt(0)
        .toUpperCase();
    return /[A-Z]/.test(c) ? c : "#";
};

const formatDate = (d) => (d ? new Date(d).toLocaleDateString(localeOf()) : "");

const MENU = [
    { key: "friends", labelKey: "contacts.friendsList", icon: UserCheck },
    { key: "requests", labelKey: "contacts.requests", icon: UserPlus },
];

const FriendsPanel = ({ onOpenChat }) => {
    const { t, i18n } = useTranslation();
    const friends = useFriendStore((s) => s.friends);
    const loading = useFriendStore((s) => s.loading);
    const [keyword, setKeyword] = useState("");

    const groups = useMemo(() => {
        const q = keyword.trim().toLowerCase();
        const sorted = friends
            .filter((f) => (f.displayName || "").toLowerCase().includes(q))
            .sort((a, b) => (a.displayName || "").localeCompare(b.displayName || "", i18n.language));

        const map = new Map();
        sorted.forEach((f) => {
            const l = letterOf(f.displayName);
            if (!map.has(l)) map.set(l, []);
            map.get(l).push(f);
        });
        return [...map.entries()];
    }, [friends, keyword, i18n.language]);

    return (
        <>
            <div className="p-4 pb-2">
                <p className="mb-3 text-sm font-semibold">
                    {t("contacts.friendsCount", { n: friends.length })}
                </p>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-70" />
                    <Input
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder={t("contacts.searchFriend")}
                        className="h-10 rounded-full border-none bg-muted pl-9 shadow-none"
                    />
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
                {loading && friends.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">{t("common.loading")}</p>
                ) : groups.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">
                        {keyword ? t("contacts.noMatch") : t("contacts.noFriends")}
                    </p>
                ) : (
                    groups.map(([letter, list]) => (
                        <div key={letter}>
                            <p className="px-3 pb-1 pt-3 text-sm font-semibold">{letter}</p>
                            {list.map((f) => (
                                <button
                                    key={f._id}
                                    onClick={() => onOpenChat?.(f)}
                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted/60"
                                >
                                    <img src={avatarOf(f)} alt={f.displayName} className="size-11 rounded-full object-cover" />
                                    <span className="truncate text-sm font-medium">{f.displayName}</span>
                                </button>
                            ))}
                        </div>
                    ))
                )}
            </div>
        </>
    );
};

const RequestsPanel = () => {
    const { t } = useTranslation();
    const received = useFriendStore((s) => s.received);
    const sent = useFriendStore((s) => s.sent);
    const [busyId, setBusyId] = useState(null);

    const run = async (id, action) => {
        if (busyId) return;
        setBusyId(id);
        await useFriendStore.getState()[action](id);
        setBusyId(null);
    };

    return (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <p className="mb-3 text-sm font-semibold">
                {t("contacts.received", { n: received.length })}
            </p>
            {received.length === 0 ? (
                <p className="mb-6 text-sm text-muted-foreground">{t("contacts.noRequests")}</p>
            ) : (
                <div className="mb-6 grid gap-3 lg:grid-cols-2">
                    {received.map((r) => (
                        <div key={r._id} className="rounded-xl border bg-background p-3">
                            <div className="flex items-center gap-3">
                                <img src={avatarOf(r.from)} alt="" className="size-12 rounded-full object-cover" />
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">{r.from?.displayName}</p>
                                    <p className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</p>
                                </div>
                            </div>
                            {r.message && (
                                <p className="mt-2 rounded-md bg-muted px-3 py-2 text-sm">{r.message}</p>
                            )}
                            <div className="mt-3 flex gap-2">
                                <Button
                                    variant="secondary"
                                    className="flex-1"
                                    disabled={busyId === r._id}
                                    onClick={() => run(r._id, "declineRequest")}
                                >
                                    {t("contacts.decline")}
                                </Button>
                                <Button
                                    className="flex-1"
                                    disabled={busyId === r._id}
                                    onClick={() => run(r._id, "acceptRequest")}
                                >
                                    {t("contacts.accept")}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <p className="mb-3 text-sm font-semibold">
                {t("contacts.sent", { n: sent.length })}
            </p>
            {sent.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("contacts.noSent")}</p>
            ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                    {sent.map((r) => (
                        <div key={r._id} className="flex items-center gap-3 rounded-xl border bg-background p-3">
                            <img src={avatarOf(r.to)} alt="" className="size-12 rounded-full object-cover" />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{r.to?.displayName}</p>
                                <p className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</p>
                            </div>
                            <Button
                                variant="secondary"
                                disabled={busyId === r._id}
                                onClick={() => run(r._id, "declineRequest")}
                            >
                                {t("contacts.withdraw")}
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const ContactsPage = ({ onOpenChat, onBack }) => {
    const { t } = useTranslation();
    const [tab, setTab] = useState("friends");
    const requestCount = useFriendStore((s) => s.received.length);

    useEffect(() => {
        useFriendStore.getState().fetchFriends();
        useFriendStore.getState().fetchRequests();
    }, []);

    return (
        <div className="flex min-w-0 flex-1 flex-col bg-background md:flex-row">
            {/* Menu trái (mobile: thanh tab ngang) */}
            <aside className="shrink-0 border-b md:w-96 md:border-b-0 md:border-r">
                <div className="flex items-center gap-2 px-4 pt-4 md:pb-2">
                    <button onClick={onBack} className="md:hidden" aria-label={t("contacts.back")}>
                        <ArrowLeft className="size-5" />
                    </button>
                    <h1 className="text-2xl font-bold">{t("contacts.title")}</h1>
                </div>

                <nav className="flex gap-1 p-2 md:flex-col">
                    {MENU.map(({ key, labelKey, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={cn(
                                "flex flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium md:flex-none",
                                tab === key ? "bg-primary/10 text-primary" : "hover:bg-muted/60"
                            )}
                        >
                            <Icon className="size-4" />
                            <span className="truncate">{t(labelKey)}</span>
                            {key === "requests" && requestCount > 0 && (
                                <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
                                    {requestCount > 99 ? "99+" : requestCount}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Nội dung phải */}
            <section className="flex min-h-0 min-w-0 flex-1 flex-col">
                <div className="hidden border-b px-4 py-4 md:block">
                    <h2 className="text-base font-semibold">
                        {tab === "friends" ? t("contacts.friendsList") : t("contacts.requests")}
                    </h2>
                </div>
                {tab === "friends" ? <FriendsPanel onOpenChat={onOpenChat} /> : <RequestsPanel />}
            </section>
        </div>
    );
};

export default ContactsPage;
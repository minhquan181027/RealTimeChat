// src/components/chat/ChatListHeader.jsx
import { useEffect, useState } from "react";
import { Search, Palette, Plus, UserPlus, Users, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { userService } from "@/services/userService";

const themes = [
    { name: "Lemonade", colors: ["bg-yellow-400", "bg-blue-400", "bg-gray-200"] },
    { name: "Night", colors: ["bg-blue-600", "bg-indigo-500", "bg-purple-400"] },
    { name: "Coffee", colors: ["bg-orange-400", "bg-gray-400", "bg-gray-200"] },
    { name: "Winter", colors: ["bg-white", "bg-blue-300", "bg-pink-400"] },
    { name: "Dim", colors: ["bg-emerald-500", "bg-pink-500", "bg-red-500"] },
    { name: "Nord", colors: ["bg-slate-300", "bg-sky-600", "bg-slate-500"] },
    { name: "Cupcake", colors: ["bg-pink-200", "bg-purple-200", "bg-blue-200"] },
    { name: "Synthwave", colors: ["bg-purple-900", "bg-pink-500", "bg-yellow-400"] },
    { name: "Dracula", colors: ["bg-slate-800", "bg-purple-600", "bg-pink-500"] },
];

const ChatListHeader = ({ onPickUser, title = "Đoạn chat" }) => {
    const [keyword, setKeyword] = useState("");
    const [result, setResult] = useState({ q: "", users: [] }); // kết quả kèm từ khóa đã tìm

    const q = keyword.trim();
    const canSearch = q.length >= 2;
    // Đang tìm = từ khóa hiện tại chưa có kết quả tương ứng
    const searching = canSearch && result.q !== q;
    const results = canSearch && result.q === q ? result.users : [];

    // Debounce 400ms, bỏ qua kết quả của request cũ
    useEffect(() => {
        if (q.length < 2) return;

        let cancelled = false;
        const timer = setTimeout(async () => {
            try {
                const users = await userService.searchUsers(q);
                if (!cancelled) setResult({ q, users });
            } catch (err) {
                console.error("Lỗi tìm kiếm:", err);
                if (!cancelled) setResult({ q, users: [] });
            }
        }, 400);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [q]);

    const clearSearch = () => setKeyword("");

    const handlePick = (user) => {
        onPickUser?.(user);
        clearSearch();
    };

    const handleThemeChange = (themeName) => {
        document.documentElement.setAttribute("data-theme", themeName.toLowerCase());
    };

    return (
        <div className="flex flex-col bg-background pt-4 text-foreground">
            {/* Hàng 1: Title và Icons */}
            <div className="flex items-center justify-between px-4 pb-3">
                <h1 className="text-2xl font-bold">Đoạn chat</h1>

                <div className="flex items-center gap-2">
                    {/* Menu đổi màu (Theme) */}
                    <div className="dropdown dropdown-end">
                        <div
                            tabIndex={0}
                            role="button"
                            className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
                        >
                            <Palette className="size-5" />
                        </div>
                        <ul
                            tabIndex={0}
                            className="dropdown-content menu z-[100] mt-2 w-56 rounded-box border border-base-300 bg-base-200 p-2 text-base-content shadow-2xl"
                        >
                            {themes.map((theme) => (
                                <li key={theme.name}>
                                    <button
                                        onClick={() => handleThemeChange(theme.name)}
                                        className="flex w-full cursor-pointer items-center justify-between"
                                    >
                                        <span className="text-sm font-medium">{theme.name}</span>
                                        <div className="flex gap-1">
                                            {theme.colors.map((color, idx) => (
                                                <span key={idx} className={`h-2.5 w-2.5 rounded-full ${color}`}></span>
                                            ))}
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Menu Thêm bạn / Tạo nhóm */}
                    <div className="dropdown dropdown-end">
                        <div
                            tabIndex={0}
                            role="button"
                            className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
                        >
                            <Plus className="size-5" />
                        </div>
                        <ul
                            tabIndex={0}
                            className="dropdown-content menu z-[100] mt-2 w-48 rounded-box border border-base-300 bg-base-200 p-2 text-base-content shadow-2xl"
                        >
                            <li>
                                <button className="flex w-full items-center gap-3">
                                    <UserPlus className="size-4" />
                                    <span className="font-medium">Thêm bạn</span>
                                </button>
                            </li>
                            <li>
                                <button className="flex w-full items-center gap-3">
                                    <Users className="size-4" />
                                    <span className="font-medium">Tạo nhóm</span>
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Hàng 2: Thanh tìm kiếm */}
            <div className="relative px-4 pb-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-70" />
                    <Input
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder="Tìm kiếm..."
                        className="h-10 w-full rounded-full border-none bg-muted pl-9 pr-9 text-foreground shadow-none placeholder:text-muted-foreground"
                    />
                    {keyword && (
                        <button
                            onClick={clearSearch}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="size-4" />
                        </button>
                    )}
                </div>

                {canSearch && (
                    <div className="absolute left-4 right-4 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border bg-background shadow-lg">
                        {searching ? (
                            <p className="p-3 text-sm text-muted-foreground">Đang tìm...</p>
                        ) : results.length === 0 ? (
                            <p className="p-3 text-sm text-muted-foreground">Không tìm thấy người dùng</p>
                        ) : (
                            results.map((u) => (
                                <button
                                    key={u._id}
                                    onClick={() => handlePick(u)}
                                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/60"
                                >
                                    <img
                                        src={
                                            u.avatarUrl ||
                                            `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName)}&background=random`
                                        }
                                        alt={u.displayName}
                                        className="size-10 rounded-full object-cover"
                                    />
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">{u.displayName}</p>
                                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatListHeader;
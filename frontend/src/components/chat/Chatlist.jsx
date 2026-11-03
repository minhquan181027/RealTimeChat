// src/components/chat/ChatList.jsx
import { Search, Palette, Plus, UserPlus, Users, BellOff } from "lucide-react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { CHATS, NAV_TOP, themes } from "@/components/data/Chatdata";

const ChatList = ({ activeId, onSelect, className }) => {
    const handleThemeChange = (themeName) => {
        document.documentElement.setAttribute("data-theme", themeName.toLowerCase());
    };

    return (
        <div
            className={cn(
                "h-full w-full shrink-0 flex-col border-r bg-background md:w-[350px]",
                className
            )}
        >
            {/* Header: tìm kiếm + đổi theme + thêm bạn/tạo nhóm */}
            <div className="flex items-center gap-1 border-b bg-background p-3 text-foreground">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-70" />
                    <Input
                        placeholder="Tìm kiếm"
                        className="h-9 rounded-full border-none bg-muted pl-9 text-foreground shadow-none placeholder:text-muted-foreground"
                    />
                </div>

                {/* Đổi theme */}
                <div className="dropdown dropdown-end">
                    <div tabIndex={0} role="button" className="flex size-9 items-center justify-center rounded-full hover:bg-muted cursor-pointer transition-colors">
                        <Palette className="size-5" />
                    </div>
                    <ul tabIndex={0} className="dropdown-content z-[100] menu p-2 shadow-2xl bg-base-200 text-base-content rounded-box w-56 mt-2 border border-base-300">
                        {themes.map((theme) => (
                            <li key={theme.name}>
                                <button
                                    onClick={() => handleThemeChange(theme.name)}
                                    className="flex justify-between items-center cursor-pointer w-full"
                                >
                                    <span className="text-sm font-medium">{theme.name}</span>
                                    <div className="flex gap-1">
                                        {theme.colors.map((color, idx) => (
                                            <span key={idx} className={`w-2.5 h-2.5 rounded-full ${color}`}></span>
                                        ))}
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Thêm bạn / Tạo nhóm */}
                <div className="dropdown dropdown-end">
                    <div tabIndex={0} role="button" className="flex size-9 items-center justify-center rounded-full hover:bg-muted cursor-pointer transition-colors">
                        <Plus className="size-5" />
                    </div>
                    <ul tabIndex={0} className="dropdown-content z-[100] menu p-2 shadow-2xl bg-base-200 text-base-content rounded-box w-48 mt-2 border border-base-300">
                        <li>
                            <button className="flex items-center gap-3 w-full">
                                <UserPlus className="size-4" />
                                <span className="font-medium">Thêm bạn</span>
                            </button>
                        </li>
                        <li>
                            <button className="flex items-center gap-3 w-full">
                                <Users className="size-4" />
                                <span className="font-medium">Tạo nhóm</span>
                            </button>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Danh sách chat */}
            <div className="min-h-0 flex-1 overflow-y-auto">
                {CHATS.map((c) => (
                    <button
                        key={c.id}
                        onClick={() => onSelect(c.id)}
                        className={cn(
                            "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                            activeId === c.id && "md:bg-primary/10"
                        )}
                    >
                        <img src={c.avatar} alt={c.name} className="size-12 shrink-0 rounded-full object-cover" />
                        <div className="min-w-0 flex-1 border-b pb-3 md:border-none md:pb-0">
                            <div className="flex items-center justify-between gap-2">
                                <h3 className={cn("truncate text-[15px]", c.unread ? "font-semibold" : "font-medium")}>
                                    {c.name}
                                </h3>
                                <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                                    {c.muted && <BellOff className="size-3.5" />}
                                    {c.time}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <p className={cn("truncate text-sm", c.unread ? "font-medium text-foreground" : "text-muted-foreground")}>
                                    {c.last}
                                </p>
                                {c.unread && <span className="size-2.5 shrink-0 rounded-full bg-red-500" />}
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Bottom nav (chỉ mobile) */}
            <nav className="flex h-16 shrink-0 items-center justify-around border-t bg-background md:hidden">
                {NAV_TOP.map(({ icon: Icon, label, active }) => (
                    <button
                        key={label}
                        className={cn(
                            "flex flex-col items-center gap-0.5 text-[10px]",
                            active ? "text-primary" : "text-muted-foreground"
                        )}
                    >
                        <Icon className="size-6" />
                        <span>{label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
};

export default ChatList;
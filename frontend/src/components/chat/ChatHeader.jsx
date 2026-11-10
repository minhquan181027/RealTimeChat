// src/components/chat/ChatHeader.jsx
import { Search, Palette, Plus, UserPlus, Users } from "lucide-react";
import { Input } from "@/components/ui/input";


const ChatHeader = () => {

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
    // Hàm chuyển đổi theme
    const handleThemeChange = (themeName) => {
        document.documentElement.setAttribute("data-theme", themeName.toLowerCase());
    };

    return (
        <div className="flex items-center gap-1 border-b bg-background p-3 text-foreground">
            {/* Thanh tìm kiếm */}
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-70" />
                <Input
                    placeholder="Tìm kiếm"
                    className="h-9 rounded-full border-none bg-muted pl-9 text-foreground shadow-none placeholder:text-muted-foreground"
                />
            </div>

            {/* Menu đổi màu (Theme) */}
            <div className="dropdown dropdown-end">
                <div tabIndex={0} role="button" className="flex size-9 items-center justify-center rounded-full hover:bg-muted cursor-pointer transition-colors">
                    <Palette className="size-5" />
                </div>
                <ul tabIndex={0} className="dropdown-content z-[100] menu p-2 shadow-2xl bg-base-200 text-base-content rounded-box w-56 mt-2 border border-base-300">
                    {themes.map((theme) => (
                        <li key={theme.name}>
                            <button onClick={() => handleThemeChange(theme.name)} className="flex justify-between items-center cursor-pointer w-full">
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

            {/* Menu Thêm bạn / Tạo nhóm */}
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
    );
};

export default ChatHeader;
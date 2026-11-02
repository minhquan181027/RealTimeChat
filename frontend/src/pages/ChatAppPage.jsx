import React, { useState } from "react";
import {
    MessageSquare,
    Users,
    LayoutGrid,
    Newspaper,
    User,
    Settings,
    Search,
    Phone,
    Video,
    MoreVertical,
    Paperclip,
    Smile,
    Send,
    ChevronLeft,
    BellOff,
    UserPlus,
    Plus,
    Palette,
    Globe, // <-- Thêm icon Ngôn ngữ
    LogOut, // <-- Thêm icon Đăng xuất
} from "lucide-react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
} from "@/components/ui/sidebar";
// Đã xóa import { Logout } ở đây

/* ================= DỮ LIỆU GIẢ LẬP ================= */
const CHATS = [
    { id: 1, name: "25AS-CNKTMT-Kỹ thuật phần mềm ô tô", last: "Phạm Trung Chiến: @All những bạn còn lại...", time: "1 giờ", avatar: "https://i.pravatar.cc/150?img=11", muted: true },
    { id: 2, name: "Media Box", last: "Báo Mới: Giải mã vệt sáng kỳ lạ xuất hiện...", time: "", avatar: "https://i.pravatar.cc/150?img=12", unread: true },
    { id: 3, name: "Thời Tiết", last: "Chúc một ngày tốt lành, thời tiết TP. Đà...", time: "7 giờ", avatar: "https://i.pravatar.cc/150?img=13", unread: true },
    { id: 4, name: "gôn", last: "okii bảo tks bảo nghe", time: "17 giờ", avatar: "https://i.pravatar.cc/150?img=14" },
    { id: 5, name: "Chị My", last: "[Hình ảnh]", time: "22 giờ", avatar: "https://i.pravatar.cc/150?img=15" },
    { id: 6, name: "Ba", last: "[Cuộc gọi video đi]", time: "22 giờ", avatar: "https://i.pravatar.cc/150?img=16" },
    { id: 7, name: "nhóm thiết kế hệ thống", last: "Bạn: K có", time: "23 giờ", avatar: "https://i.pravatar.cc/150?img=17" },
    { id: 8, name: "My Documents", last: "Bạn: [Hình ảnh]", time: "T7", avatar: "https://i.pravatar.cc/150?img=18" },
];

const INIT_MESSAGES = {
    1: [
        { id: 1, mine: false, sender: "Phạm Trung Chiến", text: "Chiều nay học phòng A214 tầm 2h50 thì các bạn đưa mình là được", time: "14:37" },
        { id: 2, mine: true, text: "Nộp sổ để bị thu hết hằng năm, k nộp sau k có căn cứ ra trường mô nghe", time: "14:40" },
    ],
};

/* ================= DANH SÁCH THEME ================= */
const themes = [
    { name: 'Lemonade', colors: ['bg-yellow-400', 'bg-blue-400', 'bg-gray-200'] },
    { name: 'Night', colors: ['bg-blue-600', 'bg-indigo-500', 'bg-purple-400'] },
    { name: 'Coffee', colors: ['bg-orange-400', 'bg-gray-400', 'bg-gray-200'] },
    { name: 'Winter', colors: ['bg-white', 'bg-blue-300', 'bg-pink-400'] },
    { name: 'Dim', colors: ['bg-emerald-500', 'bg-pink-500', 'bg-red-500'] },
    { name: 'Nord', colors: ['bg-slate-300', 'bg-sky-600', 'bg-slate-500'] },
    { name: 'Cupcake', colors: ['bg-pink-200', 'bg-purple-200', 'bg-blue-200'] },
    { name: 'Synthwave', colors: ['bg-purple-900', 'bg-pink-500', 'bg-yellow-400'] },
    { name: 'Dracula', colors: ['bg-slate-800', 'bg-purple-600', 'bg-pink-500'] },
];

/* ================= SIDEBAR DỌC (CHỈ PC) ================= */
const NAV_TOP = [
    { icon: MessageSquare, label: "Tin nhắn", active: true },
    { icon: Users, label: "Danh bạ" },
    { icon: User, label: "Cá nhân" },
];

function AppSidebar() {
    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="items-center py-4">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                    Z
                </div>
            </SidebarHeader>

            <SidebarContent className="items-center px-1 pt-2">
                <SidebarMenu className="gap-2">
                    {NAV_TOP.map(({ icon: Icon, label, active }) => (
                        <SidebarMenuItem key={label}>
                            <SidebarMenuButton
                                isActive={active}
                                tooltip={label}
                                className="justify-center [&_svg]:size-5!"
                            >
                                <Icon />
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarContent>

            <SidebarFooter className="items-center pb-4">
                <SidebarMenu className="gap-2">
                    {/* NÚT CÀI ĐẶT ĐÃ ĐƯỢC CHUYỂN THÀNH DROPDOWN */}
                    <SidebarMenuItem>
                        <div className="dropdown dropdown-top dropdown-right">
                            {/* Nút Răng Cưa */}
                            <div
                                tabIndex={0}
                                role="button"
                                className="flex size-8 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer transition-colors"
                                title="Cài đặt"
                            >
                                <Settings className="size-5" />
                            </div>

                            {/* Menu bung lên trên và sang phải */}
                            <ul tabIndex={0} className="dropdown-content z-[100] menu p-2 shadow-2xl bg-base-200 text-base-content rounded-box w-56 mb-2 ml-2 border border-base-300">
                                <li>
                                    <button className="flex items-center gap-3 w-full">
                                        <User className="size-4" />
                                        <span className="font-medium">Thông tin tài khoản</span>
                                    </button>
                                </li>
                                <li>
                                    <button className="flex items-center gap-3 w-full">
                                        <Settings className="size-4" />
                                        <span className="font-medium">Cài đặt</span>
                                    </button>
                                </li>

                                <div className="divider my-0"></div>

                                <li>
                                    <button className="flex items-center gap-3 w-full">
                                        <Globe className="size-4" />
                                        <span className="font-medium">Ngôn ngữ</span>
                                    </button>
                                </li>

                                <div className="divider my-0"></div>

                                <li>
                                    {/* Nút Đăng xuất màu đỏ */}
                                    <button className="flex items-center gap-3 w-full text-error hover:bg-error/10 hover:text-error transition-colors">
                                        <LogOut className="size-4" />
                                        <span className="font-medium">Đăng xuất</span>
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </SidebarMenuItem>
                </SidebarMenu>
                {/* Đã xóa <Logout /> ở đây */}
            </SidebarFooter>
        </Sidebar>
    );
}

/* ================= DANH SÁCH CHAT ================= */
function ChatList({ activeId, onSelect, className }) {
    const handleThemeChange = (themeName) => {
        document.documentElement.setAttribute('data-theme', themeName.toLowerCase());
    };

    return (
        <div
            className={cn(
                "h-full w-full shrink-0 flex-col border-r bg-background md:w-[350px]",
                className
            )}
        >
            {/* Header: xanh trên mobile, trắng trên PC */}
            <div className="flex items-center gap-1 border-b bg-background p-3 text-foreground">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-70" />
                    <Input
                        placeholder="Tìm kiếm"
                        className="h-9 rounded-full border-none bg-muted pl-9 text-foreground shadow-none placeholder:text-muted-foreground"
                    />
                </div>

                {/* NÚT ĐỔI MÀU */}
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

                {/* NÚT THÊM (Dropdown Thêm bạn / Tạo nhóm) */}
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

            {/* Danh sách */}
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
                        <img src={c.avatar} alt={c.name} className="size-12 shrink-0 rounded-full object-cover md:size-12" />
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
}

/* ================= KHUNG CHAT ================= */
function ChatWindow({ chat, messages, onBack, onSend, className }) {
    const [text, setText] = useState("");

    const submit = () => {
        if (!text.trim()) return;
        onSend(text.trim());
        setText("");
    };

    if (!chat) {
        return (
            <div className={cn("flex-1 items-center justify-center bg-muted/40 text-muted-foreground", className)}>
                <div className="text-center">
                    <MessageSquare className="mx-auto mb-3 size-14 opacity-30" />
                    <p className="text-sm">Chọn một cuộc trò chuyện để bắt đầu</p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("min-w-0 flex-1 flex-col bg-muted/40", className)}>
            {/* Header */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-3 md:px-4">
                <div className="flex min-w-0 items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
                        <ChevronLeft className="size-6" />
                    </Button>
                    <img src={chat.avatar} alt="" className="hidden size-10 rounded-full object-cover sm:block" />
                    <h2 className="truncate text-sm font-semibold md:text-base">{chat.name}</h2>
                </div>
                <div className="flex gap-1 text-muted-foreground">
                    <Button variant="ghost" size="icon"><Phone className="size-5" /></Button>
                    <Button variant="ghost" size="icon" className="hidden sm:inline-flex"><Video className="size-5" /></Button>
                    <Button variant="ghost" size="icon"><MoreVertical className="size-5" /></Button>
                </div>
            </div>

            {/* Tin nhắn */}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((m) => (
                    <div key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start gap-2")}>
                        {!m.mine && <img src={chat.avatar} alt="" className="size-9 self-end rounded-full" />}
                        <div
                            className={cn(
                                "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm md:max-w-[60%]",
                                m.mine ? "bg-primary/20 text-foreground" : "bg-background"
                            )}
                        >
                            {!m.mine && <div className="mb-0.5 text-xs text-muted-foreground">{m.sender}</div>}
                            <p className="break-words">{m.text}</p>
                            <div className="mt-1 text-[11px] text-muted-foreground">{m.time}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Ô nhập */}
            <div className="flex shrink-0 items-center gap-1 border-t bg-background p-2 md:p-3">
                <Button variant="ghost" size="icon" className="hidden sm:inline-flex"><Paperclip className="size-5" /></Button>
                <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    placeholder={`Nhập tin nhắn tới ${chat.name}`}
                    className="h-10 flex-1 rounded-full border-none bg-muted shadow-none focus-visible:ring-0"
                />
                <Button variant="ghost" size="icon" className="hidden sm:inline-flex"><Smile className="size-5" /></Button>
                <Button size="icon" className="rounded-full" onClick={submit}><Send className="size-4" /></Button>
            </div>
        </div>
    );
}

/* ================= TRANG CHÍNH ================= */
const ChatAppPage = () => {
    const [activeId, setActiveId] = useState(null);
    const [messages, setMessages] = useState(INIT_MESSAGES);

    const activeChat = CHATS.find((c) => c.id === activeId) ?? null;

    const handleSend = (text) => {
        setMessages((prev) => ({
            ...prev,
            [activeId]: [
                ...(prev[activeId] ?? []),
                {
                    id: Date.now(),
                    mine: true,
                    text,
                    time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
                },
            ],
        }));
    };

    return (
        <SidebarProvider defaultOpen={false} className="h-svh overflow-hidden">
            <AppSidebar />

            <SidebarInset className="min-w-0 flex-row overflow-hidden">
                <ChatList
                    activeId={activeId}
                    onSelect={setActiveId}
                    className={activeId ? "hidden md:flex" : "flex"}
                />

                <ChatWindow
                    chat={activeChat}
                    messages={messages[activeId] ?? []}
                    onBack={() => setActiveId(null)}
                    onSend={handleSend}
                    className={activeId ? "flex" : "hidden md:flex"}
                />
            </SidebarInset>
        </SidebarProvider>
    );
};

export default ChatAppPage;
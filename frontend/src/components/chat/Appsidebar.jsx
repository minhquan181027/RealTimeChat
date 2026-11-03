// src/components/chat/AppSidebar.jsx
import { Settings, User, Globe, LogOut } from "lucide-react";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NAV_TOP } from "@/components/data/Chatdata";

// Thanh icon dọc bên trái (chỉ hiện trên PC, shadcn tự ẩn trên mobile)
const AppSidebar = () => {
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
                    <SidebarMenuItem>
                        {/* Dropdown cài đặt: bung lên trên và sang phải */}
                        <div className="dropdown dropdown-top dropdown-right">
                            <div
                                tabIndex={0}
                                role="button"
                                className="flex size-8 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer transition-colors"
                                title="Cài đặt"
                            >
                                <Settings className="size-5" />
                            </div>

                            <ul
                                tabIndex={0}
                                className="dropdown-content z-[100] menu p-2 shadow-2xl bg-base-200 text-base-content rounded-box w-56 mb-2 ml-2 border border-base-300"
                            >
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
                                    <button className="flex items-center gap-3 w-full text-error hover:bg-error/10 hover:text-error transition-colors">
                                        <LogOut className="size-4" />
                                        <span className="font-medium">Đăng xuất</span>
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
};

export default AppSidebar;
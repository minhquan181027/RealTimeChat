// src/components/chat/AppSidebar.jsx
import { Settings, User, Globe, LogOut, MessageSquare, Users, Inbox } from "lucide-react";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuthStore } from "@/stores/useAuthStore";
import { useChatStore } from "@/stores/useChatStore";
import { useFriendStore } from "@/stores/useFriendStore";
import { useState } from "react";
import AccountDialog from "./AccountDialog";
import { useTranslation } from "react-i18next";
import LanguageDialog from "./LanguageDialog";

const NAV_TOP = [
    { key: "main", icon: MessageSquare },
    { key: "pending", icon: Inbox },
    { key: "contacts", icon: Users },
    { key: "profile", icon: User },
];

const AppSidebar = ({ view, onChangeView }) => {
    const signOut = useAuthStore((state) => state.signOut);
    const pendingCount = useChatStore(
        (s) => s.conversations.filter((c) => c.myStatus === "pending").length
    );
    const [accountOpen, setAccountOpen] = useState(false);

    const requestCount = useFriendStore((s) => s.received.length);

    const { t } = useTranslation();
    const [langOpen, setLangOpen] = useState(false);

    const handleLogout = async () => {
        await signOut();
    };

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="items-center py-4">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                    Z
                </div>
            </SidebarHeader>

            <SidebarContent className="items-center px-1 pt-2">
                <SidebarMenu className="gap-2">
                    {NAV_TOP.map(({ key, icon: Icon }) => {
                        const badge = key === "pending" ? pendingCount : key === "contacts" ? requestCount : 0;
                        return (
                            <SidebarMenuItem key={key}>
                                <SidebarMenuButton
                                    isActive={view === key}
                                    tooltip={t(`sidebar.${key}`)}
                                    onClick={() => {
                                        if (["main", "pending", "contacts"].includes(key)) onChangeView?.(key);
                                        if (key === "profile") setAccountOpen(true);
                                    }}
                                    className="justify-center [&_svg]:size-5!"
                                >
                                    <span className="relative">
                                        <Icon />
                                        {badge > 0 && (
                                            <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                                                {badge > 99 ? "99+" : badge}
                                            </span>
                                        )}
                                    </span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    })}
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
                                title={t("sidebar.settings")}
                            >
                                <Settings className="size-5" />
                            </div>

                            <ul
                                tabIndex={0}
                                className="dropdown-content z-[100] menu p-2 shadow-2xl bg-base-200 text-base-content rounded-box w-56 mb-2 ml-2 border border-base-300"
                            >
                                <li>
                                    <button
                                        className="flex items-center gap-3 w-full"
                                        onClick={() => {
                                            document.activeElement?.blur();
                                            setAccountOpen(true);
                                        }}
                                    >
                                        <User className="size-4" />
                                        <span className="font-medium">{t("sidebar.account")}</span>
                                    </button>
                                </li>
                                <li>
                                    <button className="flex items-center gap-3 w-full">
                                        <Settings className="size-4" />
                                        <span className="font-medium">{t("sidebar.settings")}</span>
                                    </button>
                                </li>

                                <div className="divider my-0"></div>

                                <li>
                                    <button
                                        className="flex items-center gap-3 w-full"
                                        onClick={() => {
                                            document.activeElement?.blur();
                                            setLangOpen(true);
                                        }}
                                    >
                                        <Globe className="size-4" />
                                        <span className="font-medium">{t("sidebar.language")}</span>
                                    </button>
                                </li>

                                <div className="divider my-0"></div>

                                <li>
                                    <button className="flex items-center gap-3 w-full text-error hover:bg-error/10 hover:text-error transition-colors" onClick={handleLogout}>
                                        <LogOut className="size-4" />
                                        <span className="font-medium">{t("sidebar.logout")}</span>
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <AccountDialog open={accountOpen} onOpenChange={setAccountOpen} />
            <LanguageDialog open={langOpen} onOpenChange={setLangOpen} />
        </Sidebar>
    );
};

export default AppSidebar;
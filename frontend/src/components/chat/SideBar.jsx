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
import { cn } from "cn";

const NAV_TOP = [
    { key: "main", icon: MessageSquare },
    { key: "pending", icon: Inbox },
    { key: "contacts", icon: Users },
];

const AppSidebar = ({ view, onChangeView, mobileHidden = false }) => {
    const signOut = useAuthStore((state) => state.signOut);
    const user = useAuthStore((state) => state.user);
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
    const userInitial = user?.displayName?.trim()?.[0]?.toUpperCase() || "?";

    return (
        <>
            <aside className={cn(
                "flex h-svh w-14 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:hidden",
                mobileHidden && "hidden"
            )}>
                <header className="flex justify-center py-4">
                    <button
                        type="button"
                        onClick={() => setAccountOpen(true)}
                        title={t("sidebar.account")}
                        aria-label={t("sidebar.account")}
                        className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-semibold text-primary-foreground"
                    >
                        {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt="" className="size-full object-cover" />
                        ) : (
                            userInitial
                        )}
                    </button>
                </header>
                <nav className="flex flex-col items-center gap-2 px-1 pt-2">
                    {NAV_TOP.map(({ key, icon: Icon }) => {
                        const badge = key === "pending" ? pendingCount : key === "contacts" ? requestCount : 0;
                        return (
                            <button
                                key={key}
                                type="button"
                                title={t(`sidebar.${key}`)}
                                aria-label={t(`sidebar.${key}`)}
                                onClick={() => onChangeView?.(key)}
                                className={cn(
                                    "relative flex size-10 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                    view === key && "bg-sidebar-accent text-sidebar-accent-foreground"
                                )}
                            >
                                <Icon className="size-5" />
                                {badge > 0 && (
                                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                                        {badge > 99 ? "99+" : badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>
                <footer className="mt-auto flex justify-center pb-4">
                    <div className="dropdown dropdown-top dropdown-right">
                        <button
                            type="button"
                            className="flex size-10 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            title={t("sidebar.settings")}
                            aria-label={t("sidebar.settings")}
                        >
                            <Settings className="size-5" />
                        </button>
                        <ul className="dropdown-content z-[100] menu mb-2 ml-2 w-56 rounded-box border border-base-300 bg-base-200 p-2 text-base-content shadow-2xl">
                            <li>
                                <button onClick={() => setAccountOpen(true)}>
                                    <User className="size-4" />
                                    <span>{t("sidebar.account")}</span>
                                </button>
                            </li>
                            <li>
                                <button onClick={() => setLangOpen(true)}>
                                    <Globe className="size-4" />
                                    <span>{t("sidebar.language")}</span>
                                </button>
                            </li>
                            <li>
                                <button className="text-error" onClick={handleLogout}>
                                    <LogOut className="size-4" />
                                    <span>{t("sidebar.logout")}</span>
                                </button>
                            </li>
                        </ul>
                    </div>
                </footer>
            </aside>

            <Sidebar collapsible="icon" className="hidden md:flex">
                <SidebarHeader className="items-center py-4">
                    <button
                        type="button"
                        onClick={() => setAccountOpen(true)}
                        title={t("sidebar.account")}
                        aria-label={t("sidebar.account")}
                        className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-semibold text-primary-foreground"
                    >
                        {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt="" className="size-full object-cover" />
                        ) : (
                            userInitial
                        )}
                    </button>
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
                                        onClick={() => onChangeView?.(key)}
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
                            <div className="dropdown dropdown-top dropdown-right">
                                <div
                                    tabIndex={0}
                                    role="button"
                                    className="flex size-8 cursor-pointer items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                    title={t("sidebar.settings")}
                                >
                                    <Settings className="size-5" />
                                </div>

                                <ul
                                    tabIndex={0}
                                    className="dropdown-content z-[100] menu mb-2 ml-2 w-56 rounded-box border border-base-300 bg-base-200 p-2 text-base-content shadow-2xl"
                                >
                                    <li>
                                        <button
                                            className="flex w-full items-center gap-3"
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
                                        <button
                                            className="flex w-full items-center gap-3"
                                            onClick={() => {
                                                document.activeElement?.blur();
                                                setLangOpen(true);
                                            }}
                                        >
                                            <Globe className="size-4" />
                                            <span className="font-medium">{t("sidebar.language")}</span>
                                        </button>
                                    </li>
                                    <li>
                                        <button className="flex w-full items-center gap-3 text-error transition-colors hover:bg-error/10 hover:text-error" onClick={handleLogout}>
                                            <LogOut className="size-4" />
                                            <span className="font-medium">{t("sidebar.logout")}</span>
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
            </Sidebar>
            <AccountDialog open={accountOpen} onOpenChange={setAccountOpen} />
            <LanguageDialog open={langOpen} onOpenChange={setLangOpen} />
        </>
    );
};

export default AppSidebar;
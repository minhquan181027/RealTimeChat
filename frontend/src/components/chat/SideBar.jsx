
import {
    Settings,
    User,
    Globe,
    LogOut,
    MessageSquare,
    Users,
    Inbox,
} from "lucide-react";

import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuthStore } from "@/stores/useAuthStore";
import { useChatStore } from "@/stores/useChatStore";
import { useFriendStore } from "@/stores/useFriendStore";

import AccountDialog from "./AccountDialog";
import LanguageDialog from "./LanguageDialog";

import { cn } from "cn";

// ========================================
// NAVIGATION CONFIG
// ========================================

const NAV_TOP = [
    { key: "main", icon: MessageSquare },
    { key: "pending", icon: Inbox },
    { key: "contacts", icon: Users },
];

// ========================================
// AVATAR COMPONENT
// ========================================

const Avatar = ({ user, userInitial, onClick, t, size = "size-10" }) => {
    return (
        <button
            type="button"
            onClick={onClick}
            title={t("sidebar.account")}
            aria-label={t("sidebar.account")}
            className={cn(
                "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-semibold text-primary-foreground",
                size
            )}
        >
            {user?.avatarUrl ? (
                <img
                    src={user.avatarUrl}
                    alt=""
                    className="size-full object-cover"
                />
            ) : (
                userInitial
            )}
        </button>
    );
};

// ========================================
// NAVIGATION ITEMS COMPONENT
// ========================================

const NavigationItems = ({
    view,
    onChangeView,
    pendingCount,
    requestCount,
    t,
}) => {
    return (
        <>
            {NAV_TOP.map(({ key, icon: Icon }) => {
                const badge =
                    key === "pending"
                        ? pendingCount
                        : key === "contacts"
                            ? requestCount
                            : 0;

                return (
                    <button
                        key={key}
                        type="button"
                        title={t(`sidebar.${key}`)}
                        aria-label={t(`sidebar.${key}`)}
                        aria-current={view === key ? "page" : undefined}
                        onClick={() => onChangeView?.(key)}
                        className={cn(
                            "relative flex size-10 shrink-0 items-center justify-center rounded-md transition-colors",
                            "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                            view === key &&
                            "bg-sidebar-accent text-sidebar-accent-foreground"
                        )}
                    >
                        <Icon className="size-5 shrink-0" />

                        {badge > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                                {badge > 99 ? "99+" : badge}
                            </span>
                        )}
                    </button>
                );
            })}
        </>
    );
};

// ========================================
// SETTINGS MENU COMPONENT
// ========================================

const SettingsMenu = ({
    t,
    onOpenAccount,
    onOpenLanguage,
    onLogout,
}) => {
    return (
        <div className="dropdown dropdown-top dropdown-right">
            <button
                type="button"
                tabIndex={0}
                title={t("sidebar.settings")}
                aria-label={t("sidebar.settings")}
                className="flex size-10 shrink-0 items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
                <Settings className="size-5 shrink-0" />
            </button>

            <ul className="dropdown-content z-[100] menu mb-2 ml-2 w-56 rounded-box border border-base-300 bg-base-200 p-2 text-base-content shadow-2xl">
                <li>
                    <button
                        className="flex w-full items-center gap-3"
                        onClick={() => {
                            document.activeElement?.blur();
                            onOpenAccount();
                        }}
                    >
                        <User className="size-4" />
                        <span className="font-medium">
                            {t("sidebar.account")}
                        </span>
                    </button>
                </li>

                <li>
                    <button
                        className="flex w-full items-center gap-3"
                        onClick={() => {
                            document.activeElement?.blur();
                            onOpenLanguage();
                        }}
                    >
                        <Globe className="size-4" />
                        <span className="font-medium">
                            {t("sidebar.language")}
                        </span>
                    </button>
                </li>

                <li>
                    <button
                        className="flex w-full items-center gap-3 text-error transition-colors hover:bg-error/10 hover:text-error"
                        onClick={onLogout}
                    >
                        <LogOut className="size-4" />
                        <span className="font-medium">
                            {t("sidebar.logout")}
                        </span>
                    </button>
                </li>
            </ul>
        </div>
    );
};

// ========================================
// MAIN APP SIDEBAR
// ========================================

const AppSidebar = ({
    view,
    onChangeView,
    mobileHidden = false,
}) => {
    const signOut = useAuthStore((state) => state.signOut);
    const user = useAuthStore((state) => state.user);

    const pendingCount = useChatStore(
        (s) =>
            s.conversations.filter(
                (c) => c.myStatus === "pending"
            ).length
    );

    const requestCount = useFriendStore(
        (s) => s.received.length
    );

    const [accountOpen, setAccountOpen] = useState(false);
    const [langOpen, setLangOpen] = useState(false);

    const { t } = useTranslation();

    const handleLogout = async () => {
        await signOut();
    };

    const userInitial =
        user?.displayName?.trim()?.[0]?.toUpperCase() || "?";

    // Shared props
    const avatarProps = {
        user,
        userInitial,
        onClick: () => setAccountOpen(true),
        t,
    };

    const navigationProps = {
        view,
        onChangeView,
        pendingCount,
        requestCount,
        t,
    };

    const settingsProps = {
        t,
        onOpenAccount: () => setAccountOpen(true),
        onOpenLanguage: () => setLangOpen(true),
        onLogout: handleLogout,
    };

    return (
        <>
            {/* ========================================
                MOBILE SIDEBAR
            ======================================== */}

            <aside
                className={cn(
                    "flex h-svh w-14 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:hidden",
                    mobileHidden && "hidden"
                )}
            >
                {/* Avatar */}
                <header className="flex shrink-0 justify-center py-4">
                    <Avatar
                        {...avatarProps}
                        size="size-9"
                    />
                </header>

                {/* Navigation */}
                <nav className="flex flex-col items-center gap-2 px-1 pt-2">
                    <NavigationItems {...navigationProps} />
                </nav>

                {/* Settings */}
                <footer className="mt-auto flex justify-center pb-4">
                    <SettingsMenu {...settingsProps} />
                </footer>
            </aside>

            {/* ========================================
                DESKTOP SIDEBAR
                Custom React + Tailwind
            ======================================== */}

            <aside
                className="
                    relative hidden md:flex
                    h-svh
                    w-[60px] min-w-[60px] max-w-[60px]
                    shrink-0 box-border
                    flex-col items-center
                    border-r border-sidebar-border
                    bg-sidebar text-sidebar-foreground
                "
            >
                {/* Avatar */}
                <header className="flex w-full shrink-0 items-center justify-center py-4">
                    <Avatar {...avatarProps} />
                </header>

                {/* Navigation */}
                <nav className="flex w-full flex-1 flex-col items-center gap-2 pt-2">
                    <NavigationItems {...navigationProps} />
                </nav>

                {/* Settings */}
                <footer className="flex w-full shrink-0 items-center justify-center pb-4">
                    <SettingsMenu {...settingsProps} />
                </footer>
            </aside>

            {/* ========================================
                DIALOGS
            ======================================== */}

            <AccountDialog
                open={accountOpen}
                onOpenChange={setAccountOpen}
            />

            <LanguageDialog
                open={langOpen}
                onOpenChange={setLangOpen}
            />
        </>
    );
};

export default AppSidebar;

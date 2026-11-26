import { useState } from "react";
import { ChevronDown, UserRound, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

const PHOTO_PREVIEW = 9;

const avatarOf = (user) =>
    user?.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || "U")}&background=random`;

const Section = ({ title, children }) => {
    const [open, setOpen] = useState(true);
    return (
        <div className="border-t">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/40"
            >
                {title}
                <ChevronDown className={cn("size-4 transition-transform", !open && "-rotate-90")} />
            </button>
            {open && <div className="px-4 pb-3">{children}</div>}
        </div>
    );
};

const DirectInfoPanel = ({ chat, messages, onClose, onProfileClick, onImageClick }) => {
    const { t } = useTranslation();
    const [showAllPhotos, setShowAllPhotos] = useState(false);
    const photos = [...messages].reverse().filter((message) =>
        message.imgURL && !message.recalledAt && !message.pending
    );
    const shownPhotos = showAllPhotos ? photos : photos.slice(0, PHOTO_PREVIEW);

    return (
        <aside className="absolute inset-0 z-30 flex flex-col overflow-hidden bg-base-100 md:rounded-2xl xl:static xl:z-auto xl:w-96 xl:shrink-0 xl:border xl:border-base-300 xl:shadow-xs">
            <div className="relative flex h-16 shrink-0 items-center border-b px-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    title={t("groupInfo.close")}
                    aria-label={t("groupInfo.close")}
                >
                    <ArrowLeft className="size-5" />
                </Button>

                <h2 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-semibold">
                    {t("groupInfo.title")}
                </h2>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="flex flex-col items-center px-4 py-6">
                    <img
                        src={avatarOf(chat.otherUser)}
                        alt={chat.name}
                        className="size-24 rounded-full object-cover"
                    />
                    <h3 className="mt-3 max-w-full break-words text-center text-lg font-semibold">{chat.name}</h3>
                    {chat.otherUser?.username && (
                        <p className="text-sm text-muted-foreground">@{chat.otherUser.username}</p>
                    )}
                    <Button
                        variant="secondary"
                        className="mt-4"
                        onClick={() => onProfileClick?.(chat.otherUser)}
                    >
                        <UserRound />
                        {t("directInfo.profile")}
                    </Button>
                </div>

                <Section title={t("groupInfo.photos")}>
                    {photos.length === 0 ? (
                        <p className="py-2 text-center text-sm text-muted-foreground">{t("groupInfo.noPhotos")}</p>
                    ) : (
                        <>
                            <div className="grid grid-cols-3 gap-1">
                                {shownPhotos.map((message) => (
                                    <button
                                        key={message.id || message._id}
                                        type="button"
                                        onClick={() => onImageClick?.(message.imgURL)}
                                        className="aspect-square overflow-hidden rounded-md bg-muted"
                                    >
                                        <img
                                            src={message.imgURL}
                                            alt=""
                                            loading="lazy"
                                            className="size-full object-cover transition-opacity hover:opacity-80"
                                        />
                                    </button>
                                ))}
                            </div>
                            {photos.length > PHOTO_PREVIEW && (
                                <Button
                                    variant="secondary"
                                    className="mt-2 w-full"
                                    onClick={() => setShowAllPhotos((value) => !value)}
                                >
                                    {showAllPhotos ? t("groupInfo.showLess") : t("groupInfo.showAll")}
                                </Button>
                            )}
                        </>
                    )}
                </Section>

                <Section title={t("groupInfo.files")}>
                    <p className="py-2 text-center text-sm text-muted-foreground">{t("groupInfo.noFiles")}</p>
                </Section>
            </div>
        </aside>
    );
};

export default DirectInfoPanel;

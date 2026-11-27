import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { Skeleton } from "@/components/ui/skeleton";

const ChatListSkeleton = ({ className }) => {
    const { t } = useTranslation();

    return (
        <div
            role="status"
            aria-label={t("chatList.loading")}
            className={cn("flex h-full w-full shrink-0 flex-col border-r bg-background md:w-[400px]", className)}
        >
            <div aria-hidden="true" className="flex flex-col pt-4">
                <div className="flex items-center justify-between px-4 pb-3">
                    <Skeleton className="h-7 w-24" />
                    <div className="flex gap-2">
                        <Skeleton className="size-9 rounded-full" />
                        <Skeleton className="size-9 rounded-full" />
                    </div>
                </div>
                <div className="px-4 pb-3">
                    <Skeleton className="h-10 w-full rounded-full" />
                </div>
            </div>
            <div aria-hidden="true" className="flex-1 space-y-5 overflow-hidden px-4 pt-2">
                {Array.from({ length: 6 }, (_, index) => (
                    <div key={index} className="flex items-center gap-3">
                        <Skeleton className="size-[60px] shrink-0 rounded-full" />
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                            <Skeleton className="h-5 w-1/2" />
                            <Skeleton className="h-[18px] w-4/5" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ChatListSkeleton;

import { useAuthStore } from '@/stores/useAuthStore'
import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { MessageSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import ChatListSkeleton from '@/components/chat/ChatListSkeleton'

const ProtectedRoute = () => {
    const { accessToken, loading, refresh, fetchMe } = useAuthStore()
    const location = useLocation()
    const { t } = useTranslation()
    const [starting, setStarting] = useState(() => {
        const { accessToken, user } = useAuthStore.getState()
        return !accessToken || !user
    })

    useEffect(() => {
        const init = async () => {
            try {
                // Thử lấy access token mới nếu chưa có
                if (!useAuthStore.getState().accessToken) {
                    await refresh()
                }

                // Đọc lại state mới nhất sau khi refresh
                const { accessToken, user } = useAuthStore.getState()

                // Nếu đã có token nhưng chưa có thông tin user
                if (accessToken && !user) {
                    const fetchedUser = await fetchMe()
                    if (!fetchedUser) {
                        useAuthStore.getState().clearState()
                    }
                }

            } finally {
                setStarting(false)
            }
        }

        init()
    }, [fetchMe, refresh])

    if (starting || loading) {
        return (
            <div className="flex h-svh overflow-hidden bg-base-200 md:gap-2.5 md:p-2.5">
                <aside aria-hidden="true" className="hidden w-12 shrink-0 flex-col items-center gap-4 py-2 md:flex">
                    {Array.from({ length: 4 }, (_, index) => (
                        <Skeleton key={index} className="size-8 rounded-full" />
                    ))}
                </aside>
                <div className="hidden h-full md:block">
                    <ChatListSkeleton className="md:rounded-2xl md:border md:border-border/60 md:shadow-xs" />
                </div>
                <main className="flex min-w-0 flex-1 items-center justify-center bg-base-100 md:rounded-2xl md:border md:border-base-300 md:shadow-xs">
                    <div className="text-center">
                        <MessageSquare className="mx-auto mb-3 size-14 opacity-30" aria-hidden="true" />
                        <p className="text-sm text-muted-foreground">{t("chatWindow.selectToStart")}</p>
                    </div>
                </main>
            </div>
        )
    }

    if (!accessToken) {
        return <Navigate to="/signin" replace />
    }

    const needsSetup = useAuthStore.getState().user?.needsSetup;
    if (needsSetup && location.pathname !== "/setup") {
        return <Navigate to="/setup" replace />
    }
    if (!needsSetup && location.pathname === "/setup") {
        return <Navigate to="/" replace />
    }

    return <Outlet />
}

export default ProtectedRoute
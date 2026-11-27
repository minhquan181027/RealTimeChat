import { useAuthStore } from '@/stores/useAuthStore'
import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'

const ProtectedRoute = () => {
    const { accessToken, loading, refresh, fetchMe } = useAuthStore()
    const location = useLocation()
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
            <div className="flex h-screen items-center justify-center">
                Đang tải trang...
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
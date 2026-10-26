import { useAuthStore } from '@/stores/useAuthStore'
import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router'

const ProtectedRoute = () => {
    const { accessToken, loading, refresh, fetchMe } = useAuthStore()
    const [starting, setStarting] = useState(true)

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
                    console.log("concac")
                    await fetchMe()
                }

            } finally {
                setStarting(false)
            }
        }

        init()
    }, [])

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

    return <Outlet />
}

export default ProtectedRoute
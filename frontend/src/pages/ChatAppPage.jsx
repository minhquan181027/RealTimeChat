import { Logout } from '@/components/auth/Logout'
import { useAuthStore } from '@/stores/useAuthStore'
import React from 'react'
import { Button } from '@/components/ui/button'
import api from '@/lib/axios'
import { toast } from 'sonner'
const ChatAppPage = () => {
    const user = useAuthStore((s) => s.user);

    const handleOnClick = async () => {
        try {
            await api.get("/user/test", { withCredentials: true })
            toast.success("Ok")
        } catch (error) {
            toast.error("Thất bại")
            console.error(error);
        }
    }
    return (
        <div>

            <Logout></Logout>
            <p>{user.username}</p>
            <Button onClick={handleOnClick}>click here</Button>
        </div>
    )
}

export default ChatAppPage

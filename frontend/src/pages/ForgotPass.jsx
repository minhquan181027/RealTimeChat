import React from 'react'
import { ForgotPasswordForm } from '@/components/auth/forgot-form'
const ForgotPass = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
            {/* Giới hạn chiều rộng tối đa của form */}
            <div className="w-full max-w-4xl">
                <ForgotPasswordForm />
            </div>
        </div>
    )
}

export default ForgotPass

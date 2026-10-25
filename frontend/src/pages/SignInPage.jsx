import React from 'react'
import { SignInForm } from '@/components/auth/signin-form'
const SignInPage = () => {
    return (
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-4xl">
                <SignInForm />
            </div>
        </div>
    )
}

export default SignInPage

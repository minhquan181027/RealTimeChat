import { SignupForm } from "@/components/auth/signup-form"

export default function SignupPage() {
    return (
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-4xl">
                <SignupForm />
            </div>
        </div>
    )
}

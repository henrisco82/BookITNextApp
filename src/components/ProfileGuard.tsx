'use client'

// Guard component that checks for profile existence and role access
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser, useIsProvider, useIsBooker } from '@/hooks/useCurrentUser'

interface ProfileGuardProps {
    children: React.ReactNode
    requiredRole?: 'provider' | 'booker'
}

export function ProfileGuard({ children, requiredRole }: ProfileGuardProps) {
    const router = useRouter()
    const { user, isLoading, needsProfileSetup } = useCurrentUser()
    const isProvider = useIsProvider()
    const isBooker = useIsBooker()

    useEffect(() => {
        if (!isLoading) {
            if (needsProfileSetup || !user) {
                router.replace('/profile-setup')
            } else if (requiredRole === 'provider' && !isProvider) {
                router.replace('/dashboard')
            } else if (requiredRole === 'booker' && !isBooker) {
                router.replace('/dashboard')
            }
        }
    }, [isLoading, user, needsProfileSetup, isProvider, isBooker, requiredRole, router])

    // Show loading state while checking profile
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Loading profile...</div>
            </div>
        )
    }

    // Don't render children if we are about to redirect
    if (needsProfileSetup || !user || (requiredRole === 'provider' && !isProvider) || (requiredRole === 'booker' && !isBooker)) {
        return null
    }

    return <>{children}</>
}

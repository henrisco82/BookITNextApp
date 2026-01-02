// Guard component that checks for profile existence and role access
import { Navigate } from 'react-router-dom'
import { useCurrentUser, useIsProvider, useIsBooker } from '@/hooks/useCurrentUser'

interface ProfileGuardProps {
    children: React.ReactNode
    requiredRole?: 'provider' | 'booker'
}

export function ProfileGuard({ children, requiredRole }: ProfileGuardProps) {
    const { user, isLoading, needsProfileSetup } = useCurrentUser()
    const isProvider = useIsProvider()
    const isBooker = useIsBooker()

    // Show loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Loading profile...</div>
            </div>
        )
    }

    // Redirect to profile setup if no profile exists
    if (needsProfileSetup || !user) {
        return <Navigate to="/profile-setup" replace />
    }

    // Check role access if required
    if (requiredRole === 'provider' && !isProvider) {
        return <Navigate to="/dashboard" replace />
    }

    if (requiredRole === 'booker' && !isBooker) {
        return <Navigate to="/dashboard" replace />
    }

    return <>{children}</>
}

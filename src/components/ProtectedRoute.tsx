import { Navigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useAuth as useAppAuth } from '@/contexts/AuthContext'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth()
  const { isLoading } = useAppAuth()

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!isSignedIn) {
    return <Navigate to="/signin" replace />
  }

  return <>{children}</>
}

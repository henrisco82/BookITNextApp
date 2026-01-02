import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ProfileGuard } from '@/components/ProfileGuard'
import { SignIn } from '@/pages/SignIn'
import { SignUp } from '@/pages/SignUp'
import { VerifyEmail } from '@/pages/VerifyEmail'
import { ProfileSetup } from '@/pages/ProfileSetup'
import { EditProfile } from '@/pages/EditProfile'
import { Dashboard } from '@/pages/Dashboard'

// Provider pages
import { ProviderDashboard } from '@/pages/provider/ProviderDashboard'
import { AvailabilityManager } from '@/pages/provider/AvailabilityManager'

// Booker pages
import { ProviderDirectory } from '@/pages/booker/ProviderDirectory'
import { BookingPage } from '@/pages/booker/BookingPage'
import { BookerDashboard } from '@/pages/booker/BookerDashboard'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/verify-email" element={<VerifyEmail />} />

            {/* Profile setup - requires auth but no profile */}
            <Route
              path="/profile-setup"
              element={
                <ProtectedRoute>
                  <ProfileSetup />
                </ProtectedRoute>
              }
            />

            {/* Protected routes - require auth AND profile */}
            <Route
              path="/profile/edit"
              element={
                <ProtectedRoute>
                  <ProfileGuard>
                    <EditProfile />
                  </ProfileGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <ProfileGuard>
                    <Dashboard />
                  </ProfileGuard>
                </ProtectedRoute>
              }
            />

            {/* Provider routes */}
            <Route
              path="/provider"
              element={
                <ProtectedRoute>
                  <ProfileGuard requiredRole="provider">
                    <ProviderDashboard />
                  </ProfileGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/provider/availability"
              element={
                <ProtectedRoute>
                  <ProfileGuard requiredRole="provider">
                    <AvailabilityManager />
                  </ProfileGuard>
                </ProtectedRoute>
              }
            />

            {/* Booker routes */}
            <Route
              path="/browse"
              element={
                <ProtectedRoute>
                  <ProfileGuard requiredRole="booker">
                    <ProviderDirectory />
                  </ProfileGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/book/:providerId"
              element={
                <ProtectedRoute>
                  <ProfileGuard requiredRole="booker">
                    <BookingPage />
                  </ProfileGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-bookings"
              element={
                <ProtectedRoute>
                  <ProfileGuard requiredRole="booker">
                    <BookerDashboard />
                  </ProfileGuard>
                </ProtectedRoute>
              }
            />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/sso-callback"
              element={<AuthenticateWithRedirectCallback />}
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
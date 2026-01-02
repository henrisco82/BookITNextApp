import React, { createContext, useContext } from 'react'
import { useAuth as useClerkAuth, useUser, useSignIn, useSignUp, useClerk } from '@clerk/clerk-react'

interface User {
  email: string
  name?: string
}

interface AuthContextType {
  user: User | null
  signUp: (email: string, password: string, name?: string) => Promise<{ needsVerification: boolean }>
  verifyEmail: (code: string) => Promise<void>
  resendVerificationCode: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  isLoading: boolean
  pendingEmail?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded: clerkLoaded, signOut: clerkSignOut } = useClerkAuth()
  const { user: clerkUser } = useUser()
  const { signIn: clerkSignIn, isLoaded: signInLoaded } = useSignIn()
  const { signUp: clerkSignUp, isLoaded: signUpLoaded } = useSignUp()
  const { setActive } = useClerk()

  const isLoading = !clerkLoaded || !signInLoaded || !signUpLoaded

  // Transform Clerk user to our User interface
  const user: User | null = isSignedIn && clerkUser
    ? {
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        name: clerkUser.firstName || clerkUser.fullName || undefined,
      }
    : null

  // Get pending email from sign-up resource if available
  const pendingEmail = clerkSignUp?.emailAddress || undefined

  const signUp = async (email: string, password: string, name?: string): Promise<{ needsVerification: boolean }> => {
    if (!clerkSignUp) {
      throw new Error('Sign up is not ready')
    }

    try {
      await clerkSignUp.create({
        emailAddress: email,
        password,
        firstName: name?.split(' ')[0] || undefined,
        lastName: name?.split(' ').slice(1).join(' ') || undefined,
      })

      // If email verification is required, prepare it and return status
      if (clerkSignUp.status === 'missing_requirements') {
        await clerkSignUp.prepareEmailAddressVerification({ strategy: 'email_code' })
        return { needsVerification: true }
      }

      // Complete the sign-up if status is complete
      if (clerkSignUp.status === 'complete' && clerkSignUp.createdSessionId) {
        // Try to set active session, but ignore "session already exists" errors
        try {
          await setActive({ session: clerkSignUp.createdSessionId })
        } catch (error: any) {
          const errorMessage = error?.errors?.[0]?.message || error?.message || ''
          // If session already exists, that's okay - user is already signed in
          if (!errorMessage.toLowerCase().includes('already exists') && 
              !errorMessage.toLowerCase().includes('session already')) {
            throw error
          }
        }
        return { needsVerification: false }
      } else if (clerkSignUp.status !== 'complete') {
        throw new Error('Sign up incomplete. Please check your email for verification instructions.')
      }

      return { needsVerification: false }
    } catch (error: any) {
      throw new Error(error?.errors?.[0]?.message || error?.message || 'Failed to sign up')
    }
  }

  const verifyEmail = async (code: string) => {
    if (!clerkSignUp) {
      throw new Error('Sign up is not ready')
    }

    try {
      const result = await clerkSignUp.attemptEmailAddressVerification({ code })

      if (result.status === 'complete' && result.createdSessionId) {
        // Try to set active session, but ignore "session already exists" errors
        try {
          await setActive({ session: result.createdSessionId })
        } catch (error: any) {
          const errorMessage = error?.errors?.[0]?.message || error?.message || ''
          // If session already exists, that's okay - user is already signed in
          if (!errorMessage.toLowerCase().includes('already exists') && 
              !errorMessage.toLowerCase().includes('session already')) {
            throw error
          }
        }
      } else {
        throw new Error('Verification failed. Please check your code and try again.')
      }
    } catch (error: any) {
      throw new Error(error?.errors?.[0]?.message || error?.message || 'Failed to verify email')
    }
  }

  const resendVerificationCode = async () => {
    if (!clerkSignUp) {
      throw new Error('Sign up is not ready')
    }

    try {
      await clerkSignUp.prepareEmailAddressVerification({ strategy: 'email_code' })
    } catch (error: any) {
      throw new Error(error?.errors?.[0]?.message || error?.message || 'Failed to resend verification code')
    }
  }

  const signIn = async (email: string, password: string) => {
    if (!clerkSignIn) {
      throw new Error('Sign in is not ready')
    }

    // Validate inputs
    if (!email || !email.trim()) {
      throw new Error('Email is required')
    }
    if (!password || !password.trim()) {
      throw new Error('Password is required')
    }

    // If already signed in, return early
    if (isSignedIn) {
      return
    }

    try {
      const result = await clerkSignIn.create({
        identifier: email.trim(),
        password,
      })

      // Check if sign-in is complete and we have a session
      if (result.status === 'complete') {
        if (result.createdSessionId) {
          // Try to set active session
          try {
            await setActive({ session: result.createdSessionId })
          } catch (error: any) {
            const errorMessage = error?.errors?.[0]?.message || error?.message || ''
            // Check if error is about session already existing
            const isSessionExistsError = 
              errorMessage.toLowerCase().includes('already exists') || 
              errorMessage.toLowerCase().includes('session already')
            
            // If it's a session exists error, check if we're actually signed in now
            if (isSessionExistsError) {
              // Wait a bit for the session to be active
              await new Promise(resolve => setTimeout(resolve, 100))
              // If we're now signed in, that's fine - return successfully
              return
            }
            // For other errors, throw them
            throw error
          }
        } else {
          // Status complete but no session ID - might be auto-activated
          // Wait a moment and check if signed in
          await new Promise(resolve => setTimeout(resolve, 200))
          if (!isSignedIn) {
            throw new Error('Sign in completed but session was not activated')
          }
        }
      } else {
        // Sign-in is not complete - might need additional steps (MFA, password reset, etc.)
        const statusMessage = result.status || 'unknown'
        throw new Error(`Sign in incomplete. Additional steps may be required. Status: ${statusMessage}`)
      }
    } catch (error: any) {
      // Check if we're now signed in (session might have been activated despite error)
      if (isSignedIn) {
        return
      }
      
      // Extract and throw the actual error message
      const errorMessage = error?.errors?.[0]?.message || error?.message || ''
      
      // Log error for debugging
      console.error('Sign in error:', error)
      
      // Handle specific error cases
      if (errorMessage.toLowerCase().includes('already exists') || 
          errorMessage.toLowerCase().includes('session already')) {
        // Session already exists - user might be signed in
        return
      }
      
      // Return the actual error message from Clerk
      if (errorMessage) {
        throw new Error(errorMessage)
      }
      
      // Generic fallback
      throw new Error('Failed to sign in. Please check your credentials and try again.')
    }
  }

  const signOut = async () => {
    if (!clerkSignOut) {
      throw new Error('Sign out is not ready')
    }
    await clerkSignOut({ redirectUrl: '/signin' })
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      signUp, 
      verifyEmail, 
      resendVerificationCode,
      signIn, 
      signOut, 
      isLoading,
      pendingEmail 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
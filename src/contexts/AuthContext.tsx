'use client'

import React, { createContext, useContext } from 'react'
import { useAuth as useClerkAuth, useUser, useSignIn, useSignUp, useClerk } from '@clerk/nextjs'

interface User {
    email: string
    name?: string
}

interface AuthContextType {
    user: User | null
    signUp: (email: string, password: string, name?: string) => Promise<{ needsVerification: boolean }>
    verifyEmail: (code: string) => Promise<void>
    resendVerificationCode: () => Promise<void>
    signIn: (email: string, password: string) => Promise<{ needsSecondFactor: boolean }>
    verifySignIn: (code: string) => Promise<void>
    initiatePasswordReset: (email: string) => Promise<void>
    completePasswordReset: (code: string, newPassword: string) => Promise<void>
    changePassword: (currentPassword: string, newPassword: string) => Promise<void>
    signOut: () => Promise<void>
    isLoading: boolean
    pendingEmail?: string
}

type ClerkAuthError = {
    errors?: Array<{ message: string }>
    message?: string
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
                try {
                    await setActive({ session: clerkSignUp.createdSessionId })
                } catch (error: unknown) {
                    const authError = error as ClerkAuthError
                    const errorMessage = authError?.errors?.[0]?.message || authError?.message || ''
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
        } catch (error: unknown) {
            const authError = error as ClerkAuthError
            throw new Error(authError?.errors?.[0]?.message || authError?.message || 'Failed to sign up')
        }
    }

    const verifyEmail = async (code: string) => {
        if (!clerkSignUp) {
            throw new Error('Sign up is not ready')
        }

        try {
            const result = await clerkSignUp.attemptEmailAddressVerification({ code })

            if (result.status === 'complete' && result.createdSessionId) {
                try {
                    await setActive({ session: result.createdSessionId })
                } catch (error: unknown) {
                    const authError = error as ClerkAuthError
                    const errorMessage = authError?.errors?.[0]?.message || authError?.message || ''
                    if (!errorMessage.toLowerCase().includes('already exists') &&
                        !errorMessage.toLowerCase().includes('session already')) {
                        throw error
                    }
                }
            } else {
                throw new Error('Verification failed. Please check your code and try again.')
            }
        } catch (error: unknown) {
            const authError = error as ClerkAuthError
            throw new Error(authError?.errors?.[0]?.message || authError?.message || 'Failed to verify email')
        }
    }

    const resendVerificationCode = async () => {
        if (!clerkSignUp) {
            throw new Error('Sign up is not ready')
        }

        try {
            await clerkSignUp.prepareEmailAddressVerification({ strategy: 'email_code' })
        } catch (error: unknown) {
            const authError = error as ClerkAuthError
            throw new Error(authError?.errors?.[0]?.message || authError?.message || 'Failed to resend verification code')
        }
    }

    const signIn = async (email: string, password: string): Promise<{ needsSecondFactor: boolean }> => {
        if (!clerkSignIn) {
            throw new Error('Sign in is not ready')
        }

        if (!email || !email.trim()) {
            throw new Error('Email is required')
        }
        if (!password || !password.trim()) {
            throw new Error('Password is required')
        }

        if (isSignedIn) {
            return { needsSecondFactor: false }
        }

        try {
            const result = await clerkSignIn.create({
                identifier: email.trim(),
                password,
            })

            if (result.status === 'complete') {
                if (result.createdSessionId) {
                    try {
                        await setActive({ session: result.createdSessionId })
                    } catch (error: unknown) {
                        const authError = error as ClerkAuthError
                        const errorMessage = authError?.errors?.[0]?.message || authError?.message || ''
                        const isSessionExistsError =
                            errorMessage.toLowerCase().includes('already exists') ||
                            errorMessage.toLowerCase().includes('session already')

                        if (isSessionExistsError) {
                            await new Promise(resolve => setTimeout(resolve, 100))
                            return { needsSecondFactor: false }
                        }
                        throw error
                    }
                } else {
                    await new Promise(resolve => setTimeout(resolve, 200))
                    if (!isSignedIn) {
                        throw new Error('Sign in completed but session was not activated')
                    }
                }
                return { needsSecondFactor: false }
            } else if (result.status === 'needs_second_factor') {
                const hasEmailCodeStrategy = result.supportedSecondFactors?.find(
                    (f) => f.strategy === 'email_code'
                )
                if (hasEmailCodeStrategy) {
                    await result.prepareSecondFactor({ strategy: 'email_code' })
                    return { needsSecondFactor: true }
                }
                throw new Error('Two-factor authentication is required but no supported method found.')
            } else {
                const statusMessage = result.status || 'unknown'
                throw new Error(`Sign in incomplete. Additional steps may be required. Status: ${statusMessage}`)
            }
        } catch (error: unknown) {
            if (isSignedIn) {
                return { needsSecondFactor: false }
            }
            const authError = error as ClerkAuthError
            const errorMessage = authError?.errors?.[0]?.message || authError?.message || ''
            console.error('Sign in error:', error)
            if (errorMessage.toLowerCase().includes('already exists') ||
                errorMessage.toLowerCase().includes('session already')) {
                return { needsSecondFactor: false }
            }
            if (errorMessage) {
                throw new Error(errorMessage)
            }
            throw new Error('Failed to sign in. Please check your credentials and try again.')
        }
    }

    const verifySignIn = async (code: string) => {
        if (!clerkSignIn) {
            throw new Error('Sign in is not ready')
        }

        try {
            const result = await clerkSignIn.attemptSecondFactor({
                strategy: 'email_code',
                code,
            })

            if (result.status === 'complete' && result.createdSessionId) {
                try {
                    await setActive({ session: result.createdSessionId })
                } catch (error: unknown) {
                    const authError = error as ClerkAuthError
                    const errorMessage = authError?.errors?.[0]?.message || authError?.message || ''
                    if (!errorMessage.toLowerCase().includes('already exists') &&
                        !errorMessage.toLowerCase().includes('session already')) {
                        throw error
                    }
                }
            } else {
                throw new Error('Verification failed. Please check your code and try again.')
            }
        } catch (error: unknown) {
            const authError = error as ClerkAuthError
            throw new Error(authError?.errors?.[0]?.message || authError?.message || 'Failed to verify sign in')
        }
    }

    const initiatePasswordReset = async (email: string) => {
        if (!clerkSignIn) {
            throw new Error('Sign in is not ready')
        }

        try {
            await clerkSignIn.create({
                strategy: 'reset_password_email_code',
                identifier: email,
            })
        } catch (error: unknown) {
            const authError = error as ClerkAuthError
            throw new Error(authError?.errors?.[0]?.message || authError?.message || 'Failed to initiate password reset')
        }
    }

    const completePasswordReset = async (code: string, newPassword: string) => {
        if (!clerkSignIn) {
            throw new Error('Sign in is not ready')
        }

        try {
            const result = await clerkSignIn.attemptFirstFactor({
                strategy: 'reset_password_email_code',
                code,
                password: newPassword,
            })

            if (result.status === 'complete' && result.createdSessionId) {
                try {
                    await setActive({ session: result.createdSessionId })
                } catch {
                    // If session is set, we're good
                }
            } else {
                throw new Error('Password reset incomplete. Please try again.')
            }
        } catch (error: unknown) {
            const authError = error as ClerkAuthError
            throw new Error(authError?.errors?.[0]?.message || authError?.message || 'Failed to complete password reset')
        }
    }

    const changePassword = async (currentPassword: string, newPassword: string) => {
        if (!clerkUser) {
            throw new Error('User is not logged in')
        }

        try {
            await clerkUser.updatePassword({
                currentPassword,
                newPassword,
            })
        } catch (error: unknown) {
            const authError = error as ClerkAuthError
            throw new Error(authError?.errors?.[0]?.message || authError?.message || 'Failed to change password')
        }
    }

    const signOut = async () => {
        if (!clerkSignOut) {
            throw new Error('Sign out is not ready')
        }
        await clerkSignOut()
    }

    return (
        <AuthContext.Provider value={{
            user,
            signUp,
            verifyEmail,
            resendVerificationCode,
            signIn,
            verifySignIn,
            initiatePasswordReset,
            completePasswordReset,
            changePassword,
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

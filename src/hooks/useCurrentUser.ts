// Hook to manage current user's Firestore profile with Clerk sync
import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import {
    userDoc,
    setDoc,
    updateDoc,
    onSnapshot,
    Timestamp,
} from '@/lib/firestore'
import type { User, CreateUserData } from '@/types'

interface UseCurrentUserReturn {
    user: User | null
    imageUrl: string | null
    isLoading: boolean
    error: Error | null
    needsProfileSetup: boolean
    createProfile: (data: Omit<CreateUserData, 'email'>) => Promise<void>
    updateProfile: (data: Partial<User>) => Promise<void>
    setProfileImage: (file: File) => Promise<void>
}

export function useCurrentUser(): UseCurrentUserReturn {
    const { user: clerkUser, isLoaded: isClerkLoaded } = useUser()
    const [error, setError] = useState<Error | null>(null)

    const [innerUser, setInnerUser] = useState<User | null>(null)
    const [innerIsLoading, setInnerIsLoading] = useState(true)
    const [innerNeedsProfileSetup, setInnerNeedsProfileSetup] = useState(false)

    // Derived states
    const user = clerkUser ? innerUser : null
    const isLoading = isClerkLoaded ? (clerkUser ? innerIsLoading : false) : true
    const needsProfileSetup = clerkUser ? innerNeedsProfileSetup : false

    // Subscribe to user document in Firestore
    useEffect(() => {
        if (!isClerkLoaded || !clerkUser) return

        const userId = clerkUser.id
        const userRef = userDoc(userId)

        const unsubscribe = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
                const userData = doc.data() as User
                setInnerUser(userData)
                // Profile setup is needed if essential fields are missing (role, displayName)
                // Note: onboardingComplete is for Stripe, not profile setup
                const hasRequiredProfileFields = !!(userData.role && userData.displayName)
                setInnerNeedsProfileSetup(!hasRequiredProfileFields)
            } else {
                setInnerUser(null)
                setInnerNeedsProfileSetup(true)
            }
            setInnerIsLoading(false)
        }, (err) => {
            console.error('Error fetching current user:', err)
            setError(err as Error)
            setInnerIsLoading(false)
        })

        return () => unsubscribe()
    }, [clerkUser, isClerkLoaded])

    // Create user profile in Firestore
    const createProfile = useCallback(
        async (data: Omit<CreateUserData, 'email'>) => {
            if (!clerkUser) {
                throw new Error('No authenticated user')
            }

            const userId = clerkUser.id
            const email = clerkUser.primaryEmailAddress?.emailAddress || ''

            if (!email) {
                console.warn('No email found in Clerk profile for this user.')
            }

            const now = Timestamp.now()

            const newUser: User = {
                id: userId,
                email,
                displayName: data.displayName,
                role: data.role,
                category: data.category,
                timezone: data.timezone,
                defaultSessionMinutes: data.defaultSessionMinutes || 60,
                bufferMinutes: data.bufferMinutes || 15,
                bio: data.bio,
                imageUrl: clerkUser.imageUrl || undefined, // Include Clerk profile image if exists
                notificationSettings: {
                    email: {
                        newBookingRequest: false,
                        bookingConfirmed: false,
                        bookingDeclined: false,
                        bookingCancelled: false,
                    }
                },
                // Default Stripe Fields
                pricePerSession: data.pricePerSession || 0,
                onboardingComplete: false,
                createdAt: now.toDate(),
                updatedAt: now.toDate(),
            }

            try {
                await setDoc(userDoc(userId), newUser)
            } catch (err) {
                console.error('Error creating user profile:', err)
                throw err
            }
        },
        [clerkUser]
    )

    // Update user profile in Firestore
    const updateProfile = useCallback(
        async (data: Partial<User>) => {
            if (!clerkUser) {
                throw new Error('No authenticated user')
            }

            const userId = clerkUser.id

            // Filter out undefined values as Firestore doesn't accept them
            const cleanedData: Record<string, unknown> = {}
            for (const [key, value] of Object.entries(data)) {
                if (value !== undefined) {
                    cleanedData[key] = value
                }
            }

            try {
                await updateDoc(userDoc(userId), {
                    ...cleanedData,
                    updatedAt: Timestamp.now(),
                })
            } catch (err) {
                console.error('Error updating user profile:', err)
                throw err
            }
        },
        [clerkUser]
    )

    // Upload profile image to Clerk and save URL to Firestore
    const setProfileImage = useCallback(
        async (file: File) => {
            if (!clerkUser) {
                throw new Error('No authenticated user')
            }

            try {
                await clerkUser.setProfileImage({ file })
                // Reload user to get updated imageUrl
                await clerkUser.reload()
                // Save the Clerk imageUrl to Firestore so other users can see it
                if (clerkUser.imageUrl) {
                    await updateDoc(userDoc(clerkUser.id), {
                        imageUrl: clerkUser.imageUrl,
                        updatedAt: Timestamp.now(),
                    })
                }
            } catch (err) {
                console.error('Error updating profile image:', err)
                throw err
            }
        },
        [clerkUser]
    )

    return {
        user,
        imageUrl: clerkUser?.imageUrl || null,
        isLoading: !isClerkLoaded || isLoading,
        error,
        needsProfileSetup,
        createProfile,
        updateProfile,
        setProfileImage,
    }
}

// Helper hook to check if current user is a provider
export function useIsProvider(): boolean {
    const { user } = useCurrentUser()
    return user?.role === 'provider' || user?.role === 'both'
}

// Helper hook to check if current user is a booker
export function useIsBooker(): boolean {
    const { user } = useCurrentUser()
    return user?.role === 'booker' || user?.role === 'both'
}

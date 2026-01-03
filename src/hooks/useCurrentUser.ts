// Hook to manage current user's Firestore profile with Clerk sync
import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/clerk-react'
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
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)
    const [needsProfileSetup, setNeedsProfileSetup] = useState(false)

    // Subscribe to user document in Firestore
    useEffect(() => {
        if (!isClerkLoaded) return

        // If no Clerk user, reset state
        if (!clerkUser) {
            setUser(null)
            setIsLoading(false)
            setNeedsProfileSetup(false)
            return
        }

        const userId = clerkUser.id
        const docRef = userDoc(userId)

        // Set up real-time listener
        const unsubscribe = onSnapshot(
            docRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    setUser(snapshot.data())
                    setNeedsProfileSetup(false)
                } else {
                    // User exists in Clerk but not in Firestore
                    setUser(null)
                    setNeedsProfileSetup(true)
                }
                setIsLoading(false)
                setError(null)
            },
            (err) => {
                console.error('Error fetching user profile:', err)
                setError(err as Error)
                setIsLoading(false)
            }
        )

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
                timezone: data.timezone,
                defaultSessionMinutes: data.defaultSessionMinutes || 60,
                bufferMinutes: data.bufferMinutes || 15,
                bio: data.bio,
                notificationSettings: {
                    email: {
                        newBookingRequest: false,
                        bookingConfirmed: false,
                        bookingDeclined: false,
                        bookingCancelled: false,
                    }
                },
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

            try {
                await updateDoc(userDoc(userId), {
                    ...data,
                    updatedAt: Timestamp.now(),
                })
            } catch (err) {
                console.error('Error updating user profile:', err)
                throw err
            }
        },
        [clerkUser]
    )

    // Upload profile image to Clerk
    const setProfileImage = useCallback(
        async (file: File) => {
            if (!clerkUser) {
                throw new Error('No authenticated user')
            }

            try {
                await clerkUser.setProfileImage({ file })
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

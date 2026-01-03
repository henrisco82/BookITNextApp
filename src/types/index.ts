// TypeScript types for the BookIt application

// User roles
export type UserRole = 'provider' | 'booker' | 'both'

// Booking status
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled'

// Availability type
export type AvailabilityType = 'recurring' | 'exclusion'

// User profile stored in Firestore
export interface User {
    id: string // Same as Clerk user ID
    email: string
    displayName: string
    role: UserRole
    timezone: string // IANA timezone (e.g., "Europe/Bratislava")
    defaultSessionMinutes: number // Default: 60
    bufferMinutes: number // Default: 15
    bio?: string // Optional provider bio
    createdAt: Date
    updatedAt: Date
}

// Availability block for providers
export interface Availability {
    id: string
    providerId: string
    type: AvailabilityType
    // For recurring availability
    weekday?: number // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    startTime?: string // "HH:mm" format (e.g., "09:00")
    endTime?: string // "HH:mm" format (e.g., "17:00")
    // For exclusions (one-off dates off)
    date?: string // "YYYY-MM-DD" format
    reason?: string // Optional reason for exclusion
    createdAt: Date
}

// Booking between provider and booker
export interface Booking {
    id: string
    providerId: string
    providerName: string
    bookerId: string
    bookerName: string
    bookerEmail: string
    startUTC: Date // UTC timestamp
    endUTC: Date // UTC timestamp
    status: BookingStatus
    sessionMinutes: number
    notes?: string // Optional booking notes
    cancelledAt?: Date
    cancelledBy?: 'provider' | 'booker'
    cancellationReason?: string
    createdAt: Date
    updatedAt: Date
}

// Form data types for creating/updating
export interface CreateUserData {
    email: string
    displayName: string
    role: UserRole
    timezone: string
    defaultSessionMinutes?: number
    bufferMinutes?: number
    bio?: string
}

export interface CreateAvailabilityData {
    providerId: string
    type: AvailabilityType
    weekday?: number
    startTime?: string
    endTime?: string
    date?: string
    reason?: string
}

export interface CreateBookingData {
    providerId: string
    providerName: string
    bookerId: string
    bookerName: string
    bookerEmail: string
    startUTC: Date
    endUTC: Date
    sessionMinutes: number
    notes?: string
}

// Time slot for booking UI
export interface TimeSlot {
    startUTC: Date
    endUTC: Date
    startLocal: string // Formatted in user's timezone
    endLocal: string // Formatted in user's timezone
    available: boolean
}

// Provider card data for directory listing
export interface ProviderCard {
    id: string
    displayName: string
    bio?: string
    timezone: string
    defaultSessionMinutes: number
}

// Portfolio item for provider showcase
export interface PortfolioItem {
    id: string
    providerId: string
    imageUrl: string
    title: string
    description?: string
    createdAt: Date
    updatedAt: Date
}

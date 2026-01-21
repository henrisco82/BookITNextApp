// TypeScript types for the BookIt application

// User roles
export type UserRole = 'provider' | 'booker' | 'both'

// Provider categories
export const PROVIDER_CATEGORIES = [
    'Language Teacher',
    'Career Coach',
    'Financial Advisor',
    'Personal Trainer',
    'Life Coach',
    'Business Consultant',
    'Mental Health Counselor',
    'Nutritionist',
    'Music Instructor',
    'Art Teacher',
    'Academic Tutor',
    'Legal Consultant',
    'Tech Mentor',
    'Real Estate Advisor',
    'Wedding Planner',
    'Interior Designer',
    'Fitness Coach',
    'Yoga Instructor',
    'Photography Coach',
    'Other',
] as const

export type ProviderCategory = typeof PROVIDER_CATEGORIES[number]

// Booking status
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'rejected'

// Availability type
export type AvailabilityType = 'recurring' | 'exclusion'

// Notification settings
export interface NotificationSettings {
    email: {
        newBookingRequest: boolean    // For Providers: Alerts when a booker requests a slot
        bookingConfirmed: boolean    // For Bookers: Alerts when a provider accepts
        bookingDeclined: boolean     // For Bookers: Alerts when a provider rejects
        bookingCancelled: boolean    // For Both: Alerts when a session is cancelled
    }
}

// User profile stored in Firestore
export interface User {
    id: string // Same as Clerk user ID
    email: string
    displayName: string
    role: UserRole
    category?: ProviderCategory // Provider category (e.g., "Language Teacher")
    timezone: string // IANA timezone (e.g., "Europe/Bratislava")
    defaultSessionMinutes: number // Default: 60
    bufferMinutes: number // Default: 15
    bio?: string // Optional provider bio
    imageUrl?: string // Optional profile image URL
    notificationSettings: NotificationSettings
    // Stripe Connect Fields
    stripeAccountId?: string
    pricePerSession?: number // In EUR (cents or float, let's go with float for simplicity in UI)
    onboardingComplete?: boolean
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
    priceAtBooking?: number // Price agreed at time of booking
    paymentIntentId?: string // Stripe link
    meetingLink?: string // Video call link (Jitsi Meet)
    cancelledAt?: Date
    cancelledBy?: string
    cancellationReason?: string
    // Refund fields
    refundId?: string // Stripe refund ID
    refundAmount?: number // Amount refunded in cents
    refundStatus?: string // Stripe refund status
    refundType?: 'full' | 'partial' // full = provider declined, partial = booker cancelled
    refundedAt?: Date
    createdAt: Date
    updatedAt: Date
}

// Form data types for creating/updating
export interface CreateUserData {
    email: string
    displayName: string
    role: UserRole
    category?: ProviderCategory
    timezone: string
    defaultSessionMinutes?: number
    bufferMinutes?: number
    bio?: string
    notificationSettings?: NotificationSettings
    pricePerSession?: number
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
    priceAtBooking?: number
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
    category?: ProviderCategory
    bio?: string
    timezone: string
    defaultSessionMinutes: number
    pricePerSession?: number
}

// Portfolio item for provider showcase
export interface PortfolioItem {
    id: string
    providerId: string
    imageUrls: string[]
    title: string
    description?: string
    createdAt: Date
    updatedAt: Date
}

// Review from booker to provider
export interface Review {
    id: string
    bookingId: string
    providerId: string
    bookerId: string
    bookerName: string
    bookerImageUrl?: string
    rating: number // 1-5 stars
    comment: string
    createdAt: Date
}

// Message status
export type MessageStatus = 'sent' | 'delivered' | 'read'

// Conversation between provider and booker
export interface Conversation {
    id: string
    participantIds: string[] // [providerId, bookerId]
    providerId: string
    bookerId: string
    providerName: string
    bookerName: string
    providerImageUrl?: string
    bookerImageUrl?: string
    bookingId: string // The booking that initiated this conversation
    lastMessage?: string
    lastMessageAt?: Date
    lastMessageSenderId?: string
    unreadCount: { [userId: string]: number } // Unread count per participant
    createdAt: Date
    updatedAt: Date
}

// Message in a conversation
export interface Message {
    id: string
    conversationId: string
    senderId: string
    senderName: string
    content: string
    status: MessageStatus
    createdAt: Date
}

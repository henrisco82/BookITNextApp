// Firestore collection helpers with TypeScript converters
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    Timestamp,
} from 'firebase/firestore'
import type {
    DocumentData,
    QueryDocumentSnapshot,
    FirestoreDataConverter,
    WithFieldValue,
    DocumentReference,
    CollectionReference,
} from 'firebase/firestore'
import { db } from './firebase'
import type { User, Availability, Booking, PortfolioItem, Review } from '@/types'

// Helper to convert Firestore Timestamp to Date
const timestampToDate = (timestamp: Timestamp | Date | undefined): Date => {
    if (!timestamp) return new Date()
    if (timestamp instanceof Timestamp) return timestamp.toDate()
    return timestamp
}

// User converter
const userConverter: FirestoreDataConverter<User> = {
    toFirestore(user: WithFieldValue<User>): DocumentData {
        return {
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            category: user.category ?? null,
            timezone: user.timezone,
            defaultSessionMinutes: user.defaultSessionMinutes,
            bufferMinutes: user.bufferMinutes,
            bio: user.bio ?? null,
            notificationSettings: user.notificationSettings,
            stripeAccountId: user.stripeAccountId ?? null,
            onboardingComplete: user.onboardingComplete ?? false,
            pricePerSession: user.pricePerSession ?? 0,
            imageUrl: user.imageUrl ?? null,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        }
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): User {
        const data = snapshot.data()
        return {
            id: snapshot.id,
            email: data.email,
            displayName: data.displayName,
            role: data.role,
            category: data.category || undefined,
            timezone: data.timezone,
            defaultSessionMinutes: data.defaultSessionMinutes || 60,
            bufferMinutes: data.bufferMinutes || 15,
            bio: data.bio || undefined,
            notificationSettings: data.notificationSettings || {
                email: {
                    newBookingRequest: false,
                    bookingConfirmed: false,
                    bookingDeclined: false,
                    bookingCancelled: false,
                }
            },
            stripeAccountId: data.stripeAccountId || undefined,
            onboardingComplete: data.onboardingComplete || false,
            pricePerSession: data.pricePerSession || 0,
            imageUrl: data.imageUrl || undefined,
            createdAt: timestampToDate(data.createdAt),
            updatedAt: timestampToDate(data.updatedAt),
        }
    },
}

// Availability converter
const availabilityConverter: FirestoreDataConverter<Availability> = {
    toFirestore(availability: WithFieldValue<Availability>): DocumentData {
        return {
            providerId: availability.providerId,
            type: availability.type,
            weekday: availability.weekday ?? null,
            startTime: availability.startTime ?? null,
            endTime: availability.endTime ?? null,
            date: availability.date ?? null,
            reason: availability.reason ?? null,
            createdAt: availability.createdAt,
        }
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): Availability {
        const data = snapshot.data()
        return {
            id: snapshot.id,
            providerId: data.providerId,
            type: data.type,
            weekday: data.weekday ?? undefined,
            startTime: data.startTime ?? undefined,
            endTime: data.endTime ?? undefined,
            date: data.date ?? undefined,
            reason: data.reason ?? undefined,
            createdAt: timestampToDate(data.createdAt),
        }
    },
}

// Booking converter
const bookingConverter: FirestoreDataConverter<Booking> = {
    toFirestore(booking: WithFieldValue<Booking>): DocumentData {
        return {
            providerId: booking.providerId,
            providerName: booking.providerName,
            bookerId: booking.bookerId,
            bookerName: booking.bookerName,
            bookerEmail: booking.bookerEmail,
            startUTC: booking.startUTC,
            endUTC: booking.endUTC,
            status: booking.status,
            sessionMinutes: booking.sessionMinutes,
            notes: booking.notes ?? null,
            priceAtBooking: booking.priceAtBooking ?? null,
            paymentIntentId: booking.paymentIntentId ?? null,
            meetingLink: booking.meetingLink ?? null,
            cancelledAt: booking.cancelledAt ?? null,
            cancelledBy: booking.cancelledBy ?? null,
            cancellationReason: booking.cancellationReason ?? null,
            refundId: booking.refundId ?? null,
            refundAmount: booking.refundAmount ?? null,
            refundStatus: booking.refundStatus ?? null,
            refundType: booking.refundType ?? null,
            refundedAt: booking.refundedAt ?? null,
            createdAt: booking.createdAt,
            updatedAt: booking.updatedAt,
        }
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): Booking {
        const data = snapshot.data()
        return {
            id: snapshot.id,
            providerId: data.providerId,
            providerName: data.providerName,
            bookerId: data.bookerId,
            bookerName: data.bookerName,
            bookerEmail: data.bookerEmail,
            startUTC: timestampToDate(data.startUTC),
            endUTC: timestampToDate(data.endUTC),
            status: data.status,
            sessionMinutes: data.sessionMinutes || 60,
            notes: data.notes ?? undefined,
            priceAtBooking: data.priceAtBooking ?? undefined,
            paymentIntentId: data.paymentIntentId ?? undefined,
            meetingLink: data.meetingLink ?? undefined,
            cancelledAt: data.cancelledAt ? timestampToDate(data.cancelledAt) : undefined,
            cancelledBy: data.cancelledBy ?? undefined,
            cancellationReason: data.cancellationReason ?? undefined,
            refundId: data.refundId ?? undefined,
            refundAmount: data.refundAmount ?? undefined,
            refundStatus: data.refundStatus ?? undefined,
            refundType: data.refundType ?? undefined,
            refundedAt: data.refundedAt ? timestampToDate(data.refundedAt) : undefined,
            createdAt: timestampToDate(data.createdAt),
            updatedAt: timestampToDate(data.updatedAt),
        }
    },
}

// Portfolio converter
const portfolioConverter: FirestoreDataConverter<PortfolioItem> = {
    toFirestore(item: WithFieldValue<PortfolioItem>): DocumentData {
        return {
            providerId: item.providerId,
            imageUrls: item.imageUrls,
            title: item.title,
            description: item.description ?? null,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
        }
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): PortfolioItem {
        const data = snapshot.data()
        return {
            id: snapshot.id,
            providerId: data.providerId,
            imageUrls: data.imageUrls ?? [],
            title: data.title,
            description: data.description ?? undefined,
            createdAt: timestampToDate(data.createdAt),
            updatedAt: timestampToDate(data.updatedAt),
        }
    },
}

// Review converter
const reviewConverter: FirestoreDataConverter<Review> = {
    toFirestore(review: WithFieldValue<Review>): DocumentData {
        return {
            bookingId: review.bookingId,
            providerId: review.providerId,
            bookerId: review.bookerId,
            bookerName: review.bookerName,
            bookerImageUrl: review.bookerImageUrl ?? null,
            rating: review.rating,
            comment: review.comment,
            createdAt: review.createdAt,
        }
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): Review {
        const data = snapshot.data()
        return {
            id: snapshot.id,
            bookingId: data.bookingId,
            providerId: data.providerId,
            bookerId: data.bookerId,
            bookerName: data.bookerName,
            bookerImageUrl: data.bookerImageUrl ?? undefined,
            rating: data.rating,
            comment: data.comment,
            createdAt: timestampToDate(data.createdAt),
        }
    },
}

// Collection references with converters
export const usersCollection = collection(db, 'users').withConverter(userConverter)
export const availabilityCollection = collection(db, 'availability').withConverter(availabilityConverter)
export const bookingsCollection = collection(db, 'bookings').withConverter(bookingConverter)
export const portfolioCollection = collection(db, 'portfolio').withConverter(portfolioConverter)
export const reviewsCollection = collection(db, 'reviews').withConverter(reviewConverter)

// Document references
export const userDoc = (userId: string) => doc(db, 'users', userId).withConverter(userConverter)
export const availabilityDoc = (availabilityId: string) => doc(db, 'availability', availabilityId).withConverter(availabilityConverter)
export const bookingDoc = (bookingId: string) => doc(db, 'bookings', bookingId).withConverter(bookingConverter)
export const portfolioDoc = (itemId: string) => doc(db, 'portfolio', itemId).withConverter(portfolioConverter)
export const reviewDoc = (reviewId: string) => doc(db, 'reviews', reviewId).withConverter(reviewConverter)

// Export Firestore utilities for use in hooks
export {
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    Timestamp,
    db,
}
export type { DocumentReference, CollectionReference }

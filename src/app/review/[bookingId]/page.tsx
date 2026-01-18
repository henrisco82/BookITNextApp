'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import {
    bookingDoc,
    reviewDoc,
    reviewsCollection,
    getDoc,
    setDoc,
    query,
    where,
    getDocs,
} from '@/lib/firestore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/ThemeToggle'
import type { Booking, Review } from '@/types'
import { ArrowLeft, Star, Loader2, CheckCircle } from 'lucide-react'
import { formatInTimezone } from '@/lib/timezone'

export default function ReviewPage() {
    const params = useParams()
    const bookingId = params.bookingId as string
    const router = useRouter()
    const { user } = useCurrentUser()

    const [booking, setBooking] = useState<Booking | null>(null)
    const [existingReview, setExistingReview] = useState<Review | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [submitted, setSubmitted] = useState(false)

    // Form state
    const [rating, setRating] = useState(0)
    const [hoveredRating, setHoveredRating] = useState(0)
    const [comment, setComment] = useState('')

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch booking
                const bookingSnap = await getDoc(bookingDoc(bookingId))
                if (!bookingSnap.exists()) {
                    setError('Booking not found')
                    setIsLoading(false)
                    return
                }

                const bookingData = bookingSnap.data()
                setBooking(bookingData)

                // Check if user is the booker
                if (user && bookingData.bookerId !== user.id) {
                    setError('You can only review your own bookings')
                    setIsLoading(false)
                    return
                }

                // Check if booking is completed (past and confirmed)
                const now = new Date()
                if (bookingData.status !== 'confirmed' || bookingData.endUTC > now) {
                    setError('You can only review completed sessions')
                    setIsLoading(false)
                    return
                }

                // Check if review already exists
                const reviewQ = query(
                    reviewsCollection,
                    where('bookingId', '==', bookingId)
                )
                const reviewSnap = await getDocs(reviewQ)
                if (!reviewSnap.empty) {
                    setExistingReview(reviewSnap.docs[0].data())
                }
            } catch (err) {
                console.error('Error fetching data:', err)
                setError('Failed to load booking')
            } finally {
                setIsLoading(false)
            }
        }

        if (user) {
            fetchData()
        }
    }, [bookingId, user])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || !booking || rating === 0) return

        setIsSubmitting(true)
        try {
            const reviewId = `${bookingId}_review`
            const review: Review = {
                id: reviewId,
                bookingId,
                providerId: booking.providerId,
                bookerId: user.id,
                bookerName: user.displayName,
                bookerImageUrl: user.imageUrl,
                rating,
                comment: comment.trim(),
                createdAt: new Date(),
            }

            await setDoc(reviewDoc(reviewId), review)
            setSubmitted(true)
        } catch (err) {
            console.error('Error submitting review:', err)
            alert('Failed to submit review')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-muted-foreground">{error}</p>
                <Link href="/my-bookings">
                    <Button variant="outline">Back to My Bookings</Button>
                </Link>
            </div>
        )
    }

    if (submitted || existingReview) {
        const review = existingReview || { rating, comment }
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
                {/* Header */}
                <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-16">
                            <div className="flex items-center gap-3">
                                <Link href="/my-bookings">
                                    <Button variant="ghost" size="icon">
                                        <ArrowLeft className="h-5 w-5" />
                                    </Button>
                                </Link>
                                <h1 className="text-xl font-semibold">Review</h1>
                            </div>
                            <ThemeToggle />
                        </div>
                    </div>
                </div>

                <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <Card className="border-2">
                        <CardContent className="pt-6">
                            <div className="text-center py-8">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                                    <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                                </div>
                                <h2 className="text-2xl font-bold mb-2">
                                    {existingReview ? 'Review Already Submitted' : 'Thank You!'}
                                </h2>
                                <p className="text-muted-foreground mb-6">
                                    {existingReview
                                        ? 'You have already reviewed this session.'
                                        : 'Your review has been submitted successfully.'
                                    }
                                </p>

                                {/* Show the review */}
                                <div className="bg-muted/50 rounded-lg p-6 text-left max-w-md mx-auto">
                                    <div className="flex items-center gap-1 mb-3">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Star
                                                key={star}
                                                className={`h-5 w-5 ${
                                                    star <= review.rating
                                                        ? 'fill-yellow-400 text-yellow-400'
                                                        : 'text-muted-foreground'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    {review.comment && (
                                        <p className="text-sm">{review.comment}</p>
                                    )}
                                </div>

                                <Link href="/my-bookings" className="inline-block mt-6">
                                    <Button>Back to My Bookings</Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
            {/* Header */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <Link href="/my-bookings">
                                <Button variant="ghost" size="icon">
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            </Link>
                            <h1 className="text-xl font-semibold">Leave a Review</h1>
                        </div>
                        <ThemeToggle />
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Session Info */}
                {booking && (
                    <Card className="border-2 mb-6">
                        <CardHeader>
                            <CardTitle>Session with {booking.providerName}</CardTitle>
                            <CardDescription>
                                {formatInTimezone(booking.startUTC, user?.timezone || 'UTC', 'EEEE, MMMM d, yyyy')}
                            </CardDescription>
                        </CardHeader>
                    </Card>
                )}

                {/* Review Form */}
                <Card className="border-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Star className="h-5 w-5" />
                            Rate Your Experience
                        </CardTitle>
                        <CardDescription>
                            Share your feedback to help others find great providers
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Star Rating */}
                            <div className="space-y-2">
                                <Label>Rating</Label>
                                <div className="flex items-center gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            onMouseEnter={() => setHoveredRating(star)}
                                            onMouseLeave={() => setHoveredRating(0)}
                                            className="p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                                        >
                                            <Star
                                                className={`h-8 w-8 transition-colors ${
                                                    star <= (hoveredRating || rating)
                                                        ? 'fill-yellow-400 text-yellow-400'
                                                        : 'text-muted-foreground hover:text-yellow-300'
                                                }`}
                                            />
                                        </button>
                                    ))}
                                    <span className="ml-2 text-sm text-muted-foreground">
                                        {rating > 0 && (
                                            <>
                                                {rating === 1 && 'Poor'}
                                                {rating === 2 && 'Fair'}
                                                {rating === 3 && 'Good'}
                                                {rating === 4 && 'Very Good'}
                                                {rating === 5 && 'Excellent'}
                                            </>
                                        )}
                                    </span>
                                </div>
                                {rating === 0 && (
                                    <p className="text-sm text-muted-foreground">
                                        Click a star to rate
                                    </p>
                                )}
                            </div>

                            {/* Comment */}
                            <div className="space-y-2">
                                <Label htmlFor="comment">Your Review (Optional)</Label>
                                <Textarea
                                    id="comment"
                                    placeholder="Tell us about your experience..."
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    rows={4}
                                    className="resize-none"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Your review will be visible on the provider&apos;s profile
                                </p>
                            </div>

                            {/* Submit Button */}
                            <div className="flex gap-3">
                                <Link href="/my-bookings" className="flex-1">
                                    <Button type="button" variant="outline" className="w-full">
                                        Cancel
                                    </Button>
                                </Link>
                                <Button
                                    type="submit"
                                    className="flex-1 gap-2"
                                    disabled={rating === 0 || isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <Star className="h-4 w-4" />
                                            Submit Review
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

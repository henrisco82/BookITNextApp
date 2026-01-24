'use client'

// Booker Dashboard - view and manage bookings
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { bookingDoc, userDoc, query, where, getDocs, getDoc, updateDoc, Timestamp, bookingsCollection, reviewsCollection } from '@/lib/firestore'
import { sendCancellationNotification } from '@/lib/email'
import { formatInTimezone, formatTimeInTimezone, canCancelBooking, getMinutesUntilBooking } from '@/lib/timezone'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Header, NavItem } from '@/components/Header'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import type { Booking } from '@/types'
import { Calendar, Clock, Search, ArrowLeft, AlertCircle, CheckCircle, AlertTriangle, X, Star, Video, MessageSquare } from 'lucide-react'
import { getConversationByBookingId } from '@/hooks/useConversations'

// Helper to get timestamp in milliseconds from Date or Firestore Timestamp
const getTimeMs = (date: Date | { seconds: number }): number => {
    if (date instanceof Date) return date.getTime()
    if ('seconds' in date) return date.seconds * 1000
    return 0
}

export default function BookerDashboardPage() {
    const { user } = useCurrentUser()
    const [bookings, setBookings] = useState<Booking[]>([])
    const [reviewedBookings, setReviewedBookings] = useState<Set<string>>(new Set())
    const [isLoading, setIsLoading] = useState(true)
    const [cancellingId, setCancellingId] = useState<string | null>(null)
    const [conversationIds, setConversationIds] = useState<Record<string, string>>({})
    const { confirm, ConfirmDialog } = useConfirmDialog()

    // Fetch bookings and reviews
    useEffect(() => {
        if (!user) return

        const fetchData = async () => {
            try {
                // Fetch bookings
                const bookingsQ = query(
                    bookingsCollection,
                    where('bookerId', '==', user.id)
                )
                const bookingsSnap = await getDocs(bookingsQ)

                const bookingList = bookingsSnap.docs.map((doc) => doc.data() as Booking)

                bookingList.sort((a, b) => {
                    const aTime = getTimeMs(a.startUTC as Date | { seconds: number })
                    const bTime = getTimeMs(b.startUTC as Date | { seconds: number })
                    return bTime - aTime
                })

                setBookings(bookingList)

                // Fetch reviews by this user
                const reviewsQ = query(
                    reviewsCollection,
                    where('bookerId', '==', user.id)
                )
                const reviewsSnap = await getDocs(reviewsQ)
                const reviewedIds = new Set(reviewsSnap.docs.map(doc => doc.data().bookingId))
                setReviewedBookings(reviewedIds)
                setIsLoading(false)

                // Fetch conversation IDs for confirmed bookings (non-blocking)
                const confirmedBookings = bookingList.filter(b => b.status === 'confirmed')
                const convoIds: Record<string, string> = {}
                for (const booking of confirmedBookings) {
                    try {
                        const convo = await getConversationByBookingId(booking.id)
                        if (convo) {
                            convoIds[booking.id] = convo.id
                        }
                    } catch (err) {
                        console.error('Error fetching conversation for booking:', booking.id, err)
                    }
                }
                setConversationIds(convoIds)
            } catch (error) {
                console.error('Error fetching data:', error)
                setIsLoading(false)
            }
        }

        fetchData()
    }, [user])

    // Cancel booking with partial refund
    const handleCancel = async (booking: Booking) => {
        if (!canCancelBooking(booking.startUTC)) {
            alert('Cannot cancel bookings less than 1 hour before start time.')
            return
        }

        const confirmed = await confirm({
            title: 'Cancel Booking',
            description: 'Are you sure you want to cancel this booking? You will receive a refund minus the platform fee.',
            confirmLabel: 'Yes, Cancel Booking',
            cancelLabel: 'Keep Booking',
            variant: 'destructive',
        })

        if (!confirmed) return

        setCancellingId(booking.id)
        try {
            // Process partial refund first (platform keeps 1% fee)
            const refundRes = await fetch('/api/stripe/refund', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookingId: booking.id, type: 'partial' }),
            })

            const refundData = await refundRes.json()

            if (!refundRes.ok) {
                throw new Error(refundData.error || 'Failed to process refund')
            }

            console.log('Refund processed:', refundData)

            // Update booking status
            await updateDoc(bookingDoc(booking.id), {
                status: 'cancelled',
                cancelledAt: Timestamp.now(),
                cancelledBy: 'booker',
                updatedAt: Timestamp.now(),
            })

            // Send cancellation notification to provider
            try {
                const providerSnap = await getDoc(userDoc(booking.providerId))
                const providerData = providerSnap.exists() ? providerSnap.data() : null

                if (providerData?.notificationSettings?.email?.bookingCancelled && providerData.email) {
                    await sendCancellationNotification(
                        booking,
                        'booker',
                        providerData.email,
                        booking.providerName
                    )
                }
            } catch (emailError) {
                console.error('Error sending cancellation email:', emailError)
                // Don't fail the cancellation if email fails
            }

            // Update local state
            setBookings(
                bookings.map((b) =>
                    b.id === booking.id
                        ? { ...b, status: 'cancelled' as const, cancelledAt: new Date(), cancelledBy: 'booker' as const }
                        : b
                )
            )

            alert(`Booking cancelled. Refund of €${refundData.amount.toFixed(2)} is being processed.`)
        } catch (error) {
            console.error('Error cancelling booking:', error)
            alert(`Failed to cancel booking: ${error instanceof Error ? error.message : 'Unknown error'}`)
        } finally {
            setCancellingId(null)
        }
    }

    // Separate upcoming and past/cancelled/rejected bookings
    const nowMs = Date.now()
    const upcomingBookings = bookings.filter(
        (b) => getTimeMs(b.startUTC as Date | { seconds: number }) > nowMs && (b.status === 'confirmed' || b.status === 'pending')
    )
    const pastBookings = bookings.filter(
        (b) => getTimeMs(b.startUTC as Date | { seconds: number }) <= nowMs || b.status === 'cancelled' || b.status === 'rejected'
    )

    const navItems: NavItem[] = [
        { href: '/browse', label: 'Browse Providers', icon: <Search className="h-4 w-4" />, variant: 'outline' },
    ]

    return (
        <>
        {ConfirmDialog}
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
            {/* Header */}
            <Header
                title="My Bookings"
                backHref="/browse"
                backIcon={<ArrowLeft className="h-5 w-5" />}
                navItems={navItems}
                showSignOut={false}
                maxWidth="max-w-4xl"
            />

            {/* Notifications Status Warning */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
                {!user?.notificationSettings?.email?.bookingDeclined && (
                    <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 shrink-0" />
                            <p className="text-sm">
                                <strong>Notifications are Off:</strong> You won&apos;t be emailed when your requests are accepted or declined.
                            </p>
                        </div>
                        <Link href="/profile/edit">
                            <Button variant="outline" size="sm" className="border-amber-500/20 hover:bg-amber-500/10">
                                Enable Notifications
                            </Button>
                        </Link>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {isLoading ? (
                    <div className="text-center py-12 text-muted-foreground">Loading bookings...</div>
                ) : bookings.length === 0 ? (
                    <div className="text-center py-12">
                        <Calendar className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-medium mb-2">No bookings yet</h3>
                        <p className="text-muted-foreground mb-6">
                            Browse providers to book your first session
                        </p>
                        <Link href="/browse">
                            <Button className="gap-2">
                                <Search className="h-4 w-4" />
                                Browse Providers
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* Upcoming Bookings */}
                        <Card className="border-2 mb-6">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-primary" />
                                    Upcoming Bookings
                                </CardTitle>
                                <CardDescription>Your scheduled sessions</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {upcomingBookings.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-6">
                                        No upcoming bookings
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {upcomingBookings.map((booking) => {
                                            const canCancel = canCancelBooking(booking.startUTC)
                                            const minutesUntil = getMinutesUntilBooking(booking.startUTC)

                                            return (
                                                <div
                                                    key={booking.id}
                                                    className="p-4 rounded-lg border bg-card"
                                                >
                                                    {/* Mobile: stacked layout, Desktop: side by side */}
                                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                        {/* Provider info and date/time */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <p className="font-medium truncate">{booking.providerName}</p>
                                                                {booking.status === 'pending' ? (
                                                                    <span className="inline-flex items-center gap-1 text-xs text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                                                                        <Clock className="h-3 w-3" />
                                                                        Pending
                                                                    </span>
                                                                ) : minutesUntil <= 60 ? (
                                                                    <span className="inline-flex items-center gap-1 text-xs text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                                                        <AlertCircle className="h-3 w-3" />
                                                                        Soon
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 text-xs text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                                                                        <CheckCircle className="h-3 w-3" />
                                                                        Confirmed
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-muted-foreground">
                                                                {formatInTimezone(booking.startUTC, user?.timezone || 'UTC', 'EEE, MMM d, yyyy')}
                                                            </p>
                                                            <p className="text-sm text-primary">
                                                                <Clock className="h-3 w-3 inline mr-1" />
                                                                {formatTimeInTimezone(booking.startUTC, user?.timezone || 'UTC')} - {formatTimeInTimezone(booking.endUTC, user?.timezone || 'UTC')}
                                                            </p>
                                                        </div>
                                                        {/* Action buttons */}
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            {booking.status === 'confirmed' && conversationIds[booking.id] && (
                                                                <Link href={`/messages/${conversationIds[booking.id]}`}>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="text-purple-600 border-purple-200 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-950"
                                                                    >
                                                                        <MessageSquare className="h-4 w-4 sm:mr-1" />
                                                                        <span className="hidden sm:inline">Message</span>
                                                                    </Button>
                                                                </Link>
                                                            )}
                                                            {booking.status === 'confirmed' && booking.meetingLink && (
                                                                <a
                                                                    href={booking.meetingLink}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                >
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="text-primary border-primary/20 hover:bg-primary/10"
                                                                    >
                                                                        <Video className="h-4 w-4 sm:mr-1" />
                                                                        <span className="hidden sm:inline">Join</span>
                                                                    </Button>
                                                                </a>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleCancel(booking)}
                                                                disabled={!canCancel || cancellingId === booking.id}
                                                                className="text-destructive hover:text-destructive"
                                                            >
                                                                {cancellingId === booking.id ? (
                                                                    '...'
                                                                ) : (
                                                                    <>
                                                                        <X className="h-4 w-4 sm:mr-1" />
                                                                        <span className="hidden sm:inline">Cancel</span>
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Past/Cancelled Bookings */}
                        {pastBookings.length > 0 && (
                            <Card className="border-2">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-muted-foreground">
                                        <Clock className="h-5 w-5" />
                                        Past & Cancelled
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {pastBookings.slice(0, 10).map((booking) => {
                                            const endTimeMs = getTimeMs(booking.endUTC as Date | { seconds: number })
                                            const isCompleted = booking.status === 'confirmed' && endTimeMs <= nowMs
                                            const hasReviewed = reviewedBookings.has(booking.id)
                                            const canReview = isCompleted && !hasReviewed

                                            // Determine display status
                                            const getStatusDisplay = () => {
                                                if (booking.status === 'cancelled') return { text: 'Cancelled', className: 'bg-destructive/10 text-destructive' }
                                                if (booking.status === 'rejected') return { text: 'Declined', className: 'bg-destructive/10 text-destructive' }
                                                if (booking.status === 'pending') return { text: 'Expired (Not Confirmed)', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' }
                                                if (isCompleted) return { text: 'Completed', className: 'bg-muted text-muted-foreground' }
                                                return { text: booking.status, className: 'bg-muted text-muted-foreground' }
                                            }
                                            const statusDisplay = getStatusDisplay()

                                            return (
                                                <div
                                                    key={booking.id}
                                                    className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
                                                >
                                                    <div>
                                                        <p className="font-medium text-muted-foreground">
                                                            {booking.providerName}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {formatInTimezone(
                                                                booking.startUTC,
                                                                user?.timezone || 'UTC',
                                                                'MMM d, yyyy'
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {canReview ? (
                                                            <Link href={`/review/${booking.id}`}>
                                                                <Button size="sm" variant="outline" className="gap-1">
                                                                    <Star className="h-4 w-4" />
                                                                    Leave Review
                                                                </Button>
                                                            </Link>
                                                        ) : hasReviewed ? (
                                                            <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                                                                <CheckCircle className="h-4 w-4" />
                                                                Reviewed
                                                            </div>
                                                        ) : (
                                                            <div className={`text-sm px-2 py-1 rounded ${statusDisplay.className}`}>
                                                                {statusDisplay.text}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
            </div>
        </div>
        </>
    )
}

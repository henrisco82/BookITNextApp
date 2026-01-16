'use client'

// Booker Dashboard - view and manage bookings
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { bookingDoc, query, where, getDocs, updateDoc, Timestamp, bookingsCollection } from '@/lib/firestore'
import { formatInTimezone, formatTimeInTimezone, canCancelBooking, getMinutesUntilBooking } from '@/lib/timezone'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ThemeToggle'
import type { Booking } from '@/types'
import { Calendar, Clock, Search, ArrowLeft, AlertCircle, CheckCircle, AlertTriangle, X } from 'lucide-react'

export default function BookerDashboardPage() {
    const { user } = useCurrentUser()
    const [bookings, setBookings] = useState<Booking[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [cancellingId, setCancellingId] = useState<string | null>(null)

    // Fetch bookings
    useEffect(() => {
        if (!user) return

        const fetchBookings = async () => {
            try {
                const q = query(
                    bookingsCollection,
                    where('bookerId', '==', user.id)
                )
                const snapshot = await getDocs(q)

                const bookingList = snapshot.docs.map((doc) => doc.data() as Booking)

                bookingList.sort((a, b) => {
                    const aTime = a.startUTC instanceof Date ? a.startUTC.getTime() :
                        (a.startUTC as unknown as { seconds: number }).seconds ? (a.startUTC as unknown as { seconds: number }).seconds * 1000 : 0
                    const bTime = b.startUTC instanceof Date ? b.startUTC.getTime() :
                        (b.startUTC as unknown as { seconds: number }).seconds ? (b.startUTC as unknown as { seconds: number }).seconds * 1000 : 0
                    return bTime - aTime
                })

                setBookings(bookingList)
            } catch (error) {
                console.error('Error fetching bookings:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchBookings()
    }, [user])

    // Cancel booking with partial refund
    const handleCancel = async (booking: Booking) => {
        if (!canCancelBooking(booking.startUTC)) {
            alert('Cannot cancel bookings less than 1 hour before start time.')
            return
        }

        if (!confirm('Are you sure you want to cancel this booking? You will receive a refund minus the platform fee.')) return

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
    const now = new Date()
    const upcomingBookings = bookings.filter(
        (b) => b.startUTC > now && (b.status === 'confirmed' || b.status === 'pending')
    )
    const pastBookings = bookings.filter(
        (b) => b.startUTC <= now || b.status === 'cancelled' || b.status === 'rejected'
    )

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
            {/* Header */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <Link href="/browse">
                                <Button variant="ghost" size="icon">
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            </Link>
                            <h1 className="text-xl font-semibold">My Bookings</h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link href="/browse">
                                <Button variant="outline" size="sm" className="gap-2">
                                    <Search className="h-4 w-4" />
                                    Browse Providers
                                </Button>
                            </Link>
                            <ThemeToggle />
                        </div>
                    </div>
                </div>
            </div>

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
                                                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                                                >
                                                    <div>
                                                        <p className="font-medium">{booking.providerName}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {formatInTimezone(
                                                                booking.startUTC,
                                                                user?.timezone || 'UTC',
                                                                'EEEE, MMMM d, yyyy'
                                                            )}
                                                        </p>
                                                        <p className="text-sm text-primary">
                                                            <Clock className="h-3 w-3 inline mr-1" />
                                                            {formatTimeInTimezone(booking.startUTC, user?.timezone || 'UTC')} -{' '}
                                                            {formatTimeInTimezone(booking.endUTC, user?.timezone || 'UTC')}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        {booking.status === 'pending' ? (
                                                            <div className="flex items-center gap-1 text-sm text-yellow-500 mb-2">
                                                                <Clock className="h-4 w-4" />
                                                                Pending confirmation
                                                            </div>
                                                        ) : minutesUntil <= 60 ? (
                                                            <div className="flex items-center gap-1 text-sm text-amber-500 mb-2">
                                                                <AlertCircle className="h-4 w-4" />
                                                                Starting soon
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1 text-sm text-green-500 mb-2">
                                                                <CheckCircle className="h-4 w-4" />
                                                                Confirmed
                                                            </div>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleCancel(booking)}
                                                            disabled={!canCancel || cancellingId === booking.id}
                                                            className="text-destructive hover:text-destructive"
                                                        >
                                                            {cancellingId === booking.id ? (
                                                                'Cancelling...'
                                                            ) : (
                                                                <>
                                                                    <X className="h-4 w-4 mr-1" />
                                                                    Cancel
                                                                </>
                                                            )}
                                                        </Button>
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
                                        {pastBookings.slice(0, 10).map((booking) => (
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
                                                <div
                                                    className={`text-sm px-2 py-1 rounded ${booking.status === 'cancelled' || booking.status === 'rejected'
                                                        ? 'bg-destructive/10 text-destructive'
                                                        : 'bg-muted text-muted-foreground'
                                                        }`}
                                                >
                                                    {booking.status === 'cancelled' ? 'Cancelled' : booking.status === 'rejected' ? 'Declined' : 'Completed'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

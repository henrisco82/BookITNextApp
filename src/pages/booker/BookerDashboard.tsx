// Booker Dashboard - view and manage bookings
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import {
    bookingsCollection,
    bookingDoc,
    query,
    where,
    getDocs,
    updateDoc,
    Timestamp,
} from '@/lib/firestore'
import { formatInTimezone, formatTimeInTimezone, canCancelBooking, getMinutesUntilBooking } from '@/lib/timezone'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ThemeToggle'
import type { Booking } from '@/types'
import { Calendar, Clock, Search, ArrowLeft, X, AlertCircle, CheckCircle } from 'lucide-react'

export function BookerDashboard() {
    const { user } = useCurrentUser()
    const [bookings, setBookings] = useState<Booking[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [cancellingId, setCancellingId] = useState<string | null>(null)

    // Fetch bookings
    useEffect(() => {
        if (!user) return

        const fetchBookings = async () => {
            try {
                console.log('Fetching bookings for user:', user.id)
                // Simple query without orderBy to avoid composite index requirement
                // We'll sort client-side instead
                const q = query(
                    bookingsCollection,
                    where('bookerId', '==', user.id)
                )
                const snapshot = await getDocs(q)
                console.log('Found bookings:', snapshot.docs.length)

                const bookingList = snapshot.docs.map((doc) => {
                    const data = doc.data()
                    console.log('Booking:', data)
                    return data
                })

                // Sort client-side: most recent first
                bookingList.sort((a, b) => {
                    const aTime = a.startUTC instanceof Date ? a.startUTC.getTime() : 0
                    const bTime = b.startUTC instanceof Date ? b.startUTC.getTime() : 0
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

    // Cancel booking
    const handleCancel = async (booking: Booking) => {
        if (!canCancelBooking(booking.startUTC)) {
            alert('Cannot cancel bookings less than 1 hour before start time.')
            return
        }

        if (!confirm('Are you sure you want to cancel this booking?')) return

        setCancellingId(booking.id)
        try {
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
                        ? { ...b, status: 'cancelled', cancelledAt: new Date(), cancelledBy: 'booker' }
                        : b
                )
            )
        } catch (error) {
            console.error('Error cancelling booking:', error)
            alert('Failed to cancel booking')
        } finally {
            setCancellingId(null)
        }
    }

    // Separate upcoming and past bookings
    const now = new Date()
    const upcomingBookings = bookings.filter(
        (b) => b.startUTC > now && b.status !== 'cancelled'
    )
    const pastBookings = bookings.filter(
        (b) => b.startUTC <= now || b.status === 'cancelled'
    )

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
            {/* Header */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <Link to="/browse">
                                <Button variant="ghost" size="icon">
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            </Link>
                            <h1 className="text-xl font-semibold">My Bookings</h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link to="/browse">
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
                        <Link to="/browse">
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
                                                        {minutesUntil <= 60 ? (
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
                                                    className={`text-sm px-2 py-1 rounded ${booking.status === 'cancelled'
                                                        ? 'bg-destructive/10 text-destructive'
                                                        : 'bg-muted text-muted-foreground'
                                                        }`}
                                                >
                                                    {booking.status === 'cancelled' ? 'Cancelled' : 'Completed'}
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

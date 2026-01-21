'use client'

// Provider Dashboard - overview of upcoming bookings and quick actions
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import {
    bookingsCollection,
    bookingDoc,
    updateDoc,
    query,
    where,
    getDocs,
    getDoc,
    userDoc,
} from '@/lib/firestore'
import { formatInTimezone, formatTimeInTimezone } from '@/lib/timezone'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ThemeToggle'
import type { Booking } from '@/types'
import { Calendar, Clock, Users, Settings, LogOut, Plus, Images, Check, XCircle, AlertTriangle, CreditCard, Euro, ArrowLeft, Video, MessageSquare } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { sendBookerNotification } from '@/lib/email'
import { getOrCreateConversation, getConversationByBookingId } from '@/hooks/useConversations'

export default function ProviderDashboardPage() {
    const { user, isLoading: isUserLoading } = useCurrentUser()
    const { signOut } = useAuth()
    const router = useRouter()
    const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([])
    const [pendingBookings, setPendingBookings] = useState<Booking[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [conversationIds, setConversationIds] = useState<Record<string, string>>({})

    // Fetch upcoming bookings
    useEffect(() => {
        if (!user) return

        const fetchBookings = async () => {
            try {
                const q = query(
                    bookingsCollection,
                    where('providerId', '==', user.id)
                )
                const snapshot = await getDocs(q)

                const now = new Date()
                const docs = snapshot.docs.map((doc) => doc.data() as Booking)

                const confirmed = docs
                    .filter((b) => {
                        const isConfirmed = b.status === 'confirmed'
                        const isUpcoming = b.startUTC > now
                        return isConfirmed && isUpcoming
                    })
                    .sort((a, b) => {
                        const aTime = a.startUTC instanceof Date ? a.startUTC.getTime() : 0
                        const bTime = b.startUTC instanceof Date ? b.startUTC.getTime() : 0
                        return aTime - bTime
                    })

                const pending = docs
                    .filter((b) => {
                        const isPending = b.status === 'pending'
                        const isUpcoming = b.startUTC > now
                        return isPending && isUpcoming
                    })
                    .sort((a, b) => {
                        const aTime = a.startUTC instanceof Date ? a.startUTC.getTime() : 0
                        const bTime = b.startUTC instanceof Date ? b.startUTC.getTime() : 0
                        return aTime - bTime
                    })

                setUpcomingBookings(confirmed.slice(0, 5))
                setPendingBookings(pending)

                // Fetch conversation IDs for confirmed bookings
                const convoIds: Record<string, string> = {}
                for (const booking of confirmed) {
                    const convo = await getConversationByBookingId(booking.id)
                    if (convo) {
                        convoIds[booking.id] = convo.id
                    }
                }
                setConversationIds(convoIds)
            } catch (error) {
                console.error('Error fetching bookings:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchBookings()
    }, [user])

    const handleSignOut = async () => {
        await signOut()
        router.push('/')
    }

    const handleBookingAction = async (bookingId: string, action: 'confirm' | 'reject') => {
        try {
            const booking = pendingBookings.find(b => b.id === bookingId)

            if (action === 'reject') {
                // Process refund first before updating status
                const refundRes = await fetch('/api/stripe/refund', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bookingId }),
                })

                const refundData = await refundRes.json()

                if (!refundRes.ok) {
                    throw new Error(refundData.error || 'Failed to process refund')
                }

                console.log('Refund processed:', refundData)
            }

            const newStatus = action === 'confirm' ? 'confirmed' : 'rejected'

            // Generate meeting link if confirming and booking doesn't have one
            let meetingLink = booking?.meetingLink
            if (action === 'confirm' && !meetingLink) {
                meetingLink = `https://meet.jit.si/bookit-${bookingId}`
            }

            await updateDoc(bookingDoc(bookingId), {
                status: newStatus,
                ...(action === 'confirm' && meetingLink ? { meetingLink } : {}),
                updatedAt: new Date()
            })

            // Update local state
            setPendingBookings(prev => prev.filter(b => b.id !== bookingId))

            if (action === 'confirm') {
                if (booking) {
                    const updated = { ...booking, status: 'confirmed', meetingLink } as Booking
                    setUpcomingBookings(prev => [...prev, updated].sort((a, b) =>
                        (a.startUTC.getTime() - b.startUTC.getTime())
                    ).slice(0, 5))

                    const bookerSnap = await getDoc(userDoc(booking.bookerId))
                    const bookerData = bookerSnap.exists() ? bookerSnap.data() : null

                    // Create conversation for this booking
                    try {
                        const conversation = await getOrCreateConversation({
                            providerId: booking.providerId,
                            bookerId: booking.bookerId,
                            providerName: booking.providerName,
                            bookerName: booking.bookerName,
                            providerImageUrl: user?.imageUrl,
                            bookerImageUrl: bookerData?.imageUrl,
                            bookingId: booking.id,
                        })
                        setConversationIds(prev => ({ ...prev, [booking.id]: conversation.id }))
                    } catch (error) {
                        console.error('Error creating conversation:', error)
                    }

                    if (bookerData?.notificationSettings?.email?.bookingConfirmed) {
                        // Use booker email from booking, or fall back to user profile email
                        const bookerEmail = booking.bookerEmail || bookerData.email
                        if (bookerEmail) {
                            const bookingWithLink = { ...booking, meetingLink }
                            await sendBookerNotification(bookingWithLink, 'confirmed', bookerEmail)
                        } else {
                            console.warn('No email found for booker:', booking.bookerId)
                        }
                    }
                }
            } else {
                if (booking) {
                    const bookerSnap = await getDoc(userDoc(booking.bookerId))
                    const bookerData = bookerSnap.exists() ? bookerSnap.data() : null

                    if (bookerData?.notificationSettings?.email?.bookingDeclined) {
                        // Use booker email from booking, or fall back to user profile email
                        const bookerEmail = booking.bookerEmail || bookerData.email
                        if (bookerEmail) {
                            await sendBookerNotification(booking, 'rejected', bookerEmail)
                        } else {
                            console.warn('No email found for booker:', booking.bookerId)
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`Error ${action}ing booking:`, error)
            alert(`Failed to ${action} booking: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
            {/* Header */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <Link href="/dashboard">
                                <Button variant="ghost" size="icon">
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            </Link>
                            <h1 className="text-xl font-semibold">Provider Dashboard</h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <ThemeToggle />
                            <Button onClick={handleSignOut} variant="ghost" size="sm" className="gap-2">
                                <LogOut className="h-4 w-4" />
                                Sign Out
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-2">
                        Welcome back, {user?.displayName?.split(' ')[0] || 'Provider'}!
                    </h2>
                    <p className="text-muted-foreground">
                        Manage your availability and view upcoming bookings.
                    </p>
                </div>

                {/* Stripe Connection Warning */}
                {!isUserLoading && user && !user.onboardingComplete && (
                    <div className={`mb-6 p-4 rounded-lg border flex items-center justify-between gap-4 ${user?.stripeAccountId
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-500'
                            : 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-500'
                        }`}>
                        <div className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 shrink-0" />
                            <div className="text-sm">
                                {user?.stripeAccountId ? (
                                    <>
                                        <strong>Stripe account is being verified:</strong> Your account details are submitted, but Stripe is still enabling your account for payouts. This usually takes a few minutes.
                                    </>
                                ) : (
                                    <>
                                        <strong>Setup Payouts:</strong> To receive payments, you need to connect your Stripe account.
                                    </>
                                )}
                            </div>
                        </div>
                        <Button
                            className={user?.stripeAccountId ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}
                            size="sm"
                            onClick={async () => {
                                try {
                                    const res = await fetch('/api/stripe/onboard', { method: 'POST' });
                                    const data = await res.json();
                                    if (data.url) {
                                        window.location.href = data.url;
                                    } else {
                                        alert(data.error || 'Failed to get onboarding URL');
                                    }
                                } catch (error) {
                                    console.error('Error connecting Stripe:', error);
                                    alert('Failed to initiate Stripe connection');
                                }
                            }}
                        >
                            {user?.stripeAccountId ? 'Check Status' : 'Connect Stripe'}
                        </Button>
                    </div>
                )}

                {/* Notifications Status Warning */}
                {!user?.notificationSettings?.email?.newBookingRequest && (
                    <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 shrink-0" />
                            <p className="text-sm">
                                <strong>Notifications are Off:</strong> You won&apos;t receive emails for new booking requests.
                            </p>
                        </div>
                        <Link href="/profile/edit">
                            <Button variant="outline" size="sm" className="border-amber-500/20 hover:bg-amber-500/10">
                                Enable Notifications
                            </Button>
                        </Link>
                    </div>
                )}

                {/* Pending Requests */}
                {pendingBookings.length > 0 && (
                    <Card className="mb-6 border-2 border-yellow-500/20 bg-yellow-500/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500">
                                <Clock className="h-5 w-5" />
                                Pending Requests ({pendingBookings.length})
                            </CardTitle>
                            <CardDescription>
                                These bookings require your confirmation
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {pendingBookings.map((booking) => (
                                <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-background border gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold">{booking.bookerName}</span>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500">
                                                Pending
                                            </span>
                                        </div>
                                        <div className="text-sm text-muted-foreground space-y-1">
                                            <p className="flex items-center gap-2">
                                                <Calendar className="h-3 w-3" />
                                                {formatInTimezone(booking.startUTC, user?.timezone || 'UTC', 'EEEE, MMMM d, yyyy')}
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <Clock className="h-3 w-3" />
                                                {formatTimeInTimezone(booking.startUTC, user?.timezone || 'UTC')} -{' '}
                                                {formatTimeInTimezone(booking.endUTC, user?.timezone || 'UTC')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-red-500 border-red-200"
                                            onClick={() => handleBookingAction(booking.id, 'reject')}
                                        >
                                            <XCircle className="h-4 w-4 mr-1" />
                                            Decline
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                            onClick={() => handleBookingAction(booking.id, 'confirm')}
                                        >
                                            <Check className="h-4 w-4 mr-1" />
                                            Accept
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                <div className="grid gap-6 md:grid-cols-3">
                    {/* Quick Actions */}
                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Plus className="h-5 w-5" />
                                Quick Actions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Link href="/provider/availability">
                                <Button variant="outline" className="w-full justify-start gap-2">
                                    <Clock className="h-4 w-4" />
                                    Manage Availability
                                </Button>
                            </Link>
                            <Link href="/provider/portfolio">
                                <Button variant="outline" className="w-full justify-start gap-2">
                                    <Images className="h-4 w-4" />
                                    Manage Portfolio
                                </Button>
                            </Link>
                            <Link href="/profile/edit">
                                <Button variant="outline" className="w-full justify-start gap-2">
                                    <Settings className="h-4 w-4" />
                                    Profile Settings
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Stats */}
                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Stats
                            </CardTitle>
                            <CardDescription>Your booking overview</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-4 rounded-lg bg-muted/50">
                                    <p className="text-3xl font-bold text-primary">{upcomingBookings.length}</p>
                                    <p className="text-sm text-muted-foreground">Upcoming</p>
                                </div>
                                <div className="text-center p-4 rounded-lg bg-muted/50">
                                    <p className="text-3xl font-bold text-green-500">{user?.pricePerSession || 0}</p>
                                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                                        <Euro className="h-3 w-3" />/session
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Session Settings */}
                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5" />
                                Session Settings
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                                <span className="text-sm text-muted-foreground">Price</span>
                                <span className="font-medium flex items-center gap-1">
                                    <Euro className="h-3 w-3" />
                                    {user?.pricePerSession || 0}
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                                <span className="text-sm text-muted-foreground">Session Length</span>
                                <span className="font-medium">{user?.defaultSessionMinutes || 60} min</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                                <span className="text-sm text-muted-foreground">Timezone</span>
                                <span className="font-medium text-xs">{user?.timezone || 'UTC'}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Upcoming Bookings */}
                <Card className="mt-6 border-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Upcoming Bookings
                        </CardTitle>
                        <CardDescription>Your next scheduled sessions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="text-center py-8 text-muted-foreground">Loading bookings...</div>
                        ) : upcomingBookings.length === 0 ? (
                            <div className="text-center py-8">
                                <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                                <p className="text-muted-foreground mb-4">No upcoming bookings yet</p>
                                <Link href="/provider/availability">
                                    <Button variant="outline" className="gap-2">
                                        <Plus className="h-4 w-4" />
                                        Set Up Availability
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {upcomingBookings.map((booking) => (
                                    <div
                                        key={booking.id}
                                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                                    >
                                        <div>
                                            <p className="font-medium">{booking.bookerName}</p>
                                            <p className="text-sm text-muted-foreground">{booking.bookerEmail}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {conversationIds[booking.id] && (
                                                <Link href={`/messages/${conversationIds[booking.id]}`}>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-purple-600 border-purple-200 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-950"
                                                    >
                                                        <MessageSquare className="h-4 w-4 mr-1" />
                                                        Message
                                                    </Button>
                                                </Link>
                                            )}
                                            {booking.meetingLink && (
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
                                                        <Video className="h-4 w-4 mr-1" />
                                                        Join Call
                                                    </Button>
                                                </a>
                                            )}
                                            <div className="text-right">
                                                <p className="font-medium">
                                                    {formatInTimezone(booking.startUTC, user?.timezone || 'UTC', 'EEE, MMM d')}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {formatTimeInTimezone(booking.startUTC, user?.timezone || 'UTC')} -{' '}
                                                    {formatTimeInTimezone(booking.endUTC, user?.timezone || 'UTC')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

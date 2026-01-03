// Provider Dashboard - overview of upcoming bookings and quick actions
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import {
    bookingsCollection,
    query,
    where,
    getDocs,
} from '@/lib/firestore'
import { formatInTimezone, formatTimeInTimezone } from '@/lib/timezone'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ThemeToggle'
import type { Booking } from '@/types'
import { Calendar, Clock, Users, Settings, LogOut, Plus, Images } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export function ProviderDashboard() {
    const { user } = useCurrentUser()
    const { signOut } = useAuth()
    const navigate = useNavigate()
    const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Fetch upcoming bookings
    useEffect(() => {
        if (!user) return

        const fetchBookings = async () => {
            try {
                console.log('Fetching bookings for provider:', user.id)
                // Simple query to avoid composite index requirement
                // Filter and sort client-side
                const q = query(
                    bookingsCollection,
                    where('providerId', '==', user.id)
                )
                const snapshot = await getDocs(q)
                console.log('Found bookings:', snapshot.docs.length)

                const now = new Date()
                const bookings = snapshot.docs
                    .map((doc) => doc.data())
                    .filter((b) => {
                        // Filter for confirmed + upcoming
                        const isConfirmed = b.status === 'confirmed'
                        const isUpcoming = b.startUTC > now
                        console.log('Booking:', b.bookerName, 'status:', b.status, 'startUTC:', b.startUTC, 'isUpcoming:', isUpcoming)
                        return isConfirmed && isUpcoming
                    })
                    .sort((a, b) => {
                        // Sort by start time ascending
                        const aTime = a.startUTC instanceof Date ? a.startUTC.getTime() : 0
                        const bTime = b.startUTC instanceof Date ? b.startUTC.getTime() : 0
                        return aTime - bTime
                    })

                console.log('Filtered upcoming bookings:', bookings.length)
                setUpcomingBookings(bookings.slice(0, 5)) // Show next 5
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
        navigate('/signin')
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
            {/* Header */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <Calendar className="h-5 w-5 text-blue-500" />
                            </div>
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
                            <Link to="/provider/availability">
                                <Button variant="outline" className="w-full justify-start gap-2">
                                    <Clock className="h-4 w-4" />
                                    Manage Availability
                                </Button>
                            </Link>
                            <Link to="/provider/portfolio">
                                <Button variant="outline" className="w-full justify-start gap-2">
                                    <Images className="h-4 w-4" />
                                    Manage Portfolio
                                </Button>
                            </Link>
                            <Link to="/dashboard">
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
                                    <p className="text-3xl font-bold text-green-500">{user?.defaultSessionMinutes || 60}</p>
                                    <p className="text-sm text-muted-foreground">Min/session</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Settings Card */}
                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5" />
                                Session Settings
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                                <span className="text-sm text-muted-foreground">Session Length</span>
                                <span className="font-medium">{user?.defaultSessionMinutes || 60} min</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                                <span className="text-sm text-muted-foreground">Buffer Time</span>
                                <span className="font-medium">{user?.bufferMinutes || 15} min</span>
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
                                <Link to="/provider/availability">
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
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

// Booking Page - slot picker and booking form
import { useState, useEffect, useMemo } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import {
    userDoc,
    availabilityCollection,
    bookingsCollection,
    bookingDoc,
    portfolioCollection, // Added
    query,
    where,
    getDocs,
    getDoc,
    setDoc,
    Timestamp,
} from '@/lib/firestore'
import {
    formatInTimezone,
    formatTimeInTimezone,
    formatDateISO,
    getNextNDays,
    getWeekday,
    generateTimeSlots,
    isSlotAvailable,
    getUserTimezone,
} from '@/lib/timezone'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ThemeToggle'
import type { User, Availability, Booking, PortfolioItem } from '@/types'
import { ArrowLeft, Calendar, Clock, Check, ChevronLeft, ChevronRight, Globe, Image as ImageIcon } from 'lucide-react'

export function BookingPage() {
    const { providerId } = useParams<{ providerId: string }>()
    const navigate = useNavigate()
    const { user: currentUser } = useCurrentUser()

    // Provider data
    const [provider, setProvider] = useState<User | null>(null)
    const [availability, setAvailability] = useState<Availability[]>([])
    const [existingBookings, setExistingBookings] = useState<Booking[]>([])
    const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Selection state
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [selectedSlot, setSelectedSlot] = useState<{ startUTC: Date; endUTC: Date } | null>(null)

    // Booking state
    const [notes, setNotes] = useState('')
    const [isBooking, setIsBooking] = useState(false)
    const [bookingSuccess, setBookingSuccess] = useState(false)

    // Date range for viewing (next 14 days)
    const [weekOffset, setWeekOffset] = useState(0)
    const userTimezone = getUserTimezone()

    // Fetch provider data
    useEffect(() => {
        if (!providerId) return

        const fetchData = async () => {
            try {
                // Fetch provider
                const providerSnap = await getDoc(userDoc(providerId))
                if (!providerSnap.exists()) {
                    navigate('/browse')
                    return
                }
                setProvider(providerSnap.data())

                // Fetch availability
                const availQ = query(
                    availabilityCollection,
                    where('providerId', '==', providerId)
                )
                const availSnap = await getDocs(availQ)
                setAvailability(availSnap.docs.map((d) => d.data()))

                // Fetch existing bookings (next 30 days)
                const now = new Date()
                const bookingsQ = query(
                    bookingsCollection,
                    where('providerId', '==', providerId),
                    where('startUTC', '>=', Timestamp.fromDate(now)),
                    where('status', '==', 'confirmed')
                )
                const bookingsSnap = await getDocs(bookingsQ)
                setExistingBookings(bookingsSnap.docs.map((d) => d.data()))

                // Fetch portfolio
                const portfolioQ = query(
                    portfolioCollection,
                    where('providerId', '==', providerId)
                )
                const portfolioSnap = await getDocs(portfolioQ)
                setPortfolioItems(portfolioSnap.docs.map(d => d.data()))
            } catch (error) {
                console.error('Error fetching provider data:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [providerId, navigate])

    // Generate dates for the week view
    const visibleDates = useMemo(() => {
        const start = new Date()
        start.setDate(start.getDate() + weekOffset * 7)
        return getNextNDays(start, 7)
    }, [weekOffset])

    // Get available slots for selected date
    const availableSlots = useMemo(() => {
        if (!selectedDate || !provider) return []

        const dateStr = formatDateISO(selectedDate)
        const weekday = getWeekday(selectedDate)

        // Check if date is excluded
        const isExcluded = availability.some(
            (a) => a.type === 'exclusion' && a.date === dateStr
        )
        if (isExcluded) return []

        // Get recurring availability for this weekday
        const recurringBlocks = availability.filter(
            (a) => a.type === 'recurring' && a.weekday === weekday
        )

        // Generate slots for each block
        const allSlots: { startUTC: Date; endUTC: Date }[] = []
        for (const block of recurringBlocks) {
            if (!block.startTime || !block.endTime) continue

            const slots = generateTimeSlots(
                selectedDate,
                block.startTime,
                block.endTime,
                provider.defaultSessionMinutes,
                provider.bufferMinutes,
                provider.timezone
            )
            allSlots.push(...slots)
        }

        // Filter out booked slots and past slots
        const now = new Date()
        return allSlots.filter((slot) => {
            if (slot.startUTC <= now) return false
            return isSlotAvailable(slot.startUTC, slot.endUTC, existingBookings)
        })
    }, [selectedDate, provider, availability, existingBookings])

    // Check if a date has any availability
    const dateHasAvailability = (date: Date): boolean => {
        const dateStr = formatDateISO(date)
        const weekday = getWeekday(date)

        // Check exclusion
        const isExcluded = availability.some(
            (a) => a.type === 'exclusion' && a.date === dateStr
        )
        if (isExcluded) return false

        // Check recurring
        return availability.some(
            (a) => a.type === 'recurring' && a.weekday === weekday
        )
    }

    // Handle booking submission
    const handleBooking = async () => {
        if (!selectedSlot || !provider || !currentUser) return

        setIsBooking(true)
        try {
            const bookingId = `${providerId}_${currentUser.id}_${Date.now()}`
            const bookingData: Booking = {
                id: bookingId,
                providerId: provider.id,
                providerName: provider.displayName,
                bookerId: currentUser.id,
                bookerName: currentUser.displayName,
                bookerEmail: currentUser.email,
                startUTC: selectedSlot.startUTC,
                endUTC: selectedSlot.endUTC,
                status: 'confirmed',
                sessionMinutes: provider.defaultSessionMinutes,
                notes: notes || undefined,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            await setDoc(bookingDoc(bookingId), bookingData)
            setBookingSuccess(true)
        } catch (error) {
            console.error('Error creating booking:', error)
            alert('Failed to create booking. Please try again.')
        } finally {
            setIsBooking(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        )
    }

    if (!provider) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-muted-foreground mb-4">Provider not found</p>
                    <Link to="/browse">
                        <Button>Back to Browse</Button>
                    </Link>
                </div>
            </div>
        )
    }

    // Success screen
    if (bookingSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
                <Card className="max-w-md w-full border-2">
                    <CardContent className="pt-8 text-center">
                        <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                            <Check className="h-8 w-8 text-green-500" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
                        <p className="text-muted-foreground mb-6">
                            Your session with {provider.displayName} has been booked.
                        </p>
                        {selectedSlot && (
                            <div className="p-4 rounded-lg bg-muted/50 mb-6 text-left">
                                <p className="font-medium">
                                    {formatInTimezone(selectedSlot.startUTC, userTimezone, 'EEEE, MMMM d, yyyy')}
                                </p>
                                <p className="text-primary">
                                    {formatTimeInTimezone(selectedSlot.startUTC, userTimezone)} -{' '}
                                    {formatTimeInTimezone(selectedSlot.endUTC, userTimezone)}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    <Globe className="h-3 w-3 inline mr-1" />
                                    {userTimezone}
                                </p>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <Link to="/my-bookings" className="flex-1">
                                <Button className="w-full">View My Bookings</Button>
                            </Link>
                            <Link to="/browse" className="flex-1">
                                <Button variant="outline" className="w-full">
                                    Browse More
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

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
                            <h1 className="text-xl font-semibold">Book Session</h1>
                        </div>
                        <ThemeToggle />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Provider Info */}
                    <Card className="border-2 lg:col-span-1">
                        <CardHeader>
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/20">
                                    <span className="text-xl font-semibold text-primary">
                                        {provider.displayName[0]?.toUpperCase()}
                                    </span>
                                </div>
                                <div>
                                    <CardTitle>{provider.displayName}</CardTitle>
                                    <CardDescription>
                                        <Clock className="h-3 w-3 inline mr-1" />
                                        {provider.defaultSessionMinutes} min sessions
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        {provider.bio && (
                            <CardContent>
                                <p className="text-sm text-muted-foreground">{provider.bio}</p>
                            </CardContent>
                        )}
                    </Card>

                    {/* Date Selection */}
                    <Card className="border-2 lg:col-span-2">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    Select Date
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
                                        disabled={weekOffset === 0}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setWeekOffset(weekOffset + 1)}
                                        disabled={weekOffset >= 4}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-7 gap-2">
                                {visibleDates.map((date) => {
                                    const hasAvail = dateHasAvailability(date)
                                    const isSelected =
                                        selectedDate && formatDateISO(date) === formatDateISO(selectedDate)
                                    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0))

                                    return (
                                        <button
                                            key={date.toISOString()}
                                            onClick={() => {
                                                setSelectedDate(date)
                                                setSelectedSlot(null)
                                            }}
                                            disabled={!hasAvail || isPast}
                                            className={`p-3 rounded-lg text-center transition-all ${isSelected
                                                ? 'bg-primary text-primary-foreground'
                                                : hasAvail && !isPast
                                                    ? 'bg-primary/10 hover:bg-primary/20 border border-primary/20'
                                                    : 'bg-muted/30 text-muted-foreground cursor-not-allowed'
                                                }`}
                                        >
                                            <p className="text-xs opacity-70">
                                                {formatInTimezone(date, userTimezone, 'EEE')}
                                            </p>
                                            <p className="text-lg font-semibold">
                                                {formatInTimezone(date, userTimezone, 'd')}
                                            </p>
                                        </button>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Portfolio Section */}
                {portfolioItems.length > 0 && (
                    <Card className="border-2 mt-6">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ImageIcon className="h-5 w-5" />
                                Portfolio
                            </CardTitle>
                            <CardDescription>
                                Recent work by {provider.displayName}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                                {portfolioItems.map((item) => (
                                    <div key={item.id} className="group relative aspect-square rounded-lg overflow-hidden bg-muted">
                                        <img
                                            src={item.imageUrl}
                                            alt={item.title}
                                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                        />
                                        <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <p className="text-white text-sm font-medium truncate">{item.title}</p>
                                            {item.description && (
                                                <p className="text-white/80 text-xs truncate">{item.description}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Time Slots */}
                {selectedDate && (
                    <Card className="border-2 mt-6">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Available Times - {formatInTimezone(selectedDate, userTimezone, 'EEEE, MMMM d')}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                Showing times in {userTimezone}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {availableSlots.length === 0 ? (
                                <p className="text-center text-muted-foreground py-6">
                                    No available times for this date
                                </p>
                            ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                    {availableSlots.map((slot) => {
                                        const isSelectedSlot =
                                            selectedSlot?.startUTC.getTime() === slot.startUTC.getTime()

                                        return (
                                            <button
                                                key={slot.startUTC.toISOString()}
                                                onClick={() => setSelectedSlot(slot)}
                                                className={`p-3 rounded-lg text-center transition-all ${isSelectedSlot
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted/50 hover:bg-primary/10 border hover:border-primary/30'
                                                    }`}
                                            >
                                                <p className="font-medium">
                                                    {formatTimeInTimezone(slot.startUTC, userTimezone)}
                                                </p>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Booking Confirmation */}
                {selectedSlot && (
                    <Card className="border-2 mt-6 border-primary/30 bg-primary/5">
                        <CardHeader>
                            <CardTitle>Confirm Booking</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 rounded-lg bg-background border">
                                <p className="font-medium">
                                    {formatInTimezone(selectedSlot.startUTC, userTimezone, 'EEEE, MMMM d, yyyy')}
                                </p>
                                <p className="text-primary text-lg">
                                    {formatTimeInTimezone(selectedSlot.startUTC, userTimezone)} -{' '}
                                    {formatTimeInTimezone(selectedSlot.endUTC, userTimezone)}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {provider.defaultSessionMinutes} minute session with {provider.displayName}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Any details or questions for the session..."
                                    rows={3}
                                    className="w-full px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                                />
                            </div>

                            <Button
                                size="lg"
                                className="w-full"
                                onClick={handleBooking}
                                disabled={isBooking}
                            >
                                {isBooking ? 'Booking...' : 'Confirm Booking'}
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}

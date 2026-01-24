'use client'

// Booking Page - slot picker and booking form
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import {
    userDoc,
    availabilityCollection,
    bookingsCollection,
    query,
    where,
    getDocs,
    getDoc,
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
import { Header } from '@/components/Header'
import type { User, Availability, Booking } from '@/types'
import Image from 'next/image'
import { ArrowLeft, Calendar, Clock, ChevronLeft, ChevronRight, Globe, Euro, User as UserIcon } from 'lucide-react'

export default function BookingPage() {
    const params = useParams()
    const providerId = params.providerId as string
    const router = useRouter()
    const { user: currentUser } = useCurrentUser()

    // Provider data
    const [provider, setProvider] = useState<User | null>(null)
    const [availability, setAvailability] = useState<Availability[]>([])
    const [existingBookings, setExistingBookings] = useState<Booking[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Selection state
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [selectedSlot, setSelectedSlot] = useState<{ startUTC: Date; endUTC: Date } | null>(null)

    // Booking state
    const [notes, setNotes] = useState('')
    const [isBooking, setIsBooking] = useState(false)

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
                    router.push('/browse')
                    return
                }
                setProvider(providerSnap.data() as User)

                // Fetch availability
                const availQ = query(
                    availabilityCollection,
                    where('providerId', '==', providerId)
                )
                const availSnap = await getDocs(availQ)
                setAvailability(availSnap.docs.map((d) => d.data() as Availability))

                // Fetch existing bookings
                const now = new Date()
                const bookingsQ = query(
                    bookingsCollection,
                    where('providerId', '==', providerId)
                )
                const bookingsSnap = await getDocs(bookingsQ)
                const confirmedUpComing = bookingsSnap.docs
                    .map((d) => d.data() as Booking)
                    .filter(b => (b.status === 'confirmed' || b.status === 'pending') && b.startUTC >= now)

                setExistingBookings(confirmedUpComing)
            } catch (error) {
                console.error('Error fetching provider data:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [providerId, router])

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

    // Handle booking submission (now with Stripe Checkout)
    const handleBooking = async () => {
        if (!selectedSlot || !provider || !currentUser) return

        setIsBooking(true)
        try {
            // First check if provider has Stripe connected
            if (!provider.stripeAccountId || !provider.onboardingComplete) {
                alert('This provider is not currently accepting payments. Please try again later.')
                setIsBooking(false)
                return
            }

            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    providerId: provider.id,
                    startUTC: selectedSlot.startUTC,
                    endUTC: selectedSlot.endUTC,
                    notes: notes,
                    price: provider.pricePerSession || 0
                }),
            })

            const data = await res.json()
            if (data.url) {
                window.location.href = data.url
            } else {
                alert(data.error || 'Failed to create checkout session')
                setIsBooking(false)
            }
        } catch (error) {
            console.error('Error initiating checkout:', error)
            alert('Failed to initiate checkout. Please try again.')
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
                    <Link href="/browse">
                        <Button>Back to Browse</Button>
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
            {/* Header */}
            <Header
                title="Book Session"
                backHref="/browse"
                backIcon={<ArrowLeft className="h-5 w-5" />}
                showSignOut={false}
                maxWidth="max-w-4xl"
            />

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Provider Info */}
                    <Card className="border-2 lg:col-span-1">
                        <CardHeader>
                            <div className="flex items-center gap-4">
                                <div className="w-24 h-24 rounded-full border-4 border-background overflow-hidden bg-muted flex-shrink-0 relative">
                                    {provider.imageUrl ? (
                                        <Image
                                            src={provider.imageUrl}
                                            alt={provider.displayName}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="h-full w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-4xl font-bold text-primary">
                                            {provider.displayName[0]?.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <CardTitle className="truncate">{provider.displayName}</CardTitle>
                                    <div className="flex flex-col gap-1 mt-1">
                                        <CardDescription className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {provider.defaultSessionMinutes} min
                                        </CardDescription>
                                        {provider.pricePerSession && (
                                            <span className="text-sm font-semibold flex items-center gap-0.5 text-primary">
                                                <Euro className="h-3 w-3" />
                                                {provider.pricePerSession}/session
                                            </span>
                                        )}
                                    </div>
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

                {/* View Provider Profile Link */}
                <div className="mt-6">
                    <Link href={`/view-provider/${providerId}`}>
                        <Button variant="outline" className="gap-2">
                            <UserIcon className="h-4 w-4" />
                            View {provider.displayName}&apos;s Profile & Portfolio
                        </Button>
                    </Link>
                </div>

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
                                <div className="flex justify-between items-center mt-1">
                                    <p className="text-sm text-muted-foreground">
                                        {provider.defaultSessionMinutes} minute session with {provider.displayName}
                                    </p>
                                    {provider.pricePerSession && (
                                        <p className="font-semibold text-primary flex items-center gap-0.5">
                                            <Euro className="h-3 w-3" />
                                            {provider.pricePerSession}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Any details or questions for the session..."
                                    rows={3}
                                    className="w-full px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none border-input"
                                />
                            </div>

                            <Button
                                size="lg"
                                className="w-full"
                                onClick={handleBooking}
                                disabled={isBooking}
                            >
                                {isBooking ? 'Processing...' : `Pay & Book (${provider.pricePerSession} EUR)`}
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}

// Timezone utility functions using date-fns-tz
import { format, parseISO, addDays, getDay } from 'date-fns'
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz'

// Get user's detected timezone
export function getUserTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
}

// Common timezone options for selection
export const TIMEZONE_OPTIONS = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET)' },
    { value: 'Europe/Bratislava', label: 'Bratislava (CET)' },
    { value: 'Europe/Moscow', label: 'Moscow (MSK)' },
    { value: 'Asia/Dubai', label: 'Dubai (GST)' },
    { value: 'Asia/Kolkata', label: 'India (IST)' },
    { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
]

// Format a UTC date to a specific timezone
export function formatInTimezone(
    date: Date,
    timezone: string,
    formatStr: string = 'PPpp' // e.g., "Jan 1, 2025, 9:00 AM"
): string {
    return formatInTimeZone(date, timezone, formatStr)
}

// Convert a local time string (HH:mm) on a specific date to UTC
export function localTimeToUTC(
    dateStr: string, // "YYYY-MM-DD"
    timeStr: string, // "HH:mm"
    timezone: string
): Date {
    const dateTimeStr = `${dateStr}T${timeStr}:00`
    const localDate = parseISO(dateTimeStr)
    return fromZonedTime(localDate, timezone)
}

// Convert UTC date to local time in a timezone
export function utcToLocalTime(date: Date, timezone: string): Date {
    return toZonedTime(date, timezone)
}

// Format time only in user's timezone
export function formatTimeInTimezone(
    date: Date,
    timezone: string
): string {
    return formatInTimeZone(date, timezone, 'h:mm a') // e.g., "9:00 AM"
}

// Format date only in user's timezone
export function formatDateInTimezone(
    date: Date,
    timezone: string
): string {
    return formatInTimeZone(date, timezone, 'EEE, MMM d, yyyy') // e.g., "Mon, Jan 1, 2025"
}

// Get weekday number for a date (0 = Sunday, 6 = Saturday)
export function getWeekday(date: Date): number {
    return getDay(date)
}

// Generate array of dates for next N days
export function getNextNDays(startDate: Date, days: number): Date[] {
    const dates: Date[] = []
    for (let i = 0; i < days; i++) {
        dates.push(addDays(startDate, i))
    }
    return dates
}

// Format date as YYYY-MM-DD
export function formatDateISO(date: Date): string {
    return format(date, 'yyyy-MM-dd')
}

// Parse YYYY-MM-DD string to Date
export function parseDateISO(dateStr: string): Date {
    return parseISO(dateStr)
}

// Generate time slots for a day given start/end times and duration
export function generateTimeSlots(
    date: Date,
    startTime: string, // "HH:mm"
    endTime: string, // "HH:mm"
    durationMinutes: number,
    bufferMinutes: number,
    timezone: string
): { startUTC: Date; endUTC: Date }[] {
    const dateStr = formatDateISO(date)
    const slots: { startUTC: Date; endUTC: Date }[] = []

    // Parse start and end times
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)

    // Calculate total minutes from start of day
    let currentMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin

    // Generate slots
    while (currentMinutes + durationMinutes <= endMinutes) {
        const slotStartHour = Math.floor(currentMinutes / 60)
        const slotStartMin = currentMinutes % 60
        const slotStartTime = `${slotStartHour.toString().padStart(2, '0')}:${slotStartMin.toString().padStart(2, '0')}`

        const slotEndMinutes = currentMinutes + durationMinutes
        const slotEndHour = Math.floor(slotEndMinutes / 60)
        const slotEndMin = slotEndMinutes % 60
        const slotEndTime = `${slotEndHour.toString().padStart(2, '0')}:${slotEndMin.toString().padStart(2, '0')}`

        const startUTC = localTimeToUTC(dateStr, slotStartTime, timezone)
        const endUTC = localTimeToUTC(dateStr, slotEndTime, timezone)

        slots.push({ startUTC, endUTC })

        // Move to next slot (duration + buffer)
        currentMinutes += durationMinutes + bufferMinutes
    }

    return slots
}

// Check if a slot overlaps with existing bookings
export function isSlotAvailable(
    slotStart: Date,
    slotEnd: Date,
    existingBookings: { startUTC: Date; endUTC: Date }[]
): boolean {
    return !existingBookings.some((booking) => {
        // Overlap if: booking starts before slot ends AND booking ends after slot starts
        return booking.startUTC < slotEnd && booking.endUTC > slotStart
    })
}

// Check if cancellation is allowed (> 1 hour before start)
export function canCancelBooking(bookingStartUTC: Date): boolean {
    const now = new Date()
    const oneHourBefore = new Date(bookingStartUTC.getTime() - 60 * 60 * 1000)
    return now < oneHourBefore
}

// Get minutes until booking starts
export function getMinutesUntilBooking(bookingStartUTC: Date): number {
    const now = new Date()
    return Math.floor((bookingStartUTC.getTime() - now.getTime()) / (60 * 1000))
}

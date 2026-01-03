import emailjs from '@emailjs/browser'
import type { Booking } from '@/types'
import { format } from 'date-fns'

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

export const sendProviderNotification = async (
    booking: Booking,
    providerEmail: string
): Promise<void> => {
    if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
        console.warn('EmailJS credentials missing, skipping email.')
        return
    }

    // Format date and time
    const date = format(booking.startUTC, 'MMMM do, yyyy')
    const time = format(booking.startUTC, 'h:mm a')

    const templateParams = {
        provider_name: booking.providerName,
        provider_email: providerEmail,
        to_email: providerEmail,
        to_name: booking.providerName,
        service_name: 'New Booking Request',
        customer_name: booking.bookerName,
        customer_email: booking.bookerEmail,
        booking_date: date,
        booking_time: time,
        customer_message: booking.notes || 'No message provided',
        app_name: 'BookIt'
    }

    try {
        await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY)
        console.log('Provider notification sent successfully')
    } catch (error) {
        console.error('Failed to send provider notification:', error)
    }
}

export const sendBookerNotification = async (
    booking: Booking,
    status: 'confirmed' | 'rejected',
    bookerEmail: string
): Promise<void> => {
    if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
        console.warn('EmailJS credentials missing, skipping email.')
        return
    }

    const date = format(booking.startUTC, 'MMMM do, yyyy')
    const time = format(booking.startUTC, 'h:mm a')

    const templateParams = {
        provider_name: booking.providerName,
        customer_name: booking.bookerName,
        customer_email: bookerEmail,
        to_email: bookerEmail,
        to_name: booking.bookerName,
        service_name: `Booking ${status === 'confirmed' ? 'Accepted' : 'Declined'}`,
        booking_date: date,
        booking_time: time,
        customer_message: status === 'confirmed'
            ? `Your booking with ${booking.providerName} has been confirmed!`
            : `Unfortunately, ${booking.providerName} was unable to accept your booking request.`,
        app_name: 'BookIt'
    }

    try {
        await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY)
        console.log('Booker notification sent successfully')
    } catch (error) {
        console.error('Failed to send booker notification:', error)
    }
}

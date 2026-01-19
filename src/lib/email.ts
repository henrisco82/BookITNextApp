import emailjs from '@emailjs/browser'
import type { Booking } from '@/types'
import { format } from 'date-fns'

const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID
const PROVIDER_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID // For provider notifications
const BOOKER_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_BOOKER_TEMPLATE_ID // For booker notifications
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY

export const sendProviderNotification = async (
    booking: Booking,
    providerEmail: string
): Promise<void> => {
    console.log('📧 sendProviderNotification called')
    console.log('  - Provider email:', providerEmail)
    console.log('  - SERVICE_ID exists:', !!SERVICE_ID)
    console.log('  - PROVIDER_TEMPLATE_ID exists:', !!PROVIDER_TEMPLATE_ID)
    console.log('  - PUBLIC_KEY exists:', !!PUBLIC_KEY)

    if (!SERVICE_ID || !PROVIDER_TEMPLATE_ID || !PUBLIC_KEY) {
        console.warn('❌ EmailJS credentials missing, skipping provider email.')
        console.warn('  Missing:', !SERVICE_ID ? 'SERVICE_ID' : '', !PROVIDER_TEMPLATE_ID ? 'PROVIDER_TEMPLATE_ID' : '', !PUBLIC_KEY ? 'PUBLIC_KEY' : '')
        return
    }

    if (!providerEmail || !providerEmail.includes('@')) {
        console.warn('❌ Invalid provider email address, skipping email:', providerEmail)
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
        meeting_link: booking.meetingLink || '',
        app_name: 'BookIt'
    }

    console.log('📧 Sending provider email with params:', JSON.stringify(templateParams, null, 2))

    try {
        const response = await emailjs.send(SERVICE_ID, PROVIDER_TEMPLATE_ID, templateParams, PUBLIC_KEY)
        console.log('✅ Provider notification sent successfully:', response)
    } catch (error) {
        console.error('❌ Failed to send provider notification:', error)
    }
}

export const sendBookerNotification = async (
    booking: Booking,
    status: 'confirmed' | 'rejected',
    bookerEmail: string
): Promise<void> => {
    console.log('📧 sendBookerNotification called')
    console.log('  - Status:', status)
    console.log('  - Booker email:', bookerEmail)
    console.log('  - SERVICE_ID exists:', !!SERVICE_ID)
    console.log('  - BOOKER_TEMPLATE_ID exists:', !!BOOKER_TEMPLATE_ID)
    console.log('  - PUBLIC_KEY exists:', !!PUBLIC_KEY)

    if (!SERVICE_ID || !BOOKER_TEMPLATE_ID || !PUBLIC_KEY) {
        console.warn('❌ EmailJS booker template credentials missing, skipping booker email.')
        console.warn('  Missing:', !SERVICE_ID ? 'SERVICE_ID' : '', !BOOKER_TEMPLATE_ID ? 'BOOKER_TEMPLATE_ID' : '', !PUBLIC_KEY ? 'PUBLIC_KEY' : '')
        return
    }

    if (!bookerEmail || !bookerEmail.includes('@')) {
        console.warn('❌ Invalid booker email address, skipping email:', bookerEmail)
        return
    }

    const date = format(booking.startUTC, 'MMMM do, yyyy')
    const time = format(booking.startUTC, 'h:mm a')

    // Build the message with meeting link if confirmed
    let message = status === 'confirmed'
        ? `Your booking with ${booking.providerName} has been confirmed!`
        : `Unfortunately, ${booking.providerName} was unable to accept your booking request.`

    if (status === 'confirmed' && booking.meetingLink) {
        message += `\n\nJoin the video call at: ${booking.meetingLink}`
    }

    const templateParams = {
        provider_name: booking.providerName,
        customer_name: booking.bookerName,
        customer_email: bookerEmail,
        to_email: bookerEmail,
        to_name: booking.bookerName,
        service_name: `Booking ${status === 'confirmed' ? 'Accepted' : 'Declined'}`,
        booking_date: date,
        booking_time: time,
        customer_message: message,
        meeting_link: status === 'confirmed' ? (booking.meetingLink || '') : '',
        app_name: 'BookIt'
    }

    console.log('📧 Sending booker email with params:', JSON.stringify(templateParams, null, 2))

    try {
        const response = await emailjs.send(SERVICE_ID, BOOKER_TEMPLATE_ID, templateParams, PUBLIC_KEY)
        console.log('✅ Booker notification sent successfully:', response)
    } catch (error) {
        console.error('❌ Failed to send booker notification:', error)
    }
}

export const sendCancellationNotification = async (
    booking: Booking,
    cancelledBy: 'booker' | 'provider',
    recipientEmail: string,
    recipientName: string
): Promise<void> => {
    // Use booker template for cancellation notifications
    const templateId = BOOKER_TEMPLATE_ID

    console.log('📧 sendCancellationNotification called')
    console.log('  - Cancelled by:', cancelledBy)
    console.log('  - Recipient email:', recipientEmail)
    console.log('  - SERVICE_ID exists:', !!SERVICE_ID)
    console.log('  - TEMPLATE_ID exists:', !!templateId)
    console.log('  - PUBLIC_KEY exists:', !!PUBLIC_KEY)

    if (!SERVICE_ID || !templateId || !PUBLIC_KEY) {
        console.warn('❌ EmailJS credentials missing, skipping cancellation email.')
        return
    }

    if (!recipientEmail || !recipientEmail.includes('@')) {
        console.warn('❌ Invalid recipient email address, skipping email:', recipientEmail)
        return
    }

    const date = format(booking.startUTC, 'MMMM do, yyyy')
    const time = format(booking.startUTC, 'h:mm a')

    const cancellerName = cancelledBy === 'booker' ? booking.bookerName : booking.providerName
    const message = `The booking scheduled for ${date} at ${time} has been cancelled by ${cancellerName}.`

    const templateParams = {
        provider_name: booking.providerName,
        customer_name: recipientName,
        customer_email: recipientEmail,
        to_email: recipientEmail,
        to_name: recipientName,
        service_name: 'Booking Cancelled',
        booking_date: date,
        booking_time: time,
        customer_message: message,
        meeting_link: '',
        app_name: 'BookIt'
    }

    console.log('📧 Sending cancellation email with params:', JSON.stringify(templateParams, null, 2))

    try {
        const response = await emailjs.send(SERVICE_ID, templateId, templateParams, PUBLIC_KEY)
        console.log('✅ Cancellation notification sent successfully:', response)
    } catch (error) {
        console.error('❌ Failed to send cancellation notification:', error)
    }
}

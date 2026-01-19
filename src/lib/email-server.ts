// Server-side email sending using EmailJS REST API
// Use this for API routes and webhooks

import type { Booking } from '@/types'
import { format } from 'date-fns'

const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID
const PROVIDER_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID
const BOOKER_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_BOOKER_TEMPLATE_ID
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
const PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY // Required for server-side calls

interface EmailJSResponse {
    status: number
    text: string
}

async function sendEmailJS(templateId: string, templateParams: Record<string, string>): Promise<EmailJSResponse> {
    console.log('📧 [SERVER] sendEmailJS called')
    console.log('  - PRIVATE_KEY loaded:', !!PRIVATE_KEY)
    console.log('  - PRIVATE_KEY length:', PRIVATE_KEY?.length || 0)
    console.log('  - PRIVATE_KEY first 4 chars:', PRIVATE_KEY?.substring(0, 4) || 'N/A')

    if (!PRIVATE_KEY) {
        console.error('❌ [SERVER] EMAILJS_PRIVATE_KEY is not set - required for server-side email')
        return { status: 403, text: 'Private key not configured' }
    }

    const requestBody = {
        service_id: SERVICE_ID,
        template_id: templateId,
        user_id: PUBLIC_KEY,
        accessToken: PRIVATE_KEY,
        template_params: templateParams,
    }

    console.log('📧 [SERVER] Request body (without accessToken):', JSON.stringify({
        ...requestBody,
        accessToken: '[REDACTED]'
    }, null, 2))

    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    })

    const text = await response.text()
    console.log('📧 [SERVER] EmailJS response:', response.status, text)
    return { status: response.status, text }
}

export const sendProviderNotificationServer = async (
    booking: Booking,
    providerEmail: string
): Promise<void> => {
    console.log('📧 [SERVER] sendProviderNotification called')
    console.log('  - Provider email:', providerEmail)
    console.log('  - SERVICE_ID exists:', !!SERVICE_ID)
    console.log('  - PROVIDER_TEMPLATE_ID exists:', !!PROVIDER_TEMPLATE_ID)
    console.log('  - PUBLIC_KEY exists:', !!PUBLIC_KEY)
    console.log('  - PRIVATE_KEY exists:', !!PRIVATE_KEY)

    if (!SERVICE_ID || !PROVIDER_TEMPLATE_ID || !PUBLIC_KEY || !PRIVATE_KEY) {
        console.warn('❌ [SERVER] EmailJS credentials missing, skipping provider email.')
        console.warn('  Missing:',
            !SERVICE_ID ? 'SERVICE_ID' : '',
            !PROVIDER_TEMPLATE_ID ? 'PROVIDER_TEMPLATE_ID' : '',
            !PUBLIC_KEY ? 'PUBLIC_KEY' : '',
            !PRIVATE_KEY ? 'PRIVATE_KEY' : ''
        )
        return
    }

    if (!providerEmail || !providerEmail.includes('@')) {
        console.warn('❌ [SERVER] Invalid provider email address, skipping email:', providerEmail)
        return
    }

    const date = format(booking.startUTC, 'MMMM do, yyyy')
    const time = format(booking.startUTC, 'h:mm a')

    const templateParams = {
        provider_name: booking.providerName,
        provider_email: providerEmail,
        to_email: providerEmail,
        to_name: booking.providerName,
        service_name: 'New Booking Request',
        customer_name: booking.bookerName,
        customer_email: booking.bookerEmail || '',
        booking_date: date,
        booking_time: time,
        // Support both variable names for template compatibility
        customer_message: booking.notes || 'No message provided',
        status_message: `You have a new booking request from ${booking.bookerName} for ${date} at ${time}.`,
        meeting_link: booking.meetingLink || '',
        app_name: 'BookIt'
    }

    console.log('📧 [SERVER] Sending provider email with params:', JSON.stringify(templateParams, null, 2))

    try {
        const response = await sendEmailJS(PROVIDER_TEMPLATE_ID, templateParams)
        if (response.status === 200) {
            console.log('✅ [SERVER] Provider notification sent successfully')
        } else {
            console.error('❌ [SERVER] EmailJS error:', response.status, response.text)
        }
    } catch (error) {
        console.error('❌ [SERVER] Failed to send provider notification:', error)
    }
}

export const sendBookerNotificationServer = async (
    booking: Booking,
    status: 'confirmed' | 'rejected',
    bookerEmail: string
): Promise<void> => {
    console.log('📧 [SERVER] sendBookerNotification called')
    console.log('  - Status:', status)
    console.log('  - Booker email:', bookerEmail)
    console.log('  - SERVICE_ID exists:', !!SERVICE_ID)
    console.log('  - BOOKER_TEMPLATE_ID exists:', !!BOOKER_TEMPLATE_ID)
    console.log('  - PUBLIC_KEY exists:', !!PUBLIC_KEY)
    console.log('  - PRIVATE_KEY exists:', !!PRIVATE_KEY)

    if (!SERVICE_ID || !BOOKER_TEMPLATE_ID || !PUBLIC_KEY || !PRIVATE_KEY) {
        console.warn('❌ [SERVER] EmailJS credentials missing, skipping booker email.')
        console.warn('  Missing:',
            !SERVICE_ID ? 'SERVICE_ID' : '',
            !BOOKER_TEMPLATE_ID ? 'BOOKER_TEMPLATE_ID' : '',
            !PUBLIC_KEY ? 'PUBLIC_KEY' : '',
            !PRIVATE_KEY ? 'PRIVATE_KEY' : ''
        )
        return
    }

    if (!bookerEmail || !bookerEmail.includes('@')) {
        console.warn('❌ [SERVER] Invalid booker email address, skipping email:', bookerEmail)
        return
    }

    const date = format(booking.startUTC, 'MMMM do, yyyy')
    const time = format(booking.startUTC, 'h:mm a')

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
        // Support both variable names for template compatibility
        customer_message: message,
        status_message: message,
        meeting_link: status === 'confirmed' ? (booking.meetingLink || '') : '',
        app_name: 'BookIt'
    }

    console.log('📧 [SERVER] Sending booker email with params:', JSON.stringify(templateParams, null, 2))

    try {
        const response = await sendEmailJS(BOOKER_TEMPLATE_ID, templateParams)
        if (response.status === 200) {
            console.log('✅ [SERVER] Booker notification sent successfully')
        } else {
            console.error('❌ [SERVER] EmailJS error:', response.status, response.text)
        }
    } catch (error) {
        console.error('❌ [SERVER] Failed to send booker notification:', error)
    }
}

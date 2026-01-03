import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { bookingDoc, setDoc, userDoc, getDoc } from '@/lib/firestore'
import { sendProviderNotification } from '@/lib/email'
import type { Booking } from '@/types'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(req: Request) {
    const body = await req.text()
    const sig = (await headers()).get('stripe-signature') as string

    let event

    try {
        if (!webhookSecret) {
            throw new Error('STRIPE_WEBHOOK_SECRET is missing')
        }
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } catch (err: unknown) {
        const message = (err as Error).message
        console.error(`Webhook Error: ${message}`)
        return new NextResponse(`Webhook Error: ${message}`, { status: 400 })
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as { metadata: Record<string, string>, payment_intent: string }
        const metadata = session.metadata

        if (metadata) {
            try {
                const bookingId = `${metadata.providerId}_${metadata.bookerId}_${Date.now()}`

                const bookingData: Booking = {
                    id: bookingId,
                    providerId: metadata.providerId,
                    providerName: metadata.providerName,
                    bookerId: metadata.bookerId,
                    bookerName: metadata.bookerName,
                    bookerEmail: metadata.bookerEmail,
                    startUTC: new Date(metadata.startUTC),
                    endUTC: new Date(metadata.endUTC),
                    status: 'pending',
                    sessionMinutes: parseInt(metadata.sessionMinutes || '60'),
                    notes: metadata.notes || undefined,
                    paymentIntentId: session.payment_intent as string,
                    priceAtBooking: parseFloat(metadata.price || '0'),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }

                // Save to Firestore
                await setDoc(bookingDoc(bookingId), bookingData)

                // Send email notification to provider
                const providerSnap = await getDoc(userDoc(metadata.providerId))
                if (providerSnap.exists()) {
                    const providerData = providerSnap.data()
                    if (providerData.email && providerData.notificationSettings?.email?.newBookingRequest) {
                        await sendProviderNotification(bookingData, providerData.email)
                    }
                }
            } catch (error) {
                console.error('Error processing checkout session:', error)
            }
        }
    }

    return new NextResponse('Success', { status: 200 })
}

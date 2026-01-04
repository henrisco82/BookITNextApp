import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { adminDb } from '@/lib/firebase-admin'
import { sendProviderNotification } from '@/lib/email'
import type { Booking } from '@/types'

interface StripeUser {
    email: string
    notificationSettings?: {
        email?: {
            newBookingRequest?: boolean
        }
    }
}

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
        const session = event.data.object as any
        
        // FIXED: Try to get metadata from session first, then from payment intent
        let metadata = session.metadata

        // If session metadata is empty, fetch the payment intent to get its metadata
        if (!metadata || Object.keys(metadata).length === 0) {
            console.log('Session metadata empty, fetching payment intent...')
            try {
                const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string)
                metadata = paymentIntent.metadata
                console.log('Retrieved metadata from payment intent:', metadata)
            } catch (error) {
                console.error('Error fetching payment intent:', error)
            }
        }

        if (metadata && metadata.providerId && metadata.bookerId) {
            console.log('Webhook metadata received:', metadata)
            try {
                if (!adminDb) {
                    console.error('Webhook Error: adminDb is null. Check credentials.')
                    throw new Error('Admin DB not initialized')
                }

                const bookingId = `${metadata.providerId}_${metadata.bookerId}_${Date.now()}`
                console.log('Generating booking document:', bookingId)

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

                // Save to Firestore using Admin SDK
                await adminDb.collection('bookings').doc(bookingId).set(bookingData)
                console.log('✅ Booking created successfully:', bookingId)

                // Send email notification to provider using Admin SDK for user fetch
                const providerSnap = await adminDb.collection('users').doc(metadata.providerId).get()
                if (providerSnap.exists) {
                    const providerData = providerSnap.data() as StripeUser
                    if (providerData.email && providerData.notificationSettings?.email?.newBookingRequest) {
                        await sendProviderNotification(bookingData, providerData.email)
                    }
                }
            } catch (error) {
                console.error('Error processing checkout session:', error)
                return new NextResponse('Error processing booking', { status: 500 })
            }
        } else {
            console.error('Missing required metadata in webhook:', metadata)
            return new NextResponse('Missing metadata', { status: 400 })
        }
    } else if (event.type === 'account.updated') {
        const account = event.data.object as { id: string, details_submitted: boolean }
        console.log(`Stripe Account Updated: ${account.id}, details_submitted: ${account.details_submitted}`)

        try {
            if (!adminDb) throw new Error('Admin DB not initialized')

            // Find the user with this stripeAccountId using Admin SDK
            const querySnapshot = await adminDb.collection('users')
                .where('stripeAccountId', '==', account.id)
                .get()

            if (!querySnapshot.empty) {
                const userDocSnap = querySnapshot.docs[0]
                const userId = userDocSnap.id

                const accountObj = event.data.object as { id: string, details_submitted: boolean, payouts_enabled: boolean }
                if (accountObj.details_submitted && accountObj.payouts_enabled) {
                    await userDocSnap.ref.update({
                        onboardingComplete: true,
                        updatedAt: new Date()
                    })
                    console.log(`Updated onboardingComplete for user: ${userId}`)
                } else if (accountObj.details_submitted) {
                    console.log(`Stripe account ${account.id} submitted details but payouts not yet enabled`)
                }
            } else {
                console.warn(`No user found for Stripe account: ${account.id}`)
            }
        } catch (error) {
            console.error('Error processing account update:', error)
        }
    }

    return new NextResponse('Success', { status: 200 })
}
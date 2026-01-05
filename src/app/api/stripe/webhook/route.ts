import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { adminDb } from '@/lib/firebase-admin'
import { sendProviderNotification } from '@/lib/email'
import type { Booking } from '@/types'

export const runtime = 'nodejs'

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
    console.log('🎯 WEBHOOK HIT at:', new Date().toISOString())
    
    try {
        // Read the raw body as text
        const rawBody = await req.text()
        const signature = req.headers.get('stripe-signature')
        
        console.log('📦 Body length:', rawBody.length)
        console.log('🔑 Signature present:', !!signature)

        if (!signature) {
            console.error('❌ No signature found')
            return new NextResponse('No signature', { status: 400 })
        }

        if (!webhookSecret) {
            console.error('❌ STRIPE_WEBHOOK_SECRET is missing')
            return new NextResponse('Webhook secret not configured', { status: 500 })
        }

        // Construct event from raw body string
        let event
        try {
            event = stripe.webhooks.constructEvent(
                rawBody,
                signature,
                webhookSecret
            )
            console.log('✅ Webhook signature verified')
        } catch (err: unknown) {
            const message = (err as Error).message
            console.error(`❌ Webhook signature verification failed: ${message}`)
            return new NextResponse(`Webhook Error: ${message}`, { status: 400 })
        }

        // Handle the event
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as any
            
            console.log('=== CHECKOUT SESSION COMPLETED ===')
            console.log('Event type:', event.type)
            console.log('Session ID:', session.id)
            console.log('Payment Intent ID:', session.payment_intent)
            console.log('Session metadata:', JSON.stringify(session.metadata, null, 2))
            
            // Try to get metadata from session first, then from payment intent
            let metadata = session.metadata

            // If session metadata is empty, fetch the payment intent to get its metadata
            if (!metadata || Object.keys(metadata).length === 0) {
                console.log('⚠️ Session metadata empty, fetching payment intent...')
                try {
                    const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string)
                    metadata = paymentIntent.metadata
                    console.log('✓ Retrieved metadata from payment intent:', JSON.stringify(metadata, null, 2))
                } catch (error) {
                    console.error('❌ Error fetching payment intent:', error)
                }
            } else {
                console.log('✓ Using session metadata')
            }

            if (metadata && metadata.providerId && metadata.bookerId) {
                console.log('Processing booking with metadata:', metadata)
                try {
                    if (!adminDb) {
                        console.error('❌ adminDb is null. Check Firebase Admin credentials.')
                        return new NextResponse('Database not initialized', { status: 500 })
                    }

                    const bookingId = `${metadata.providerId}_${metadata.bookerId}_${Date.now()}`
                    console.log('Creating booking document:', bookingId)

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
                    console.log('✅ Booking created successfully in Firestore:', bookingId)

                    // Send email notification to provider
                    try {
                        const providerSnap = await adminDb.collection('users').doc(metadata.providerId).get()
                        if (providerSnap.exists) {
                            const providerData = providerSnap.data() as StripeUser
                            if (providerData.email && providerData.notificationSettings?.email?.newBookingRequest) {
                                await sendProviderNotification(bookingData, providerData.email)
                                console.log('✅ Email notification sent to provider')
                            }
                        }
                    } catch (emailError) {
                        console.error('⚠️ Error sending email (non-critical):', emailError)
                        // Don't fail the webhook if email fails
                    }
                    
                    return new NextResponse(JSON.stringify({ received: true, bookingId }), { 
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    })
                } catch (error) {
                    console.error('❌ Error processing checkout session:', error)
                    return new NextResponse(`Error processing booking: ${error}`, { status: 500 })
                }
            } else {
                console.error('❌ Missing required metadata. Received:', metadata)
                return new NextResponse('Missing required metadata (providerId or bookerId)', { status: 400 })
            }
        } else if (event.type === 'account.updated') {
            const account = event.data.object as { id: string, details_submitted: boolean, payouts_enabled: boolean }
            console.log(`=== ACCOUNT UPDATED ===`)
            console.log(`Account ID: ${account.id}`)
            console.log(`Details submitted: ${account.details_submitted}`)
            console.log(`Payouts enabled: ${account.payouts_enabled}`)

            try {
                if (!adminDb) {
                    console.error('❌ adminDb is null')
                    return new NextResponse('Database not initialized', { status: 500 })
                }

                // Find the user with this stripeAccountId
                const querySnapshot = await adminDb.collection('users')
                    .where('stripeAccountId', '==', account.id)
                    .get()

                if (!querySnapshot.empty) {
                    const userDocSnap = querySnapshot.docs[0]
                    const userId = userDocSnap.id

                    if (account.details_submitted && account.payouts_enabled) {
                        await userDocSnap.ref.update({
                            onboardingComplete: true,
                            updatedAt: new Date()
                        })
                        console.log(`✅ Updated onboardingComplete=true for user: ${userId}`)
                    } else if (account.details_submitted) {
                        console.log(`⚠️ Account ${account.id} submitted details but payouts not yet enabled`)
                    }
                } else {
                    console.warn(`⚠️ No user found for Stripe account: ${account.id}`)
                }

                return new NextResponse(JSON.stringify({ received: true }), { 
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                })
            } catch (error) {
                console.error('❌ Error processing account update:', error)
                return new NextResponse(`Error processing account update: ${error}`, { status: 500 })
            }
        }

        // For any other event types
        console.log(`ℹ️ Unhandled event type: ${event.type}`)
        return new NextResponse(JSON.stringify({ received: true }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        })

    } catch (error) {
        console.error('❌ Webhook error:', error)
        return new NextResponse(`Webhook error: ${error}`, { status: 500 })
    }
}
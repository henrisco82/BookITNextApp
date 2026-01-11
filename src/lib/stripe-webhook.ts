import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import * as admin from 'firebase-admin'

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia' as Stripe.StripeConfig['apiVersion'],
})

// Webhook signing secret
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Firebase Admin initialization
const firebaseAdminConfig = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
}

function getAdminDb(): admin.firestore.Firestore {
    if (!admin.apps.length) {
        if (firebaseAdminConfig.projectId && firebaseAdminConfig.clientEmail && firebaseAdminConfig.privateKey) {
            const app = admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: firebaseAdminConfig.projectId,
                    clientEmail: firebaseAdminConfig.clientEmail,
                    privateKey: firebaseAdminConfig.privateKey,
                }),
            })
            return app.firestore()
        } else {
            console.warn('Firebase Admin credentials missing')
            // Don't throw here to allow building without env vars
            return admin.firestore()
        }
    }
    return admin.firestore()
}

export async function handleStripeWebhook(request: NextRequest) {
    console.log('🔔 Stripe webhook received!')

    let event: Stripe.Event

    try {
        // Get raw body for signature verification
        const arrayBuffer = await request.arrayBuffer()
        const rawBody = Buffer.from(arrayBuffer)
        const signature = request.headers.get('stripe-signature')

        console.log(`📦 Received payload size: ${rawBody.length} bytes`)
        console.log(`📝 Body preview: ${rawBody.toString('utf8').substring(0, 50)}...`) // debug body

        if (!signature) {
            console.error('❌ Missing stripe-signature header')
            return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
        }

        if (!webhookSecret) {
            console.error('❌ STRIPE_WEBHOOK_SECRET not configured')
            return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
        }

        // Debug logging
        console.log(`🔐 Verifying signature with secret (len=${webhookSecret.length}): ${webhookSecret.substring(0, 5)}...`)
        console.log(`🔑 Received signature (len=${signature.length}): ${signature.substring(0, 5)}...`)

        // Verify webhook signature
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
        console.log('✅ Webhook verified, event type:', event.type)

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        console.error('❌ Webhook signature verification failed:', errorMessage)
        return NextResponse.json({ error: `Webhook Error: ${errorMessage}` }, { status: 400 })
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session

        console.log('📦 Processing checkout.session.completed:', session.id)

        // Extract metadata from the session
        const metadata = session.metadata
        if (!metadata) {
            console.error('❌ No metadata found in session')
            return NextResponse.json({ error: 'No metadata in session' }, { status: 400 })
        }

        const {
            bookerId,
            bookerName,
            bookerEmail,
            providerId,
            providerName,
            startUTC,
            endUTC,
            notes,
            price,
            sessionMinutes,
        } = metadata

        // Validate required fields
        if (!bookerId || !providerId || !startUTC || !endUTC) {
            console.error('❌ Missing required metadata fields')
            return NextResponse.json({ error: 'Missing required metadata fields' }, { status: 400 })
        }

        try {
            const db = getAdminDb()
            const now = new Date()

            // Create booking document
            const bookingData = {
                providerId,
                providerName: providerName || '',
                bookerId,
                bookerName: bookerName || '',
                bookerEmail: bookerEmail || '',
                startUTC: new Date(startUTC),
                endUTC: new Date(endUTC),
                status: 'confirmed', // Paid bookings are automatically confirmed
                sessionMinutes: parseInt(sessionMinutes || '60', 10),
                notes: notes || null,
                priceAtBooking: parseFloat(price || '0'),
                paymentIntentId: session.payment_intent as string || null,
                stripeSessionId: session.id,
                createdAt: now,
                updatedAt: now,
            }

            console.log('📝 Creating booking:', bookingData.providerId)

            const bookingRef = await db.collection('bookings').add(bookingData)
            console.log('✅ Booking created successfully with ID:', bookingRef.id)

            return NextResponse.json({
                received: true,
                bookingId: bookingRef.id,
                message: 'Booking created successfully'
            })

        } catch (dbError) {
            const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error'
            console.error('❌ Failed to create booking in Firestore:', errorMessage)
            return NextResponse.json({ error: `Database Error: ${errorMessage}` }, { status: 500 })
        }
    }

    console.log('ℹ️ Unhandled event type:', event.type)
    return NextResponse.json({ received: true, message: `Event type ${event.type} acknowledged` })
}

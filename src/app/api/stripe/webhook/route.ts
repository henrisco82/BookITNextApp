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

interface BookingMetadata {
  bookerId: string
  bookerName: string
  bookerEmail: string
  providerId: string
  providerName: string
  providerEmail?: string
  startUTC: string
  endUTC: string
  notes: string
  price: string
  sessionMinutes: string
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(req: Request) {
  console.log('🎯 WEBHOOK HIT at:', new Date().toISOString())

  try {
    // Read raw body
    const rawBody = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      console.error('❌ No Stripe signature')
      return new NextResponse('No signature', { status: 400 })
    }
    if (!webhookSecret) {
      console.error('❌ STRIPE_WEBHOOK_SECRET missing')
      return new NextResponse('Webhook secret not configured', { status: 500 })
    }

    // Verify webhook signature
    let event
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
      console.log('✅ Stripe signature verified')
    } catch (err: unknown) {
      console.error('❌ Webhook signature verification failed', err)
      return new NextResponse(`Webhook Error: ${(err as Error).message}`, { status: 400 })
    }

    // Handle events
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any
      let metadata: BookingMetadata | null = null

      // Try fetching payment intent metadata (more reliable)
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent)
        metadata = paymentIntent.metadata as unknown as BookingMetadata
      } catch {
        metadata = session.metadata as unknown as BookingMetadata
      }

      if (!metadata?.providerId || !metadata?.bookerId) {
        console.error('❌ Missing providerId or bookerId in metadata', metadata)
        return new NextResponse('Missing required metadata', { status: 400 })
      }

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
      if (!adminDb) {
        console.error('❌ Firebase Admin not initialized')
        return new NextResponse('Database not initialized', { status: 500 })
      }
      await adminDb.collection('bookings').doc(bookingId).set(bookingData)
      console.log('✅ Booking saved:', bookingId)

      // Send email notification to provider
      try {
        const providerSnap = await adminDb.collection('users').doc(metadata.providerId).get()
        if (providerSnap.exists) {
          const providerData = providerSnap.data() as StripeUser
          if (providerData.email && providerData.notificationSettings?.email?.newBookingRequest) {
            await sendProviderNotification(bookingData, providerData.email)
            console.log('✅ Provider notified via email')
          }
        }
      } catch (emailErr) {
        console.warn('⚠️ Failed to send email, but booking still created:', emailErr)
      }

      return new NextResponse(JSON.stringify({ received: true, bookingId }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    else if (event.type === 'account.updated') {
      const account = event.data.object as {
        id: string
        details_submitted: boolean
        payouts_enabled: boolean
      }
      console.log('=== ACCOUNT UPDATED ===', account.id)

      try {
        if (!adminDb) throw new Error('Firebase Admin not initialized')

        const querySnap = await adminDb.collection('users')
          .where('stripeAccountId', '==', account.id)
          .get()

        if (!querySnap.empty) {
          const userDoc = querySnap.docs[0]
          if (account.details_submitted && account.payouts_enabled) {
            await userDoc.ref.update({ onboardingComplete: true, updatedAt: new Date() })
            console.log('✅ User onboardingComplete updated:', userDoc.id)
          } else {
            console.log(`⚠️ Account ${account.id} submitted details but payouts not enabled`)
          }
        } else {
          console.warn(`⚠️ No user found for Stripe account: ${account.id}`)
        }

        return new NextResponse(JSON.stringify({ received: true }), { status: 200 })
      } catch (err) {
        console.error('❌ Error processing account.updated:', err)
        return new NextResponse(`Error: ${err}`, { status: 500 })
      }
    }

    console.log(`ℹ️ Unhandled event type: ${event.type}`)
    return new NextResponse(JSON.stringify({ received: true }), { status: 200 })

  } catch (err) {
    console.error('❌ Webhook error:', err)
    return new NextResponse(`Webhook error: ${err}`, { status: 500 })
  }
}

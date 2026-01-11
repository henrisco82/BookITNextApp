import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

const db = getFirestore()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as Stripe.StripeConfig['apiVersion'],
  typescript: true,
})

interface BookingMetadata {
  bookerId: string
  bookerName: string
  bookerEmail: string
  providerId: string
  providerName: string
  startUTC: string
  endUTC: string
  notes: string
  price: string
  sessionMinutes: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sig = req.headers['stripe-signature'] as string
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig) {
    return res.status(400).json({ error: 'No signature' })
  }

  if (!webhookSecret) {
    return res.status(500).json({ error: 'No webhook secret' })
  }

  let event: Stripe.Event

  try {
    // req.body is already a buffer in Vercel functions
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    console.log('✅ Signature verified')
  } catch (err: any) {
    console.error('❌ Signature verification failed:', err.message)
    return res.status(400).json({ error: err.message })
  }

  // Handle checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        session.payment_intent as string
      )
      const metadata = paymentIntent.metadata as unknown as BookingMetadata

      if (!metadata?.providerId || !metadata?.bookerId) {
        return res.status(400).json({ error: 'Missing metadata' })
      }

      const bookingId = `${metadata.providerId}_${metadata.bookerId}_${Date.now()}`

      const bookingData = {
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

      await db.collection('bookings').doc(bookingId).set(bookingData)
      console.log('✅ Booking created:', bookingId)

      // Optional: Send email notification
      // You can add your email logic here

      return res.status(200).json({ received: true, bookingId })
    } catch (error) {
      console.error('Error processing booking:', error)
      return res.status(500).json({ error: 'Internal error' })
    }
  }

  // Handle account.updated
  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account

    try {
      const snap = await db
        .collection('users')
        .where('stripeAccountId', '==', account.id)
        .get()

      if (!snap.empty && account.details_submitted && account.payouts_enabled) {
        await snap.docs[0].ref.update({
          onboardingComplete: true,
          updatedAt: new Date(),
        })
        console.log('✅ Updated user onboarding')
      }

      return res.status(200).json({ received: true })
    } catch (error) {
      console.error('Error updating account:', error)
      return res.status(500).json({ error: 'Internal error' })
    }
  }

  return res.status(200).json({ received: true })
}
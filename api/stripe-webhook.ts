import type { VercelRequest, VercelResponse } from '@vercel/node'
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

let adminDb: admin.firestore.Firestore | null = null

function getAdminDb(): admin.firestore.Firestore {
  if (adminDb) return adminDb

  if (!admin.apps.length) {
    if (firebaseAdminConfig.projectId && firebaseAdminConfig.clientEmail && firebaseAdminConfig.privateKey) {
      const app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: firebaseAdminConfig.projectId,
          clientEmail: firebaseAdminConfig.clientEmail,
          privateKey: firebaseAdminConfig.privateKey,
        }),
      })
      adminDb = app.firestore()
    } else {
      throw new Error('Firebase Admin credentials missing')
    }
  } else {
    adminDb = admin.firestore()
  }

  return adminDb
}

// Buffer helper to get raw body
async function getRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  console.log('Stripe webhook received')

  let event: Stripe.Event

  try {
    // Get raw body for signature verification
    const rawBody = await getRawBody(req)
    const signature = req.headers['stripe-signature'] as string

    if (!signature) {
      console.error('Missing stripe-signature header')
      return res.status(400).json({ error: 'Missing signature' })
    }

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured')
      return res.status(500).json({ error: 'Webhook secret not configured' })
    }

    // Verify webhook signature
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
    console.log('Webhook verified, event type:', event.type)

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('Webhook signature verification failed:', errorMessage)
    return res.status(400).json({ error: `Webhook Error: ${errorMessage}` })
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    console.log('Processing checkout.session.completed:', session.id)
    console.log('Session metadata:', session.metadata)

    // Extract metadata from the session
    const metadata = session.metadata
    if (!metadata) {
      console.error('No metadata found in session')
      return res.status(400).json({ error: 'No metadata in session' })
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
      console.error('Missing required metadata fields:', { bookerId, providerId, startUTC, endUTC })
      return res.status(400).json({ error: 'Missing required metadata fields' })
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

      console.log('Creating booking with data:', bookingData)

      const bookingRef = await db.collection('bookings').add(bookingData)
      console.log('Booking created successfully with ID:', bookingRef.id)

      return res.status(200).json({
        received: true,
        bookingId: bookingRef.id,
        message: 'Booking created successfully'
      })

    } catch (dbError) {
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error'
      console.error('Failed to create booking in Firestore:', errorMessage)
      // Return 500 so Stripe will retry
      return res.status(500).json({ error: `Database Error: ${errorMessage}` })
    }
  }

  // Handle other event types if needed
  console.log('Unhandled event type:', event.type)
  return res.status(200).json({ received: true, message: `Event type ${event.type} acknowledged` })
}

// Disable body parsing - we need raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
}
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { adminUserDoc } from '@/lib/firebase-admin'

interface StripeUser {
    email: string
    displayName: string
    stripeAccountId?: string
    defaultSessionMinutes?: number | string
}

export async function POST(request: Request) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { providerId, startUTC, endUTC, notes, price } = await request.json()

        if (!providerId || !startUTC || !endUTC || !price) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Get origin for redirect URLs
        const { origin } = new URL(request.url)

        // Get user from Firestore using Admin SDK
        const userRef = adminUserDoc(userId)
        const userSnap = await userRef.get()
        if (!userSnap.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }
        const userData = userSnap.data() as StripeUser

        // Get provider's Stripe account ID using Admin SDK
        const providerRef = adminUserDoc(providerId)
        const providerSnap = await providerRef.get()
        if (!providerSnap.exists) {
            return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
        }

        const providerData = providerSnap.data() as StripeUser
        const stripeAccountId = providerData.stripeAccountId

        if (!stripeAccountId) {
            return NextResponse.json({ error: 'Provider has not connected Stripe' }, { status: 400 })
        }

        // Verify Stripe account status in real-time
        const account = await stripe.accounts.retrieve(stripeAccountId)
        if (!account.payouts_enabled) {
            // If we found they aren't ready, update their status in Firestore
            // so they see the warning on their dashboard
            await providerRef.update({
                onboardingComplete: false,
                updatedAt: new Date()
            })

            return NextResponse.json({
                error: 'Provider\'s Stripe account is not yet ready to receive payments. Their account setup may be pending verification.'
            }, { status: 400 })
        }

        // Calculate application fee (1% = 0.01)
        const amountInCents = Math.round(price * 100)
        const applicationFeeInCents = Math.max(Math.round(amountInCents * 0.01), 1)

        console.log('Creating Stripe Session with metadata:', {
            providerId,
            bookerId: userId,
            startUTC,
            price
        })

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: `Session with ${providerData.displayName}`,
                            description: `${new Date(startUTC).toLocaleString()} session`,
                        },
                        unit_amount: amountInCents,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${origin}/book/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/book/${providerId}`,
            payment_intent_data: {
                application_fee_amount: applicationFeeInCents,
                transfer_data: {
                    destination: stripeAccountId,
                },
                metadata: {
                    bookerId: userId,
                    bookerName: userData.displayName || '',
                    bookerEmail: userData.email || '',
                    providerId,
                    providerName: providerData.displayName || '',
                    providerEmail: providerData.email || '',
                    startUTC,
                    endUTC,
                    notes: notes || '',
                    price: price.toString(),
                    sessionMinutes: providerData.defaultSessionMinutes?.toString() || '60',
                },
            },
            metadata: {
                bookerId: userId,
                bookerName: userData.displayName || '',
                bookerEmail: userData.email || '',
                providerId,
                providerName: providerData.displayName || '',
                providerEmail: providerData.email || '',
                startUTC,
                endUTC,
                notes: notes || '',
                price: price.toString(),
                sessionMinutes: providerData.defaultSessionMinutes?.toString() || '60',
            },
        })

        return NextResponse.json({ url: session.url })
    } catch (error: unknown) {
        console.error('Stripe Checkout Error:', error)
        return NextResponse.json({ error: (error as Error).message || 'Internal Server Error' }, { status: 500 })
    }
}

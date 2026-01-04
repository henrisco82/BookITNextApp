import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { userDoc, getDoc } from '@/lib/firestore'

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

        // Get user from Firestore
        const userSnap = await getDoc(userDoc(userId))
        if (!userSnap.exists()) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }
        const userData = userSnap.data()

        // Get provider's Stripe account ID
        const providerSnap = await getDoc(userDoc(providerId))
        if (!providerSnap.exists()) {
            return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
        }

        const providerData = providerSnap.data()
        const stripeAccountId = providerData.stripeAccountId

        if (!stripeAccountId) {
            return NextResponse.json({ error: 'Provider has not connected Stripe' }, { status: 400 })
        }

        // Calculate application fee (1% = 0.01)
        const amountInCents = Math.round(price * 100)
        const applicationFeeInCents = Math.max(Math.round(amountInCents * 0.01), 1)

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

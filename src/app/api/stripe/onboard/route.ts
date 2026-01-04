import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { userDoc, getDoc, updateDoc } from '@/lib/firestore'

export async function POST(request: Request) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get origin for redirect URLs
        const { origin } = new URL(request.url)

        // Get user from Firestore to check for existing stripeAccountId
        const userSnap = await getDoc(userDoc(userId))
        if (!userSnap.exists()) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const userData = userSnap.data()
        let stripeAccountId = userData.stripeAccountId

        // Create a Stripe account if one doesn't exist
        if (!stripeAccountId) {
            const account = await stripe.accounts.create({
                type: 'express',
                email: userData.email,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
            })
            stripeAccountId = account.id

            // Save the stripeAccountId to Firestore
            await updateDoc(userDoc(userId), {
                stripeAccountId,
            })
        }

        // Create an account link
        const accountLink = await stripe.accountLinks.create({
            account: stripeAccountId,
            refresh_url: `${origin}/api/stripe/refresh?accountId=${stripeAccountId}`,
            return_url: `${origin}/api/stripe/return?accountId=${stripeAccountId}`,
            type: 'account_onboarding',
        })

        return NextResponse.json({ url: accountLink.url })
    } catch (error: unknown) {
        console.error('Stripe Onboarding Error:', error)
        return NextResponse.json({ error: (error as Error).message || 'Internal Server Error' }, { status: 500 })
    }
}

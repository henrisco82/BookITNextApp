import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { userDoc, updateDoc } from '@/lib/firestore'

export async function GET(request: Request) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const accountId = searchParams.get('accountId')

        if (!accountId) {
            return new NextResponse('Account ID missing', { status: 400 })
        }

        // Retrieve the account from Stripe to check status
        const account = await stripe.accounts.retrieve(accountId)

        console.log('Stripe Return Debug:', {
            id: account.id,
            details_submitted: account.details_submitted,
            payouts_enabled: account.payouts_enabled,
            charges_enabled: account.charges_enabled
        })

        if (account.details_submitted) {
            // Update Firestore
            await updateDoc(userDoc(userId), {
                onboardingComplete: true,
                updatedAt: new Date()
            })
            console.log('Successfully updated onboardingComplete in Firestore')
        } else {
            console.warn('User returned from Stripe but details_submitted is false')
        }

        // Redirect back to provider dashboard
        const { origin } = new URL(request.url)
        return NextResponse.redirect(`${origin}/provider`)
    } catch (error: unknown) {
        console.error('Stripe Return Error:', error)
        return new NextResponse((error as Error).message || 'Internal Server Error', { status: 500 })
    }
}

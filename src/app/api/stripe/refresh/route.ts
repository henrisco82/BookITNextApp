import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function GET(request: Request) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const accountId = searchParams.get('accountId')

        if (!accountId) {
            return NextResponse.json({ error: 'Account ID missing' }, { status: 400 })
        }

        const { origin } = new URL(request.url)

        // Re-create an account link
        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: `${origin}/api/stripe/refresh?accountId=${accountId}`,
            return_url: `${origin}/api/stripe/return?accountId=${accountId}`,
            type: 'account_onboarding',
        })

        return NextResponse.redirect(accountLink.url)
    } catch (error: unknown) {
        console.error('Stripe Refresh Error:', error)
        return NextResponse.json({ error: (error as Error).message || 'Internal Server Error' }, { status: 500 })
    }
}

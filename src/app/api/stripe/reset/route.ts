import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { adminUserDoc } from '@/lib/firebase-admin'

export const runtime = 'nodejs'

// POST: Reset Stripe connection for current user (use when switching platform accounts)
export async function POST() {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userRef = adminUserDoc(userId)
        const userSnap = await userRef.get()

        if (!userSnap.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Reset Stripe fields so user can re-onboard with new platform
        await userRef.update({
            stripeAccountId: null,
            onboardingComplete: false,
            updatedAt: new Date()
        })

        return NextResponse.json({
            success: true,
            message: 'Stripe connection reset. Please reconnect your Stripe account from the provider dashboard.',
        })
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }
}

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { adminDb } from '@/lib/firebase-admin'

export const runtime = 'nodejs'

/**
 * Refund types:
 * - 'full': Provider declines booking -> booker gets full refund, platform loses fees
 * - 'partial': Booker cancels booking -> booker gets refund minus platform fee, platform keeps 1%
 */
export async function POST(request: Request) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!adminDb) {
            return NextResponse.json({ error: 'Database not initialized' }, { status: 500 })
        }

        const { bookingId, type = 'full' } = await request.json()

        if (!bookingId) {
            return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
        }

        if (!['full', 'partial'].includes(type)) {
            return NextResponse.json({ error: 'Invalid refund type' }, { status: 400 })
        }

        // Get the booking from Firestore
        const bookingSnap = await adminDb.collection('bookings').doc(bookingId).get()

        if (!bookingSnap.exists) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
        }

        const booking = bookingSnap.data()

        // Authorization check based on refund type
        if (type === 'full') {
            // Only provider can issue full refund (when declining)
            if (booking?.providerId !== userId) {
                return NextResponse.json({ error: 'Not authorized to issue full refund' }, { status: 403 })
            }
        } else {
            // Only booker can issue partial refund (when cancelling)
            if (booking?.bookerId !== userId) {
                return NextResponse.json({ error: 'Not authorized to cancel this booking' }, { status: 403 })
            }
        }

        // Check if booking has a payment intent
        if (!booking?.paymentIntentId) {
            return NextResponse.json({ error: 'No payment found for this booking' }, { status: 400 })
        }

        // Check if already refunded
        if (booking?.refundId) {
            return NextResponse.json({ error: 'Booking has already been refunded' }, { status: 400 })
        }

        let refund

        if (type === 'full') {
            // Full refund: booker gets everything back, platform absorbs Stripe fees
            // refund_application_fee: true -> refunds the platform's 1% fee as well
            // reverse_transfer: true -> reverses the transfer to the connected account
            refund = await stripe.refunds.create({
                payment_intent: booking.paymentIntentId,
                refund_application_fee: true,
                reverse_transfer: true,
            })
        } else {
            // Partial refund: platform keeps 1% fee, Stripe keeps their fees
            // refund_application_fee: false -> platform keeps the 1% application fee
            // reverse_transfer: true -> reverses the transfer to the connected account
            refund = await stripe.refunds.create({
                payment_intent: booking.paymentIntentId,
                refund_application_fee: false,
                reverse_transfer: true,
            })
        }

        console.log('Refund created:', {
            refundId: refund.id,
            bookingId,
            type,
            amount: refund.amount,
            status: refund.status,
        })

        // Update booking with refund info
        await adminDb.collection('bookings').doc(bookingId).update({
            refundId: refund.id,
            refundAmount: refund.amount,
            refundStatus: refund.status,
            refundType: type,
            refundedAt: new Date(),
            updatedAt: new Date(),
        })

        return NextResponse.json({
            success: true,
            refundId: refund.id,
            type,
            amount: refund.amount / 100, // Convert cents to euros
            status: refund.status,
        })

    } catch (error: unknown) {
        console.error('Refund Error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to process refund'
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}

import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: bookingId } = await params
        const bookingSnap = await adminDb.collection('bookings').doc(bookingId).get()

        if (!bookingSnap.exists) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
        }

        return NextResponse.json({ booking: bookingSnap.data() })
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }
}

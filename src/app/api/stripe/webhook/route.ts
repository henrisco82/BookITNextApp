import { NextRequest, NextResponse } from 'next/server'
import { handleStripeWebhook } from '@/lib/stripe-webhook'

export async function POST(request: NextRequest) {
    return handleStripeWebhook(request)
}

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        message: 'Stripe webhook endpoint is active (stripe/webhook)',
        timestamp: new Date().toISOString()
    })
}

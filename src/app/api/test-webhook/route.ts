import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function POST(req: Request) {
    try {
        const { eventType, testData } = await req.json()

        if (!eventType) {
            return NextResponse.json({ error: 'eventType is required' }, { status: 400 })
        }

        // Simulate different webhook events based on eventType
        let mockEvent: any = null

        switch (eventType) {
            case 'checkout.session.completed':
                // Create a mock checkout session completed event
                mockEvent = {
                    id: `cs_test_${Date.now()}`,
                    object: 'checkout.session',
                    payment_status: 'paid',
                    payment_intent: `pi_test_${Date.now()}`,
                    metadata: testData?.metadata || {
                        bookerId: 'test-booker-id',
                        bookerName: 'Test Booker',
                        bookerEmail: 'test@example.com',
                        providerId: 'test-provider-id',
                        providerName: 'Test Provider',
                        providerEmail: 'provider@example.com',
                        startUTC: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
                        endUTC: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
                        notes: 'Test booking notes',
                        price: '50.00',
                        sessionMinutes: '60'
                    }
                }
                break

            case 'payment_intent.succeeded':
                // Create a mock payment intent succeeded event
                mockEvent = {
                    id: `pi_test_${Date.now()}`,
                    object: 'payment_intent',
                    status: 'succeeded',
                    metadata: testData?.metadata || {
                        bookerId: 'test-booker-id',
                        bookerName: 'Test Booker',
                        bookerEmail: 'test@example.com',
                        providerId: 'test-provider-id',
                        providerName: 'Test Provider',
                        providerEmail: 'provider@example.com',
                        startUTC: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                        endUTC: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
                        notes: 'Test booking notes',
                        price: '50.00',
                        sessionMinutes: '60'
                    }
                }
                break

            case 'account.updated':
                // Create a mock account updated event
                mockEvent = {
                    id: 'acct_test_provider',
                    object: 'account',
                    details_submitted: true,
                    payouts_enabled: true,
                    charges_enabled: true
                }
                break

            default:
                return NextResponse.json({ error: `Unsupported event type: ${eventType}` }, { status: 400 })
        }

        // Create the event object that matches Stripe's webhook format
        const event = {
            id: `evt_test_${Date.now()}`,
            object: 'event',
            type: eventType,
            data: {
                object: mockEvent
            },
            created: Math.floor(Date.now() / 1000),
            livemode: false,
            pending_webhooks: 1,
            request: {
                id: `req_test_${Date.now()}`,
                idempotency_key: null
            }
        }

        console.log(`🧪 TEST WEBHOOK: Triggering ${eventType}`)
        console.log('Test event data:', JSON.stringify(event, null, 2))

        // Forward the event to your actual webhook handler
        // This simulates what Stripe would send to your webhook endpoint
        const webhookResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/stripe/webhook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // In production, you'd need the actual Stripe signature
                'stripe-signature': 'test-signature'
            },
            body: JSON.stringify(event)
        })

        const webhookResult = await webhookResponse.text()

        return NextResponse.json({
            success: true,
            eventType,
            eventId: event.id,
            webhookResponse: {
                status: webhookResponse.status,
                body: webhookResult
            },
            message: `Test webhook event "${eventType}" triggered successfully`
        })

    } catch (error) {
        console.error('Test webhook error:', error)
        return NextResponse.json({
            error: 'Failed to trigger test webhook',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
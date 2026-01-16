import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Test endpoint disabled in production' }, { status: 403 })
    }

    try {
        // Parse optional body for custom test data
        let customData = {}
        try {
            const body = await req.text()
            if (body) {
                customData = JSON.parse(body)
            }
        } catch {
            // Ignore parse errors, use defaults
        }

        // Create a test checkout.session.completed event
        const testEvent = {
            type: 'checkout.session.completed',
            data: {
                object: {
                    id: 'cs_test_' + Date.now(),
                    payment_intent: 'pi_test_' + Date.now(),
                    metadata: {
                        bookerId: (customData as any).bookerId || 'test-booker-123',
                        bookerName: (customData as any).bookerName || 'John Test',
                        bookerEmail: (customData as any).bookerEmail || 'john@test.com',
                        providerId: (customData as any).providerId || 'test-provider-456',
                        providerName: (customData as any).providerName || 'Jane Provider',
                        startUTC: (customData as any).startUTC || new Date(Date.now() + 86400000).toISOString(), // Tomorrow
                        endUTC: (customData as any).endUTC || new Date(Date.now() + 90000000).toISOString(), // Tomorrow + 1 hour
                        notes: (customData as any).notes || 'Test booking via webhook',
                        price: (customData as any).price || '75',
                        sessionMinutes: (customData as any).sessionMinutes || '60',
                    }
                }
            }
        }

        console.log('🧪 Sending test webhook event:', JSON.stringify(testEvent, null, 2))

        // Get the base URL
        const baseUrl = req.headers.get('host')?.includes('localhost')
            ? `http://${req.headers.get('host')}`
            : `https://${req.headers.get('host')}`

        // Call the actual webhook endpoint with test signature
        const webhookResponse = await fetch(`${baseUrl}/api/stripe/webhook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'stripe-signature': 'test-signature',
            },
            body: JSON.stringify(testEvent),
        })

        const responseText = await webhookResponse.text()
        let responseData
        try {
            responseData = JSON.parse(responseText)
        } catch {
            responseData = { raw: responseText }
        }

        console.log('🧪 Webhook response:', webhookResponse.status, responseData)

        return NextResponse.json({
            success: webhookResponse.ok,
            status: webhookResponse.status,
            response: responseData,
            testEvent: testEvent,
        })

    } catch (error) {
        console.error('❌ Test webhook error:', error)
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }
}

export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Test endpoint disabled in production' }, { status: 403 })
    }

    return NextResponse.json({
        message: 'Test webhook endpoint',
        usage: 'POST to this endpoint to trigger a test checkout.session.completed event',
        example: {
            method: 'POST',
            body: {
                bookerId: 'your-booker-id',
                providerId: 'your-provider-id',
                bookerName: 'Test User',
                bookerEmail: 'test@example.com',
                providerName: 'Test Provider',
                price: '100',
                sessionMinutes: '60',
            }
        }
    })
}

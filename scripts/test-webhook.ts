import Stripe from 'stripe'


const stripe = new Stripe('sk_test_mock', {
    apiVersion: '2024-12-18.acacia' as Stripe.StripeConfig['apiVersion'],
})

// This must match what we start the server with
const WEBHOOK_SECRET = 'whsec_test_secret'
const PORT = 3001
const URL = `http://localhost:${PORT}/api/stripe/webhook`

async function run() {
    console.log('🚀 Starting local webhook test...')

    const now = Math.floor(Date.now() / 1000)

    // Construct valid payload
    const payload = {
        id: 'evt_test_webhook',
        object: 'event',
        api_version: '2024-12-18.acacia',
        created: now,
        type: 'checkout.session.completed',
        data: {
            object: {
                id: 'cs_test_session',
                object: 'checkout.session',
                payment_intent: 'pi_test_123',
                metadata: {
                    bookerId: 'user_test_booker',
                    bookerName: 'Test Booker',
                    bookerEmail: 'booker@test.com',
                    providerId: 'user_test_provider',
                    providerName: 'Test Provider',
                    startUTC: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
                    endUTC: new Date(Date.now() + 86400000 + 3600000).toISOString(), // +1 hour
                    price: '50',
                    sessionMinutes: '60'
                }
            }
        }
    }

    const payloadString = JSON.stringify(payload)

    // Generate valid signature
    const signature = stripe.webhooks.generateTestHeaderString({
        payload: payloadString,
        secret: WEBHOOK_SECRET,
    })

    console.log(`📝 Payload created. Signature: ${signature.substring(0, 20)}...`)
    console.log(`POSTing to ${URL}...`)

    try {
        const response = await fetch(URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Stripe-Signature': signature,
            },
            body: payloadString,
        })

        const text = await response.text()
        console.log(`\nResponse Status: ${response.status}`)
        console.log(`Response Body: ${text}`)

        if (response.status === 200) {
            console.log('\n✅ TEST PASSED: Webhook verified and processed successfully!')
        } else {
            console.log('\n❌ TEST FAILED: Server returned error.')
        }

    } catch (error) {
        console.error('\n❌ Network error:', error)
    }
}

run()

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle, Zap, Loader2 } from 'lucide-react'

interface TestResult {
    success: boolean
    eventType: string
    eventId: string
    webhookResponse: {
        status: number
        body: string
    }
    message: string
    error?: string
    details?: string
}

export default function TestWebhookTrigger() {
    const [selectedEvent, setSelectedEvent] = useState<string>('checkout.session.completed')
    const [customData, setCustomData] = useState<string>('')
    const [isLoading, setIsLoading] = useState(false)
    const [result, setResult] = useState<TestResult | null>(null)

    const webhookEvents = [
        {
            value: 'checkout.session.completed',
            label: 'Checkout Session Completed',
            description: 'Triggered when a checkout session is successfully completed'
        },
        {
            value: 'payment_intent.succeeded',
            label: 'Payment Intent Succeeded',
            description: 'Triggered when a payment intent is successfully processed'
        },
        {
            value: 'account.updated',
            label: 'Account Updated',
            description: 'Triggered when a Stripe account is updated'
        }
    ]

    const handleTriggerWebhook = async () => {
        setIsLoading(true)
        setResult(null)

        try {
            let testData = null
            if (customData.trim()) {
                try {
                    testData = JSON.parse(customData)
                } catch (e) {
                    setResult({
                        success: false,
                        eventType: selectedEvent,
                        eventId: '',
                        webhookResponse: { status: 0, body: '' },
                        message: 'Invalid JSON in custom data',
                        error: 'Invalid JSON format'
                    })
                    setIsLoading(false)
                    return
                }
            }

            const response = await fetch('/api/test-webhook', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    eventType: selectedEvent,
                    testData
                })
            })

            const data = await response.json()

            if (response.ok) {
                setResult(data)
            } else {
                setResult({
                    success: false,
                    eventType: selectedEvent,
                    eventId: '',
                    webhookResponse: { status: response.status, body: JSON.stringify(data) },
                    message: data.error || 'Failed to trigger webhook',
                    error: data.error
                })
            }
        } catch (error) {
            setResult({
                success: false,
                eventType: selectedEvent,
                eventId: '',
                webhookResponse: { status: 0, body: '' },
                message: 'Network error occurred',
                error: error instanceof Error ? error.message : 'Unknown error'
            })
        } finally {
            setIsLoading(false)
        }
    }

    const sampleData = {
        'checkout.session.completed': `{
  "metadata": {
    "bookerId": "user_123",
    "bookerName": "John Doe",
    "bookerEmail": "john@example.com",
    "providerId": "provider_456",
    "providerName": "Jane Smith",
    "providerEmail": "jane@example.com",
    "startUTC": "${new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()}",
    "endUTC": "${new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString()}",
    "notes": "Test booking",
    "price": "50.00",
    "sessionMinutes": "60"
  }
}`
    }

    return (
        <Card className="border-2 border-orange-500/20 bg-orange-500/5">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                    <Zap className="h-5 w-5" />
                    Test Webhook Triggers
                </CardTitle>
                <CardDescription>
                    Trigger webhook events for testing purposes. Only use in development!
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label className="text-sm font-medium">Webhook Event Type</Label>
                    <select
                        value={selectedEvent}
                        onChange={(e) => setSelectedEvent(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    >
                        {webhookEvents.map((event) => (
                            <option key={event.value} value={event.value}>
                                {event.label}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                        {webhookEvents.find(e => e.value === selectedEvent)?.description}
                    </p>
                </div>

                <div>
                    <Label className="text-sm font-medium">Custom Test Data (JSON)</Label>
                    <textarea
                        value={customData}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomData(e.target.value)}
                        placeholder="Leave empty for default test data, or provide custom JSON..."
                        rows={8}
                        className="mt-1 font-mono text-xs w-full px-3 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                    />
                    <div className="flex gap-2 mt-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setCustomData(sampleData[selectedEvent as keyof typeof sampleData] || '')}
                        >
                            Load Sample Data
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setCustomData('')}
                        >
                            Clear
                        </Button>
                    </div>
                </div>

                <Button
                    onClick={handleTriggerWebhook}
                    disabled={isLoading}
                    className="w-full"
                    variant="default"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Triggering Webhook...
                        </>
                    ) : (
                        <>
                            <Zap className="h-4 w-4 mr-2" />
                            Trigger Test Webhook
                        </>
                    )}
                </Button>

                {result && (
                    <div className={`p-4 rounded-lg border ${result.success ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"}`}>
                        <div className="flex items-start gap-2">
                            {result.success ? (
                                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            ) : (
                                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                                <div className="font-medium mb-1">
                                    {result.success ? 'Success!' : 'Error'}
                                </div>
                                <div className="text-sm space-y-1">
                                    <div><strong>Event:</strong> {result.eventType}</div>
                                    <div><strong>Event ID:</strong> {result.eventId}</div>
                                    <div><strong>Webhook Response:</strong> HTTP {result.webhookResponse.status}</div>
                                    <div className="mt-2 p-2 bg-background rounded text-xs font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                                        {result.webhookResponse.body || result.error}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    <strong>⚠️ Development Only:</strong> This feature is for testing purposes only.
                    Webhook events will be processed with test data and may create actual database records.
                    Check your console/server logs for detailed webhook processing information.
                </div>
            </CardContent>
        </Card>
    )
}
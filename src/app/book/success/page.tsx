'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Calendar, ArrowRight } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function BookingSuccessPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <h1 className="text-xl font-semibold">Booking Confirmed</h1>
                        <ThemeToggle />
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 py-16">
                <Card className="border-2 text-center">
                    <CardHeader>
                        <div className="flex justify-center mb-4">
                            <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                                <CheckCircle className="h-10 w-10 text-green-500" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl">Payment Successful!</CardTitle>
                        <CardDescription>
                            Your session has been requested and is pending provider confirmation.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="p-4 rounded-lg bg-muted/50 text-sm text-left">
                            <p className="font-medium mb-1">What&apos;s next?</p>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                <li>The provider will review your request</li>
                                <li>You&apos;ll receive an email once they confirm</li>
                                <li>You can view your booking in your dashboard</li>
                            </ul>
                        </div>

                        <div className="flex flex-col gap-3">
                            <Link href="/my-bookings">
                                <Button className="w-full gap-2">
                                    <Calendar className="h-4 w-4" />
                                    View My Bookings
                                </Button>
                            </Link>
                            <Link href="/dashboard">
                                <Button variant="outline" className="w-full gap-2">
                                    Go to Dashboard
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

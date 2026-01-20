'use client'

// Main Dashboard - role-aware landing page with navigation
import { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrentUser, useIsProvider, useIsBooker } from '@/hooks/useCurrentUser'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ThemeToggle'
import {
    Mail,
    LogOut,
    Calendar,
    Clock,
    Users,
    Briefcase,
    ArrowRight,
    Globe,
    Settings
} from 'lucide-react'

export default function DashboardPage() {
    const { signOut } = useAuth()
    const { user: firestoreUser, isLoading, imageUrl, needsProfileSetup } = useCurrentUser()
    const isProvider = useIsProvider()
    const isBooker = useIsBooker()
    const router = useRouter()

    // Redirect to profile setup if user hasn't completed it
    useEffect(() => {
        if (!isLoading && needsProfileSetup) {
            router.replace('/profile-setup')
        }
    }, [isLoading, needsProfileSetup, router])

    const handleSignOut = async () => {
        await signOut()
        router.push('/')
    }

    // Get initials for avatar
    const getInitials = () => {
        if (firestoreUser?.displayName) {
            return firestoreUser.displayName
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)
        }
        return firestoreUser?.email?.[0]?.toUpperCase() || '?'
    }

    if (isLoading || needsProfileSetup) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
            {/* Header */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Calendar className="h-5 w-5 text-primary" />
                            </div>
                            <h1 className="text-xl font-semibold">BookIt</h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <ThemeToggle />
                            <Button
                                onClick={handleSignOut}
                                variant="ghost"
                                size="sm"
                                className="gap-2"
                            >
                                <LogOut className="h-4 w-4" />
                                Sign Out
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome Section */}
                <div className="mb-8">
                    <h2 className="text-3xl font-bold mb-2">
                        Welcome, {firestoreUser?.displayName?.split(' ')[0] || 'User'}! 👋
                    </h2>
                    <p className="text-muted-foreground">
                        {firestoreUser?.role === 'both'
                            ? 'Manage your availability or book sessions with other providers.'
                            : isProvider
                                ? 'Manage your availability and view your upcoming bookings.'
                                : 'Browse providers and manage your bookings.'
                        }
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {/* Profile Card */}
                    <Card className="border-2">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-4">
                                <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center border-4 border-background overflow-hidden relative">
                                    {imageUrl ? (
                                        <Image
                                            src={imageUrl}
                                            alt={firestoreUser?.displayName || 'User'}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <span className="text-xl font-semibold text-primary">
                                            {getInitials()}
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <CardTitle>{firestoreUser?.displayName}</CardTitle>
                                    <CardDescription className="flex items-center gap-1">
                                        <Mail className="h-3 w-3" />
                                        {firestoreUser?.email}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between p-2 rounded bg-muted/50">
                                    <span className="text-muted-foreground">Role</span>
                                    <span className="font-medium capitalize">{firestoreUser?.role}</span>
                                </div>
                                <div className="flex justify-between p-2 rounded bg-muted/50">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                        <Globe className="h-3 w-3" /> Timezone
                                    </span>
                                    <span className="font-medium text-xs">{firestoreUser?.timezone}</span>
                                </div>
                                {isProvider && (
                                    <>
                                        <div className="flex justify-between p-2 rounded bg-muted/50">
                                            <span className="text-muted-foreground flex items-center gap-1">
                                                <Clock className="h-3 w-3" /> Session
                                            </span>
                                            <span className="font-medium">{firestoreUser?.defaultSessionMinutes} min</span>
                                        </div>
                                        <div className="flex justify-between p-2 rounded bg-muted/50">
                                            <span className="text-muted-foreground">Buffer</span>
                                            <span className="font-medium">{firestoreUser?.bufferMinutes} min</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Provider Actions */}
                    {isProvider && (
                        <Card className="border-2 border-blue-500/20 bg-blue-500/5">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                    <Briefcase className="h-5 w-5" />
                                    Provider Tools
                                </CardTitle>
                                <CardDescription>Manage your availability and bookings</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Link href="/provider">
                                    <Button className="w-full justify-between" variant="outline">
                                        <span className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            Provider Dashboard
                                        </span>
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </Link>
                                <Link href="/provider/availability">
                                    <Button className="w-full justify-between" variant="outline">
                                        <span className="flex items-center gap-2">
                                            <Clock className="h-4 w-4" />
                                            Manage Availability
                                        </span>
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    )}

                    {/* Booker Actions */}
                    {isBooker && (
                        <Card className="border-2 border-green-500/20 bg-green-500/5">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                    <Users className="h-5 w-5" />
                                    Book Sessions
                                </CardTitle>
                                <CardDescription>Find providers and book appointments</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Link href="/browse">
                                    <Button className="w-full justify-between" variant="outline">
                                        <span className="flex items-center gap-2">
                                            <Users className="h-4 w-4" />
                                            Browse Providers
                                        </span>
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </Link>
                                <Link href="/my-bookings">
                                    <Button className="w-full justify-between" variant="outline">
                                        <span className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            My Bookings
                                        </span>
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    )}

                    {/* Account Settings */}
                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5" />
                                Account
                            </CardTitle>
                            <CardDescription>Manage your account settings</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Link href="/profile/edit">
                                <Button variant="outline" className="w-full justify-start">
                                    Edit Profile
                                </Button>
                            </Link>
                            <Link href="/profile/edit">
                                <Button variant="outline" className="w-full justify-start">
                                    Notification Settings
                                </Button>
                            </Link>
                            <div className="pt-2">
                                <Button
                                    onClick={handleSignOut}
                                    variant="destructive"
                                    className="w-full gap-2"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Sign Out
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

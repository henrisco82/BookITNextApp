'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ThemeToggle'
import { getUserTimezone, TIMEZONE_OPTIONS } from '@/lib/timezone'
import type { UserRole, ProviderCategory } from '@/types'
import { PROVIDER_CATEGORIES } from '@/types'
import { User, Briefcase, Users, Clock, Globe, Euro, Tag } from 'lucide-react'

export default function ProfileSetupPage() {
    const router = useRouter()
    const { user: clerkUser, isLoaded: isClerkLoaded } = useUser()
    const { needsProfileSetup, createProfile, isLoading } = useCurrentUser()

    // Form state
    const [displayName, setDisplayName] = useState('')
    const [role, setRole] = useState<UserRole | null>(null)
    const [category, setCategory] = useState<ProviderCategory | ''>('')
    const [timezone, setTimezone] = useState(getUserTimezone())
    const [defaultSessionMinutes, setDefaultSessionMinutes] = useState(60)
    const [bufferMinutes] = useState(15)
    const [bio, setBio] = useState('')
    const [pricePerSession, setPricePerSession] = useState(25) // Default 25 EUR
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Pre-fill display name from Clerk
    useEffect(() => {
        if (clerkUser) {
            const name = clerkUser.fullName || clerkUser.firstName || ''
            setDisplayName(name)
        }
    }, [clerkUser])

    // Redirect if profile already exists
    useEffect(() => {
        if (!isLoading && !needsProfileSetup && isClerkLoaded && clerkUser) {
            router.push('/dashboard')
        }
    }, [isLoading, needsProfileSetup, isClerkLoaded, clerkUser, router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!role) {
            setError('Please select a role')
            return
        }

        if (!displayName.trim()) {
            setError('Please enter your display name')
            return
        }

        if ((role === 'provider' || role === 'both') && !category) {
            setError('Please select a category')
            return
        }

        setIsSubmitting(true)
        setError(null)

        try {
            await createProfile({
                displayName: displayName.trim(),
                role,
                category: (role === 'provider' || role === 'both') ? category as ProviderCategory : undefined,
                timezone,
                defaultSessionMinutes,
                bufferMinutes,
                bio: role === 'provider' || role === 'both' ? bio : undefined,
                pricePerSession: role === 'provider' || role === 'both' ? pricePerSession : undefined,
            })
            router.push('/dashboard')
        } catch (err) {
            console.error('Error creating profile:', err)
            setError(err instanceof Error ? err.message : 'Failed to create profile')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!isClerkLoaded || isLoading) {
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
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <User className="h-5 w-5 text-primary" />
                            </div>
                            <h1 className="text-xl font-semibold">Complete Your Profile</h1>
                        </div>
                        <ThemeToggle />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <form onSubmit={handleSubmit}>
                    {/* Role Selection */}
                    <Card className="border-2 mb-6">
                        <CardHeader>
                            <CardTitle>How will you use BookIt?</CardTitle>
                            <CardDescription>
                                Choose your primary role. You can always change this later.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-3">
                                <button
                                    type="button"
                                    onClick={() => setRole('provider')}
                                    className={`p-6 rounded-xl border-2 text-left transition-all ${role === 'provider'
                                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                        }`}
                                >
                                    <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                                        <Briefcase className="h-6 w-6 text-blue-500" />
                                    </div>
                                    <h3 className="font-semibold mb-1">Provider</h3>
                                    <p className="text-sm text-muted-foreground">
                                        I offer services and want others to book time with me
                                    </p>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setRole('booker')}
                                    className={`p-6 rounded-xl border-2 text-left transition-all ${role === 'booker'
                                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                        }`}
                                >
                                    <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                                        <Users className="h-6 w-6 text-green-500" />
                                    </div>
                                    <h3 className="font-semibold mb-1">Booker</h3>
                                    <p className="text-sm text-muted-foreground">
                                        I want to book appointments with service providers
                                    </p>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setRole('both')}
                                    className={`p-6 rounded-xl border-2 text-left transition-all ${role === 'both'
                                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                        }`}
                                >
                                    <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
                                        <div className="relative">
                                            <Briefcase className="h-5 w-5 text-purple-500" />
                                            <Users className="h-4 w-4 text-purple-500 absolute -bottom-1 -right-1" />
                                        </div>
                                    </div>
                                    <h3 className="font-semibold mb-1">Both</h3>
                                    <p className="text-sm text-muted-foreground">
                                        I offer services and also book others
                                    </p>
                                </button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Profile Details */}
                    <Card className="border-2 mb-6">
                        <CardHeader>
                            <CardTitle>Profile Details</CardTitle>
                            <CardDescription>
                                Tell us a bit about yourself
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <label htmlFor="displayName" className="block text-sm font-medium mb-2">
                                    Display Name
                                </label>
                                <input
                                    type="text"
                                    id="displayName"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="Your name"
                                    className="w-full px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label htmlFor="timezone" className="block text-sm font-medium mb-2">
                                    <Globe className="h-4 w-4 inline mr-2" />
                                    Timezone
                                </label>
                                <select
                                    id="timezone"
                                    value={timezone}
                                    onChange={(e) => setTimezone(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                >
                                    {TIMEZONE_OPTIONS.map((tz) => (
                                        <option key={tz.value} value={tz.value}>
                                            {tz.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {(role === 'provider' || role === 'both') && (
                                <>
                                    <div>
                                        <label htmlFor="category" className="block text-sm font-medium mb-2">
                                            <Tag className="h-4 w-4 inline mr-2" />
                                            Category *
                                        </label>
                                        <select
                                            id="category"
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value as ProviderCategory)}
                                            className="w-full px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        >
                                            <option value="">Select a category</option>
                                            {PROVIDER_CATEGORIES.map((cat) => (
                                                <option key={cat} value={cat}>
                                                    {cat}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            This helps bookers find you when searching
                                        </p>
                                    </div>

                                    <div>
                                        <label htmlFor="price" className="block text-sm font-medium mb-2">
                                            <Euro className="h-4 w-4 inline mr-2" />
                                            Price Per Session (EUR)
                                        </label>
                                        <input
                                            type="number"
                                            id="price"
                                            value={pricePerSession}
                                            onChange={(e) => setPricePerSession(Number(e.target.value))}
                                            min={1}
                                            step={1}
                                            className="w-full px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="sessionLength" className="block text-sm font-medium mb-2">
                                            <Clock className="h-4 w-4 inline mr-2" />
                                            Default Session Length
                                        </label>
                                        <select
                                            id="sessionLength"
                                            value={defaultSessionMinutes}
                                            onChange={(e) => setDefaultSessionMinutes(Number(e.target.value))}
                                            className="w-full px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        >
                                            <option value={30}>30 minutes</option>
                                            <option value={45}>45 minutes</option>
                                            <option value={60}>60 minutes</option>
                                            <option value={90}>90 minutes</option>
                                            <option value={120}>2 hours</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="bio" className="block text-sm font-medium mb-2">
                                            Bio (Optional)
                                        </label>
                                        <textarea
                                            id="bio"
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            placeholder="Tell clients about your services..."
                                            rows={3}
                                            maxLength={500}
                                            className="w-full px-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                                        />
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {error && (
                        <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        size="lg"
                        className="w-full"
                        disabled={isSubmitting || !role}
                    >
                        {isSubmitting ? 'Creating Profile...' : 'Complete Setup'}
                    </Button>
                </form>
            </div>
        </div>
    )
}

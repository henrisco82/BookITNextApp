'use client'

// Provider Directory - browse and search providers
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    usersCollection,
    query,
    where,
    getDocs,
} from '@/lib/firestore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ThemeToggle'
import type { User } from '@/types'
import { Search, Users, Clock, Calendar, ArrowRight, LogOut, Home, Euro } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export default function ProviderDirectoryPage() {
    const { signOut } = useAuth()
    const router = useRouter()
    const [providers, setProviders] = useState<User[]>([])
    const [filteredProviders, setFilteredProviders] = useState<User[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [isLoading, setIsLoading] = useState(true)

    // Fetch all providers
    useEffect(() => {
        const fetchProviders = async () => {
            try {
                const q = query(
                    usersCollection,
                    where('role', 'in', ['provider', 'both'])
                )
                const snapshot = await getDocs(q)
                const providerList = snapshot.docs.map((doc) => doc.data() as User)
                setProviders(providerList)
                setFilteredProviders(providerList)
            } catch (error) {
                console.error('Error fetching providers:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchProviders()
    }, [])

    // Filter providers based on search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredProviders(providers)
            return
        }

        const queryText = searchQuery.toLowerCase()
        const filtered = providers.filter(
            (p) =>
                p.displayName.toLowerCase().includes(queryText) ||
                p.bio?.toLowerCase().includes(queryText)
        )
        setFilteredProviders(filtered)
    }, [searchQuery, providers])

    const handleSignOut = async () => {
        await signOut()
        router.push('/signin')
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
            {/* Header */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                                <Users className="h-5 w-5 text-green-500" />
                            </div>
                            <h1 className="text-xl font-semibold">Browse Providers</h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link href="/dashboard">
                                <Button variant="ghost" size="sm" className="gap-2">
                                    <Home className="h-4 w-4" />
                                    Dashboard
                                </Button>
                            </Link>
                            <Link href="/my-bookings">
                                <Button variant="outline" size="sm" className="gap-2">
                                    <Calendar className="h-4 w-4" />
                                    My Bookings
                                </Button>
                            </Link>
                            <ThemeToggle />
                            <Button onClick={handleSignOut} variant="ghost" size="sm" className="gap-2">
                                <LogOut className="h-4 w-4" />
                                Sign Out
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Search */}
                <div className="mb-8">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search providers..."
                            className="w-full pl-10 pr-4 py-3 border rounded-xl bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Provider Grid */}
                {isLoading ? (
                    <div className="text-center py-12 text-muted-foreground">Loading providers...</div>
                ) : filteredProviders.length === 0 ? (
                    <div className="text-center py-12">
                        <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-medium mb-2">No providers found</h3>
                        <p className="text-muted-foreground">
                            {searchQuery ? 'Try a different search term' : 'No providers are available yet'}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredProviders.map((provider) => (
                            <Card key={provider.id} className="border-2 hover:border-primary/50 transition-colors flex flex-col">
                                <CardHeader>
                                    <div className="flex items-start gap-4">
                                        <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/20 flex-shrink-0">
                                            <span className="text-xl font-semibold text-primary">
                                                {provider.displayName?.[0]?.toUpperCase() || '?'}
                                            </span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <CardTitle className="truncate">{provider.displayName}</CardTitle>
                                            <div className="flex items-center justify-between mt-1">
                                                <CardDescription className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {provider.defaultSessionMinutes} min
                                                </CardDescription>
                                                {provider.pricePerSession && (
                                                    <span className="text-sm font-semibold flex items-center gap-0.5 text-primary">
                                                        <Euro className="h-3 w-3" />
                                                        {provider.pricePerSession}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 flex flex-col">
                                    <div className="flex-1">
                                        {provider.bio && (
                                            <p className="text-sm text-muted-foreground line-clamp-3">
                                                {provider.bio}
                                            </p>
                                        )}
                                    </div>
                                    <Link href={`/view-provider/${provider.id}`} className="mt-4">
                                        <Button className="w-full gap-2">
                                            View Profile
                                            <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

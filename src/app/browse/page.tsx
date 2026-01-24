'use client'

// Provider Directory - browse and search providers
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
    usersCollection,
    query,
    where,
    getDocs,
} from '@/lib/firestore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Header, NavItem } from '@/components/Header'
import type { User, ProviderCategory } from '@/types'
import { PROVIDER_CATEGORIES } from '@/types'
import { Search, Users, Clock, Calendar, ArrowRight, Home, Euro, Tag, X } from 'lucide-react'

export default function ProviderDirectoryPage() {
    const [providers, setProviders] = useState<User[]>([])
    const [filteredProviders, setFilteredProviders] = useState<User[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<ProviderCategory | ''>('')
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

    // Filter providers based on search and category
    useEffect(() => {
        let filtered = providers

        // Filter by category first
        if (selectedCategory) {
            filtered = filtered.filter((p) => p.category === selectedCategory)
        }

        // Then filter by search query
        if (searchQuery.trim()) {
            const queryText = searchQuery.toLowerCase()
            filtered = filtered.filter(
                (p) =>
                    p.displayName.toLowerCase().includes(queryText) ||
                    p.bio?.toLowerCase().includes(queryText) ||
                    p.category?.toLowerCase().includes(queryText)
            )
        }

        setFilteredProviders(filtered)
    }, [searchQuery, selectedCategory, providers])

    const navItems: NavItem[] = [
        { href: '/dashboard', label: 'Dashboard', icon: <Home className="h-4 w-4" /> },
        { href: '/my-bookings', label: 'My Bookings', icon: <Calendar className="h-4 w-4" /> },
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
            {/* Header */}
            <Header
                title="Browse Providers"
                titleIcon={<Users className="h-5 w-5 text-green-500" />}
                navItems={navItems}
                maxWidth="max-w-6xl"
            />

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Search and Filter */}
                <div className="mb-8 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Search Input */}
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name, category, or bio..."
                                className="w-full pl-10 pr-4 py-3 border rounded-xl bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                        </div>

                        {/* Category Filter Dropdown */}
                        <div className="relative">
                            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value as ProviderCategory | '')}
                                className="pl-10 pr-8 py-3 border rounded-xl bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none cursor-pointer min-w-[200px]"
                            >
                                <option value="">All Categories</option>
                                {PROVIDER_CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Active Filter Badge */}
                    {selectedCategory && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Filtered by:</span>
                            <button
                                onClick={() => setSelectedCategory('')}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                            >
                                <Tag className="h-3 w-3" />
                                {selectedCategory}
                                <X className="h-3 w-3 ml-1" />
                            </button>
                        </div>
                    )}
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
                                        <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-primary/20 flex-shrink-0 bg-gradient-to-br from-primary/20 to-primary/5">
                                            {provider.imageUrl ? (
                                                <Image
                                                    src={provider.imageUrl}
                                                    alt={provider.displayName}
                                                    width={56}
                                                    height={56}
                                                    className="object-cover w-full h-full"
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <span className="text-xl font-semibold text-primary">
                                                        {provider.displayName?.[0]?.toUpperCase() || '?'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <CardTitle className="truncate">{provider.displayName}</CardTitle>
                                            {provider.category && (
                                                <div className="mt-1">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                                        <Tag className="h-3 w-3" />
                                                        {provider.category}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between mt-2">
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

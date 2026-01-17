'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
    userDoc,
    portfolioCollection,
    query,
    where,
    getDocs,
    getDoc,
} from '@/lib/firestore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ThemeToggle'
import type { User, PortfolioItem } from '@/types'
import { ArrowLeft, Calendar, Euro, Loader2, MapPin, Star } from 'lucide-react'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'

export default function ViewProviderPage() {
    const params = useParams()
    const providerId = params.providerId as string

    const [provider, setProvider] = useState<User | null>(null)
    const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Lightbox state
    const [lightboxOpen, setLightboxOpen] = useState(false)
    const [lightboxIndex, setLightboxIndex] = useState(0)
    const [currentPortfolioItem, setCurrentPortfolioItem] = useState<PortfolioItem | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch provider
                const providerSnap = await getDoc(userDoc(providerId))
                if (!providerSnap.exists()) {
                    setError('Provider not found')
                    setIsLoading(false)
                    return
                }

                const providerData = providerSnap.data()
                if (providerData.role !== 'provider') {
                    setError('This user is not a provider')
                    setIsLoading(false)
                    return
                }

                setProvider(providerData)

                // Fetch portfolio
                const portfolioQ = query(
                    portfolioCollection,
                    where('providerId', '==', providerId)
                )
                const portfolioSnap = await getDocs(portfolioQ)
                const items = portfolioSnap.docs.map(d => d.data() as PortfolioItem)
                items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                setPortfolioItems(items)
            } catch (err) {
                console.error('Error fetching provider:', err)
                setError('Failed to load provider')
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [providerId])

    const openLightbox = (item: PortfolioItem, imageIndex: number = 0) => {
        setCurrentPortfolioItem(item)
        setLightboxIndex(imageIndex)
        setLightboxOpen(true)
    }

    // Prepare slides for lightbox
    const lightboxSlides = currentPortfolioItem?.imageUrls.map(url => ({
        src: url,
    })) || []

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (error || !provider) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-muted-foreground">{error || 'Provider not found'}</p>
                <Link href="/browse">
                    <Button variant="outline">Browse Providers</Button>
                </Link>
            </div>
        )
    }

    return (
        <>
            <Lightbox
                open={lightboxOpen}
                close={() => setLightboxOpen(false)}
                index={lightboxIndex}
                slides={lightboxSlides}
            />

            <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
                {/* Header */}
                <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-16">
                            <div className="flex items-center gap-3">
                                <Link href="/browse">
                                    <Button variant="ghost" size="icon">
                                        <ArrowLeft className="h-5 w-5" />
                                    </Button>
                                </Link>
                                <h1 className="text-xl font-semibold">Provider Profile</h1>
                            </div>
                            <ThemeToggle />
                        </div>
                    </div>
                </div>

                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Provider Info Card */}
                    <Card className="border-2 mb-8">
                        <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Profile Image */}
                                <div className="flex-shrink-0">
                                    <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-primary/20 bg-muted">
                                        {provider.imageUrl ? (
                                            <Image
                                                src={provider.imageUrl}
                                                alt={provider.displayName}
                                                width={128}
                                                height={128}
                                                className="object-cover w-full h-full"
                                            />
                                        ) : (
                                            <div className="h-full w-full bg-primary/10 flex items-center justify-center text-4xl font-bold text-primary">
                                                {provider.displayName.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Provider Details */}
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold mb-2">{provider.displayName}</h2>

                                    {provider.bio && (
                                        <p className="text-muted-foreground mb-4">{provider.bio}</p>
                                    )}

                                    <div className="flex flex-wrap gap-4 mb-4">
                                        {provider.pricePerSession && (
                                            <div className="flex items-center gap-1 text-primary font-semibold">
                                                <Euro className="h-4 w-4" />
                                                {provider.pricePerSession} / session
                                            </div>
                                        )}
                                        {provider.timezone && (
                                            <div className="flex items-center gap-1 text-muted-foreground text-sm">
                                                <MapPin className="h-4 w-4" />
                                                {provider.timezone.replace(/_/g, ' ')}
                                            </div>
                                        )}
                                    </div>

                                    <Link href={`/book/${providerId}`}>
                                        <Button size="lg" className="gap-2">
                                            <Calendar className="h-5 w-5" />
                                            Book a Session
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Portfolio Section */}
                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle>Portfolio</CardTitle>
                            <CardDescription>
                                {portfolioItems.length > 0
                                    ? `${portfolioItems.length} work${portfolioItems.length === 1 ? '' : 's'} showcased`
                                    : 'No portfolio items yet'
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {portfolioItems.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <p>This provider hasn&apos;t added any portfolio items yet.</p>
                                </div>
                            ) : (
                                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                    {portfolioItems.map((item) => (
                                        <div
                                            key={item.id}
                                            className="group cursor-pointer"
                                            onClick={() => openLightbox(item, 0)}
                                        >
                                            <div className="rounded-lg border bg-card overflow-hidden shadow-sm hover:shadow-lg transition-all">
                                                {/* Main Image */}
                                                <div className="aspect-[4/3] relative bg-muted">
                                                    {item.imageUrls.length > 0 && (
                                                        <Image
                                                            src={item.imageUrls[0]}
                                                            alt={item.title}
                                                            fill
                                                            className="object-cover transition-transform group-hover:scale-105"
                                                        />
                                                    )}
                                                    {/* Image count badge */}
                                                    {item.imageUrls.length > 1 && (
                                                        <div className="absolute top-3 right-3 bg-black/70 text-white text-sm px-2 py-1 rounded-full">
                                                            +{item.imageUrls.length - 1} more
                                                        </div>
                                                    )}
                                                    {/* Hover overlay */}
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                        <span className="text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                                            View Photos
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Thumbnail Strip */}
                                                {item.imageUrls.length > 1 && (
                                                    <div className="flex gap-1 p-2 bg-muted/50">
                                                        {item.imageUrls.slice(0, 4).map((url, index) => (
                                                            <div
                                                                key={index}
                                                                className="relative aspect-square flex-1 max-w-[60px] rounded overflow-hidden"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    openLightbox(item, index)
                                                                }}
                                                            >
                                                                <Image
                                                                    src={url}
                                                                    alt={`${item.title} ${index + 1}`}
                                                                    fill
                                                                    className="object-cover hover:opacity-80 transition-opacity"
                                                                />
                                                                {index === 3 && item.imageUrls.length > 4 && (
                                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-medium">
                                                                        +{item.imageUrls.length - 4}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Title and Description */}
                                                <div className="p-4">
                                                    <h3 className="font-semibold text-lg">{item.title}</h3>
                                                    {item.description && (
                                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                            {item.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Book Button (Sticky on Mobile) */}
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t md:hidden">
                        <Link href={`/book/${providerId}`} className="block">
                            <Button size="lg" className="w-full gap-2">
                                <Calendar className="h-5 w-5" />
                                Book a Session - {provider.pricePerSession ? `€${provider.pricePerSession}` : 'Free'}
                            </Button>
                        </Link>
                    </div>

                    {/* Spacer for mobile sticky button */}
                    <div className="h-20 md:hidden" />
                </div>
            </div>
        </>
    )
}

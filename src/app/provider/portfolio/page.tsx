'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import {
    portfolioCollection,
    portfolioDoc,
    query,
    where,
    getDocs,
    setDoc,
    deleteDoc,
} from '@/lib/firestore'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { ArrowLeft, Image as ImageIcon, Plus, Trash2, X, Loader2 } from 'lucide-react'
import type { PortfolioItem } from '@/types'

export default function ProviderPortfolioPage() {
    const { user } = useCurrentUser()
    const [items, setItems] = useState<PortfolioItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isUploading, setIsUploading] = useState(false)
    const [newItem, setNewItem] = useState({ title: '', description: '' })
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const { confirm, ConfirmDialog } = useConfirmDialog()

    // Fetch portfolio items
    useEffect(() => {
        if (!user) return

        const fetchPortfolio = async () => {
            try {
                const q = query(
                    portfolioCollection,
                    where('providerId', '==', user.id)
                )

                const snapshot = await getDocs(q)
                const portfolioItems = snapshot.docs.map(doc => doc.data() as PortfolioItem)

                portfolioItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

                setItems(portfolioItems)
            } catch (error) {
                console.error('Error fetching portfolio:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchPortfolio()
    }, [user])

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('File size must be less than 5MB')
                return
            }
            setSelectedFile(file)
            setPreviewUrl(URL.createObjectURL(file))
        }
    }

    const clearSelection = () => {
        setSelectedFile(null)
        setPreviewUrl(null)
        setNewItem({ title: '', description: '' })
    }

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || !selectedFile || !newItem.title) return

        setIsUploading(true)
        try {
            const imageUrl = await uploadToCloudinary(selectedFile)

            const itemId = `${user.id}_${Date.now()}`
            const now = new Date()

            const portfolioItem: PortfolioItem = {
                id: itemId,
                providerId: user.id,
                imageUrl,
                title: newItem.title,
                description: newItem.description,
                createdAt: now,
                updatedAt: now,
            }

            await setDoc(portfolioDoc(itemId), portfolioItem)

            setItems([portfolioItem, ...items])
            clearSelection()
            alert('Image uploaded successfully!')
        } catch (error) {
            console.error('Error uploading item:', error)
            alert(error instanceof Error ? error.message : 'Failed to upload image')
        } finally {
            setIsUploading(false)
        }
    }

    const handleDelete = async (itemId: string) => {
        const confirmed = await confirm({
            title: 'Delete Portfolio Item',
            description: 'Are you sure you want to delete this portfolio item? This action cannot be undone.',
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
            variant: 'destructive',
        })

        if (!confirmed) return

        try {
            await deleteDoc(portfolioDoc(itemId))
            setItems(items.filter(item => item.id !== itemId))
        } catch (error) {
            console.error('Error deleting item:', error)
            alert('Failed to delete item')
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <>
        {ConfirmDialog}
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
            {/* Header */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <Link href="/provider">
                                <Button variant="ghost" size="icon">
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            </Link>
                            <h1 className="text-xl font-semibold">Manage Portfolio</h1>
                        </div>
                        <ThemeToggle />
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid gap-8 lg:grid-cols-[350px,1fr]">
                    {/* Upload Form */}
                    <div className="space-y-6">
                        <Card className="border-2">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Plus className="h-5 w-5" />
                                    Add New Work
                                </CardTitle>
                                <CardDescription>
                                    Upload photos of your past projects
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleUpload} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Image</Label>
                                        <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-muted/50 transition-colors relative">
                                            {previewUrl ? (
                                                <div className="relative">
                                                    <div className="relative aspect-video">
                                                        <Image
                                                            src={previewUrl}
                                                            alt="Preview"
                                                            fill
                                                            className="rounded-md object-cover"
                                                        />
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="icon"
                                                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                                        onClick={clearSelection}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <label className="cursor-pointer block p-4">
                                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                        <ImageIcon className="h-8 w-8" />
                                                        <span className="text-sm font-medium">Click to select (max 5MB)</span>
                                                    </div>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={handleFileSelect}
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="title">Title</Label>
                                        <Input
                                            id="title"
                                            placeholder="e.g. Modern Kitchen Remodel"
                                            value={newItem.title}
                                            onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                                            disabled={isUploading}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description">Description (Optional)</Label>
                                        <Input
                                            id="description"
                                            placeholder="Brief details about the work..."
                                            value={newItem.description}
                                            onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                                            disabled={isUploading}
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full gap-2"
                                        disabled={!selectedFile || !newItem.title || isUploading}
                                    >
                                        {isUploading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Uploading...
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="h-4 w-4" />
                                                Add to Portfolio
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Portfolio Grid */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Your Portfolio ({items.length})</h2>
                        </div>

                        {items.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
                                <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p>No items yet. Upload your first photo!</p>
                            </div>
                        ) : (
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {items.map((item) => (
                                    <div key={item.id} className="group relative rounded-lg border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all">
                                        <div className="aspect-video relative bg-muted">
                                            <div className="relative aspect-video">
                                                <Image
                                                    src={item.imageUrl}
                                                    alt={item.title}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    className="gap-2"
                                                    onClick={() => handleDelete(item.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <h3 className="font-semibold truncate">{item.title}</h3>
                                            {item.description && (
                                                <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
        </>
    )
}

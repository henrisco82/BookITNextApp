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
import { ArrowLeft, Image as ImageIcon, Plus, Trash2, X, Loader2, Eye } from 'lucide-react'
import type { PortfolioItem } from '@/types'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'

export default function ProviderPortfolioPage() {
    const { user } = useCurrentUser()
    const [items, setItems] = useState<PortfolioItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState('')
    const [newItem, setNewItem] = useState({ title: '', description: '' })
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [previewUrls, setPreviewUrls] = useState<string[]>([])
    const { confirm, ConfirmDialog } = useConfirmDialog()

    // Lightbox state
    const [lightboxOpen, setLightboxOpen] = useState(false)
    const [lightboxIndex, setLightboxIndex] = useState(0)
    const [currentItem, setCurrentItem] = useState<PortfolioItem | null>(null)

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
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return

        // Validate file sizes (max 5MB each)
        const validFiles: File[] = []
        const newPreviewUrls: string[] = []

        for (const file of files) {
            if (file.size > 5 * 1024 * 1024) {
                alert(`File "${file.name}" is larger than 5MB and will be skipped.`)
                continue
            }
            validFiles.push(file)
            newPreviewUrls.push(URL.createObjectURL(file))
        }

        // Limit to 10 images total per work
        const totalFiles = selectedFiles.length + validFiles.length
        if (totalFiles > 10) {
            alert('Maximum 10 images per work item.')
            const allowed = 10 - selectedFiles.length
            validFiles.splice(allowed)
            newPreviewUrls.splice(allowed)
        }

        setSelectedFiles(prev => [...prev, ...validFiles])
        setPreviewUrls(prev => [...prev, ...newPreviewUrls])

        // Reset input so same files can be selected again
        e.target.value = ''
    }

    const removeFile = (index: number) => {
        URL.revokeObjectURL(previewUrls[index])
        setSelectedFiles(prev => prev.filter((_, i) => i !== index))
        setPreviewUrls(prev => prev.filter((_, i) => i !== index))
    }

    const clearSelection = () => {
        previewUrls.forEach(url => URL.revokeObjectURL(url))
        setSelectedFiles([])
        setPreviewUrls([])
        setNewItem({ title: '', description: '' })
        setUploadProgress('')
    }

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || selectedFiles.length === 0 || !newItem.title) return

        setIsUploading(true)
        try {
            // Upload all images to Cloudinary
            const imageUrls: string[] = []
            for (let i = 0; i < selectedFiles.length; i++) {
                setUploadProgress(`Uploading image ${i + 1} of ${selectedFiles.length}...`)
                const url = await uploadToCloudinary(selectedFiles[i])
                imageUrls.push(url)
            }

            const itemId = `${user.id}_${Date.now()}`
            const now = new Date()

            const portfolioItem: PortfolioItem = {
                id: itemId,
                providerId: user.id,
                imageUrls,
                title: newItem.title,
                description: newItem.description,
                createdAt: now,
                updatedAt: now,
            }

            await setDoc(portfolioDoc(itemId), portfolioItem)

            setItems([portfolioItem, ...items])
            clearSelection()
            alert('Work uploaded successfully!')
        } catch (error) {
            console.error('Error uploading item:', error)
            alert(error instanceof Error ? error.message : 'Failed to upload images')
        } finally {
            setIsUploading(false)
            setUploadProgress('')
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

    const openLightbox = (item: PortfolioItem, imageIndex: number = 0) => {
        setCurrentItem(item)
        setLightboxIndex(imageIndex)
        setLightboxOpen(true)
    }

    // Prepare slides for lightbox
    const lightboxSlides = currentItem?.imageUrls.map(url => ({
        src: url,
    })) || []

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
        <Lightbox
            open={lightboxOpen}
            close={() => setLightboxOpen(false)}
            index={lightboxIndex}
            slides={lightboxSlides}
        />
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
                                    Upload photos of your past projects (up to 10 images)
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleUpload} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Images ({selectedFiles.length}/10)</Label>

                                        {/* Preview grid for selected images */}
                                        {previewUrls.length > 0 && (
                                            <div className="grid grid-cols-3 gap-2 mb-3">
                                                {previewUrls.map((url, index) => (
                                                    <div key={index} className="relative aspect-square">
                                                        <Image
                                                            src={url}
                                                            alt={`Preview ${index + 1}`}
                                                            fill
                                                            className="rounded-md object-cover"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            size="icon"
                                                            className="absolute -top-1 -right-1 h-5 w-5 rounded-full"
                                                            onClick={() => removeFile(index)}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Add more images button */}
                                        {selectedFiles.length < 10 && (
                                            <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-muted/50 transition-colors">
                                                <label className="cursor-pointer block">
                                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                        <ImageIcon className="h-8 w-8" />
                                                        <span className="text-sm font-medium">
                                                            {selectedFiles.length === 0
                                                                ? 'Click to select images (max 5MB each)'
                                                                : 'Add more images'
                                                            }
                                                        </span>
                                                    </div>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        multiple
                                                        className="hidden"
                                                        onChange={handleFileSelect}
                                                        disabled={isUploading}
                                                    />
                                                </label>
                                            </div>
                                        )}

                                        {selectedFiles.length > 0 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={clearSelection}
                                                className="w-full text-muted-foreground"
                                            >
                                                Clear all
                                            </Button>
                                        )}
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
                                        disabled={selectedFiles.length === 0 || !newItem.title || isUploading}
                                    >
                                        {isUploading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                {uploadProgress || 'Uploading...'}
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
                                <p>No items yet. Upload your first work!</p>
                            </div>
                        ) : (
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {items.map((item) => (
                                    <div key={item.id} className="rounded-lg border bg-card overflow-hidden shadow-sm hover:shadow-lg transition-all">
                                        {/* Main Image - Click to open lightbox */}
                                        <div
                                            className="aspect-[4/3] relative bg-muted cursor-pointer group"
                                            onClick={() => openLightbox(item, 0)}
                                        >
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
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-white font-medium">
                                                    <Eye className="h-5 w-5" />
                                                    View Photos
                                                </div>
                                            </div>
                                        </div>

                                        {/* Thumbnail Strip */}
                                        {item.imageUrls.length > 1 && (
                                            <div className="flex gap-1 p-2 bg-muted/50">
                                                {item.imageUrls.slice(0, 4).map((url, index) => (
                                                    <div
                                                        key={index}
                                                        className="relative aspect-square flex-1 max-w-[60px] rounded overflow-hidden cursor-pointer"
                                                        onClick={() => openLightbox(item, index)}
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

                                        {/* Title, Description, and Actions */}
                                        <div className="p-4">
                                            <h3 className="font-semibold text-lg">{item.title}</h3>
                                            {item.description && (
                                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                    {item.description}
                                                </p>
                                            )}
                                            <div className="mt-4 flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1 gap-2"
                                                    onClick={() => openLightbox(item, 0)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    Preview
                                                </Button>
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

'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAuth } from '@/contexts/AuthContext'
import { deleteDoc, userDoc } from '@/lib/firestore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { ArrowLeft, Save, Trash2, User, AlertTriangle, Lock, Camera, Euro } from 'lucide-react'

export default function EditProfilePage() {
    const router = useRouter()
    const { user, updateProfile, isLoading, imageUrl, setProfileImage } = useCurrentUser()
    const { signOut, changePassword } = useAuth()
    const { confirm, ConfirmDialog } = useConfirmDialog()

    const [formData, setFormData] = useState({
        displayName: '',
        bio: '',
        pricePerSession: '0',
    })
    const [passwords, setPasswords] = useState({
        current: '',
        new: ''
    })
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isUploading, setIsUploading] = useState(false)

    useEffect(() => {
        if (user) {
            setFormData({
                displayName: user.displayName || '',
                bio: user.bio || '',
                pricePerSession: user.pricePerSession?.toString() || '0',
            })
        }
    }, [user])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        if (name === 'pricePerSession') {
            // Only allow numbers and one decimal point
            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                setFormData(prev => ({ ...prev, [name]: value }))
            }
            return
        }
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB')
            return
        }

        setIsUploading(true)
        try {
            await setProfileImage(file)
            alert('Profile picture updated successfully')
        } catch (error) {
            console.error('Error uploading image:', error)
            alert('Failed to upload profile picture')
        } finally {
            setIsUploading(false)
        }
    }

    const handlePasswordChange = async () => {
        if (!passwords.current || !passwords.new) return

        setIsSaving(true)
        try {
            await changePassword(passwords.current, passwords.new)
            setPasswords({ current: '', new: '' })
            alert('Password updated successfully')
        } catch (error) {
            console.error('Error changing password:', error)
            alert(error instanceof Error ? error.message : 'Failed to update password')
        } finally {
            setIsSaving(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        setIsSaving(true)
        try {
            await updateProfile({
                displayName: formData.displayName,
                bio: formData.bio,
                pricePerSession: (user.role === 'provider' || user.role === 'both')
                    ? parseFloat(formData.pricePerSession) || 0
                    : undefined
            })
            router.push('/dashboard')
        } catch (error) {
            console.error('Error updating profile:', error)
            alert('Failed to update profile. Please try again.')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDeleteAccount = async () => {
        if (!user) return

        const firstConfirm = await confirm({
            title: 'Delete Account',
            description: 'Are you sure you want to delete your account? This action cannot be undone and will remove all your data.',
            confirmLabel: 'Yes, Delete My Account',
            cancelLabel: 'Cancel',
            variant: 'destructive',
        })

        if (!firstConfirm) return

        const secondConfirm = await confirm({
            title: 'Final Confirmation',
            description: 'This is your last chance to cancel. Are you absolutely sure you want to permanently delete your account?',
            confirmLabel: 'Delete Permanently',
            cancelLabel: 'Keep My Account',
            variant: 'destructive',
        })

        if (!secondConfirm) return

        setIsDeleting(true)
        try {
            await deleteDoc(userDoc(user.id))
            await signOut()
            router.push('/')
        } catch (error) {
            console.error('Error deleting account:', error)
            alert('Failed to delete account. Please try again.')
        } finally {
            setIsDeleting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        )
    }

    return (
        <>
        {ConfirmDialog}
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
            {/* Header */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <Link href="/dashboard">
                                <Button variant="ghost" size="icon">
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            </Link>
                            <h1 className="text-xl font-semibold">Edit Profile</h1>
                        </div>
                        <ThemeToggle />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Profile Settings */}
                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5 text-primary" />
                                Personal Information
                            </CardTitle>
                            <CardDescription>
                                Update your public profile details
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Profile Image */}
                            <div className="flex flex-col items-center justify-center space-y-4 mb-6">
                                <div className="relative group">
                                    <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-primary/20">
                                        {imageUrl ? (
                                            <Image
                                                src={imageUrl}
                                                alt="Profile"
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center border-4 border-background overflow-hidden relative">
                                                {user?.displayName?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                        )}
                                    </div>
                                    <label
                                        htmlFor="profile-image-upload"
                                        className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                                    >
                                        {isUploading ? (
                                            <div className="animate-spin h-6 w-6 border-2 border-white/30 border-t-white rounded-full" />
                                        ) : (
                                            <Camera className="h-8 w-8" />
                                        )}
                                    </label>
                                    <input
                                        type="file"
                                        id="profile-image-upload"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageUpload}
                                        disabled={isUploading}
                                    />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Click to upload a new picture
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="displayName">Display Name</Label>
                                <Input
                                    id="displayName"
                                    name="displayName"
                                    value={formData.displayName}
                                    onChange={handleChange}
                                    required
                                    placeholder="Your name"
                                />
                            </div>

                            {(user?.role === 'provider' || user?.role === 'both') && (
                                <div className="space-y-2">
                                    <Label htmlFor="pricePerSession" className="flex items-center gap-2">
                                        <Euro className="h-4 w-4" />
                                        Price Per Session (EUR)
                                    </Label>
                                    <Input
                                        id="pricePerSession"
                                        name="pricePerSession"
                                        type="text"
                                        inputMode="decimal"
                                        value={formData.pricePerSession}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="bio">Bio</Label>
                                <textarea
                                    id="bio"
                                    name="bio"
                                    value={formData.bio}
                                    onChange={handleChange}
                                    rows={4}
                                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Tell us a bit about yourself..."
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Security Settings */}
                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lock className="h-5 w-5 text-primary" />
                                Security
                            </CardTitle>
                            <CardDescription>
                                Update your password and security settings
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="currentPassword">Current Password</Label>
                                <Input
                                    id="currentPassword"
                                    type="password"
                                    value={passwords.current}
                                    onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
                                    placeholder="••••••••"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">New Password</Label>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    value={passwords.new}
                                    onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                                    placeholder="••••••••"
                                />
                            </div>
                            <Button
                                type="button"
                                onClick={handlePasswordChange}
                                disabled={isSaving || !passwords.current || !passwords.new}
                                variant="outline"
                            >
                                Update Password
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Notification Settings */}
                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-primary" />
                                Notification Preferences
                            </CardTitle>
                            <CardDescription>
                                Manage how you want to be notified about bookings
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {(user?.role === 'provider' || user?.role === 'both') && (
                                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">New Booking Requests</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Receive an email when a booker requests a session
                                        </p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                                        checked={user?.notificationSettings?.email?.newBookingRequest || false}
                                        onChange={(e) => updateProfile({
                                            notificationSettings: {
                                                ...user?.notificationSettings,
                                                email: {
                                                    ...(user?.notificationSettings?.email || {
                                                        newBookingRequest: false,
                                                        bookingConfirmed: false,
                                                        bookingDeclined: false,
                                                        bookingCancelled: false,
                                                    }),
                                                    newBookingRequest: e.target.checked
                                                }
                                            }
                                        })}
                                    />
                                </div>
                            )}

                            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Booking Cancellations</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Receive an email if a confirmed booking is cancelled
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                                    checked={user?.notificationSettings?.email?.bookingCancelled || false}
                                    onChange={(e) => updateProfile({
                                        notificationSettings: {
                                            ...user?.notificationSettings,
                                            email: {
                                                ...(user?.notificationSettings?.email || {
                                                    newBookingRequest: false,
                                                    bookingConfirmed: false,
                                                    bookingDeclined: false,
                                                    bookingCancelled: false,
                                                }),
                                                bookingCancelled: e.target.checked
                                            }
                                        }
                                    })}
                                />
                            </div>

                            {(user?.role === 'booker' || user?.role === 'both') && (
                                <>
                                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Booking Confirmed</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Receive an email when a provider accepts your booking (includes video call link)
                                            </p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                                            checked={user?.notificationSettings?.email?.bookingConfirmed || false}
                                            onChange={(e) => updateProfile({
                                                notificationSettings: {
                                                    ...user?.notificationSettings,
                                                    email: {
                                                        ...(user?.notificationSettings?.email || {
                                                            newBookingRequest: false,
                                                            bookingConfirmed: false,
                                                            bookingDeclined: false,
                                                            bookingCancelled: false,
                                                        }),
                                                        bookingConfirmed: e.target.checked
                                                    }
                                                }
                                            })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Booking Declined</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Receive an email if a provider declines your request
                                            </p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                                            checked={user?.notificationSettings?.email?.bookingDeclined || false}
                                            onChange={(e) => updateProfile({
                                                notificationSettings: {
                                                    ...user?.notificationSettings,
                                                    email: {
                                                        ...(user?.notificationSettings?.email || {
                                                            newBookingRequest: false,
                                                            bookingConfirmed: false,
                                                            bookingDeclined: false,
                                                            bookingCancelled: false,
                                                        }),
                                                        bookingDeclined: e.target.checked
                                                    }
                                                }
                                            })}
                                        />
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-4">
                        <Button type="submit" className="flex-1 gap-2" disabled={isSaving}>
                            <Save className="h-4 w-4" />
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Link href="/dashboard" className="flex-1">
                            <Button variant="outline" type="button" className="w-full">
                                Cancel
                            </Button>
                        </Link>
                    </div>

                    {/* Danger Zone */}
                    <Card className="border-2 border-destructive/20 bg-destructive/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-destructive">
                                <AlertTriangle className="h-5 w-5" />
                                Danger Zone
                            </CardTitle>
                            <CardDescription>
                                Irreversible actions regarding your account
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="font-medium">Delete Account</p>
                                    <p className="text-sm text-muted-foreground">
                                        Permanently delete your account and all data
                                    </p>
                                </div>
                                <Button
                                    variant="destructive"
                                    type="button"
                                    onClick={handleDeleteAccount}
                                    disabled={isDeleting}
                                    className="gap-2"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    {isDeleting ? 'Deleting...' : 'Delete Account'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </div>
        </>
    )
}

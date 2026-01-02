import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAuth } from '@/contexts/AuthContext'
import { deleteDoc, userDoc } from '@/lib/firestore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ArrowLeft, Save, Trash2, User, AlertTriangle, Lock } from 'lucide-react'

export function EditProfile() {
    const navigate = useNavigate()
    const { user, updateProfile, isLoading } = useCurrentUser()
    const { signOut, changePassword } = useAuth()

    const [formData, setFormData] = useState({
        displayName: '',
        bio: '',
    })
    const [passwords, setPasswords] = useState({
        current: '',
        new: ''
    })
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        if (user) {
            setFormData({
                displayName: user.displayName || '',
                bio: user.bio || '',
            })
        }
    }, [user])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
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
                bio: formData.bio
            })
            // Optional: Show success message/toast
            navigate('/dashboard')
        } catch (error) {
            console.error('Error updating profile:', error)
            alert('Failed to update profile. Please try again.')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDeleteAccount = async () => {
        if (!user) return

        const confirmed = window.confirm(
            'Are you sure you want to delete your account? This action cannot be undone and will remove all your data.'
        )

        if (!confirmed) return

        const doubleConfirmed = window.confirm(
            'Please confirm again: Do you really want to delete your account?'
        )

        if (!doubleConfirmed) return

        setIsDeleting(true)
        try {
            // Delete Firestore document
            await deleteDoc(userDoc(user.id))

            // Sign out
            await signOut()
            navigate('/signin')
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
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
            {/* Header */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <Link to="/dashboard">
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
                                <p className="text-xs text-muted-foreground">
                                    This will be displayed on your profile card.
                                </p>
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

                    {/* Action Buttons */}
                    <div className="flex items-center gap-4">
                        <Button type="submit" className="flex-1 gap-2" disabled={isSaving}>
                            <Save className="h-4 w-4" />
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Link to="/dashboard" className="flex-1">
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
    )
}

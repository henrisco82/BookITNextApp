'use client'

// Availability Manager - create and manage recurring availability blocks
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import {
    availabilityCollection,
    availabilityDoc,
    query,
    where,
    getDocs,
    setDoc,
    deleteDoc,
} from '@/lib/firestore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/Header'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import type { Availability } from '@/types'
import { ArrowLeft, Plus, Trash2, Calendar, Clock, X } from 'lucide-react'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2)
    const minute = i % 2 === 0 ? '00' : '30'
    return `${hour.toString().padStart(2, '0')}:${minute}`
})

export default function ProviderAvailabilityPage() {
    const { user } = useCurrentUser()
    const [availabilities, setAvailabilities] = useState<Availability[]>([])
    const [exclusions, setExclusions] = useState<Availability[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)
    const [showExclusionModal, setShowExclusionModal] = useState(false)
    const { confirm, ConfirmDialog } = useConfirmDialog()

    // Form state for new availability
    const [selectedWeekday, setSelectedWeekday] = useState(1) // Monday
    const [startTime, setStartTime] = useState('09:00')
    const [endTime, setEndTime] = useState('17:00')
    const [isSaving, setIsSaving] = useState(false)

    // Form state for exclusion
    const [exclusionDate, setExclusionDate] = useState('')
    const [exclusionReason, setExclusionReason] = useState('')

    // Fetch availability data
    useEffect(() => {
        if (!user) return

        const fetchData = async () => {
            try {
                const q = query(
                    availabilityCollection,
                    where('providerId', '==', user.id)
                )
                const snapshot = await getDocs(q)
                const items = snapshot.docs.map((doc) => doc.data() as Availability)

                setAvailabilities(items.filter((a) => a.type === 'recurring'))
                setExclusions(items.filter((a) => a.type === 'exclusion'))
            } catch (error) {
                console.error('Error fetching availability:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [user])

    // Add recurring availability
    const handleAddAvailability = async () => {
        if (!user) return

        if (startTime >= endTime) {
            alert('End time must be after start time')
            return
        }

        setIsSaving(true)
        try {
            const id = `${user.id}_${selectedWeekday}_${startTime}_${endTime}`.replace(/:/g, '')
            const newAvailability: Availability = {
                id,
                providerId: user.id,
                type: 'recurring',
                weekday: selectedWeekday,
                startTime,
                endTime,
                createdAt: new Date(),
            }

            await setDoc(availabilityDoc(id), newAvailability)
            setAvailabilities([...availabilities, newAvailability])
            setShowAddModal(false)
        } catch (error) {
            console.error('Error adding availability:', error)
            alert('Failed to add availability')
        } finally {
            setIsSaving(false)
        }
    }

    // Add exclusion
    const handleAddExclusion = async () => {
        if (!user || !exclusionDate) return

        setIsSaving(true)
        try {
            const id = `${user.id}_exc_${exclusionDate}`
            const newExclusion: Availability = {
                id,
                providerId: user.id,
                type: 'exclusion',
                date: exclusionDate,
                reason: exclusionReason || undefined,
                createdAt: new Date(),
            }

            await setDoc(availabilityDoc(id), newExclusion)
            setExclusions([...exclusions, newExclusion])
            setShowExclusionModal(false)
            setExclusionDate('')
            setExclusionReason('')
        } catch (error) {
            console.error('Error adding exclusion:', error)
            alert('Failed to add exclusion')
        } finally {
            setIsSaving(false)
        }
    }

    // Delete availability
    const handleDeleteAvailability = async (id: string) => {
        const confirmed = await confirm({
            title: 'Delete Availability',
            description: 'Are you sure you want to delete this availability block?',
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
            variant: 'destructive',
        })

        if (!confirmed) return

        try {
            await deleteDoc(availabilityDoc(id))
            setAvailabilities(availabilities.filter((a) => a.id !== id))
        } catch (error) {
            console.error('Error deleting:', error)
            alert('Failed to delete')
        }
    }

    // Delete exclusion
    const handleDeleteExclusion = async (id: string) => {
        try {
            await deleteDoc(availabilityDoc(id))
            setExclusions(exclusions.filter((e) => e.id !== id))
        } catch (error) {
            console.error('Error deleting exclusion:', error)
        }
    }

    // Group availabilities by weekday
    const availabilityByDay = WEEKDAYS.map((day, index) => ({
        day,
        index,
        blocks: availabilities.filter((a) => a.weekday === index),
    }))

    return (
        <>
        {ConfirmDialog}
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
            {/* Header */}
            <Header
                title="Manage Availability"
                backHref="/provider"
                backIcon={<ArrowLeft className="h-5 w-5" />}
                showSignOut={false}
                maxWidth="max-w-4xl"
            />

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Weekly Schedule */}
                <Card className="border-2 mb-6">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    Weekly Schedule
                                </CardTitle>
                                <CardDescription>Set your recurring availability for each day</CardDescription>
                            </div>
                            <Button onClick={() => setShowAddModal(true)} className="gap-2">
                                <Plus className="h-4 w-4" />
                                Add Block
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="py-8 text-center text-muted-foreground">Loading...</div>
                        ) : (
                            <div className="space-y-3">
                                {availabilityByDay.map(({ day, blocks }) => (
                                    <div
                                        key={day}
                                        className={`p-4 rounded-lg border ${blocks.length > 0 ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium w-24">{day}</span>
                                            {blocks.length === 0 ? (
                                                <span className="text-sm text-muted-foreground">Not available</span>
                                            ) : (
                                                <div className="flex flex-wrap gap-2">
                                                    {blocks.map((block) => (
                                                        <div
                                                            key={block.id}
                                                            className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-sm"
                                                        >
                                                            <Clock className="h-3 w-3" />
                                                            {block.startTime} - {block.endTime}
                                                            <button
                                                                onClick={() => handleDeleteAvailability(block.id)}
                                                                className="text-destructive hover:text-destructive/80"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Exclusions */}
                <Card className="border-2">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <X className="h-5 w-5" />
                                    Date Exclusions
                                </CardTitle>
                                <CardDescription>Block off specific dates (holidays, time off)</CardDescription>
                            </div>
                            <Button onClick={() => setShowExclusionModal(true)} variant="outline" className="gap-2">
                                <Plus className="h-4 w-4" />
                                Add Date Off
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {exclusions.length === 0 ? (
                            <p className="text-center text-muted-foreground py-6">No exclusions set</p>
                        ) : (
                            <div className="space-y-2">
                                {exclusions.map((exc) => (
                                    <div
                                        key={exc.id}
                                        className="flex items-center justify-between p-3 rounded-lg border bg-destructive/5"
                                    >
                                        <div>
                                            <p className="font-medium">{exc.date}</p>
                                            {exc.reason && (
                                                <p className="text-sm text-muted-foreground">{exc.reason}</p>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteExclusion(exc.id)}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Add Availability Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle>Add Availability Block</CardTitle>
                            <CardDescription>Set a recurring time block for a day of the week</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Day of Week</label>
                                <select
                                    value={selectedWeekday}
                                    onChange={(e) => setSelectedWeekday(Number(e.target.value))}
                                    className="w-full px-4 py-2 border rounded-lg bg-background border-input"
                                >
                                    {WEEKDAYS.map((day, i) => (
                                        <option key={day} value={i}>
                                            {day}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Start Time</label>
                                    <select
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="w-full px-4 py-2 border rounded-lg bg-background border-input"
                                    >
                                        {TIME_OPTIONS.map((time) => (
                                            <option key={time} value={time}>
                                                {time}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">End Time</label>
                                    <select
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-full px-4 py-2 border rounded-lg bg-background border-input"
                                    >
                                        {TIME_OPTIONS.map((time) => (
                                            <option key={time} value={time}>
                                                {time}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setShowAddModal(false)}
                                >
                                    Cancel
                                </Button>
                                <Button className="flex-1" onClick={handleAddAvailability} disabled={isSaving}>
                                    {isSaving ? 'Saving...' : 'Add Block'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Add Exclusion Modal */}
            {showExclusionModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle>Add Date Off</CardTitle>
                            <CardDescription>Block a specific date from your availability</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Date</label>
                                <input
                                    type="date"
                                    value={exclusionDate}
                                    onChange={(e) => setExclusionDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-2 border rounded-lg bg-background border border-input h-10"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Reason (Optional)</label>
                                <input
                                    type="text"
                                    value={exclusionReason}
                                    onChange={(e) => setExclusionReason(e.target.value)}
                                    placeholder="e.g., Holiday, Vacation"
                                    className="w-full px-4 py-2 border rounded-lg bg-background border border-input h-10"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setShowExclusionModal(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={handleAddExclusion}
                                    disabled={isSaving || !exclusionDate}
                                >
                                    {isSaving ? 'Saving...' : 'Add Exclusion'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
        </>
    )
}

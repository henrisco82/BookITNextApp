'use client'

// Messages - Conversation list page
import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useConversations } from '@/hooks/useConversations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ThemeToggle'
import { MessageSquare, ArrowLeft, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function MessagesPage() {
    const { user, isLoading: isUserLoading } = useCurrentUser()
    const { conversations, isLoading: isConvoLoading } = useConversations(user?.id)
    const router = useRouter()

    // Redirect to dashboard if not logged in
    useEffect(() => {
        if (!isUserLoading && !user) {
            router.replace('/dashboard')
        }
    }, [isUserLoading, user, router])

    const isLoading = isUserLoading || isConvoLoading

    // Get the other participant's name and image for display
    const getOtherParticipant = (convo: typeof conversations[0]) => {
        const isProvider = user?.id === convo.providerId
        return {
            name: isProvider ? convo.bookerName : convo.providerName,
            imageUrl: isProvider ? convo.bookerImageUrl : convo.providerImageUrl,
        }
    }

    // Get initials for avatar fallback
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
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
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <Link href="/dashboard">
                                <Button variant="ghost" size="icon">
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            </Link>
                            <h1 className="text-xl font-semibold">Messages</h1>
                        </div>
                        <ThemeToggle />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Card className="border-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-primary" />
                            Conversations
                        </CardTitle>
                        <CardDescription>
                            Messages with providers and bookers
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {conversations.length === 0 ? (
                            <div className="text-center py-12">
                                <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                                <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
                                <p className="text-muted-foreground mb-6">
                                    Conversations will appear here when bookings are confirmed
                                </p>
                                <Link href="/browse">
                                    <Button>Browse Providers</Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {conversations.map((convo) => {
                                    const other = getOtherParticipant(convo)
                                    const unreadCount = user?.id ? convo.unreadCount[user.id] || 0 : 0

                                    return (
                                        <Link
                                            key={convo.id}
                                            href={`/messages/${convo.id}`}
                                            className="block"
                                        >
                                            <div className={`flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors ${unreadCount > 0 ? 'bg-primary/5 border-primary/20' : ''}`}>
                                                {/* Avatar */}
                                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center border-2 border-background overflow-hidden relative shrink-0">
                                                    {other.imageUrl ? (
                                                        <Image
                                                            src={other.imageUrl}
                                                            alt={other.name}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    ) : (
                                                        <span className="text-sm font-semibold text-primary">
                                                            {getInitials(other.name)}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className={`font-medium truncate ${unreadCount > 0 ? 'text-foreground' : ''}`}>
                                                            {other.name}
                                                        </p>
                                                        {convo.lastMessageAt && (
                                                            <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                                                                <Clock className="h-3 w-3" />
                                                                {formatDistanceToNow(convo.lastMessageAt, { addSuffix: true })}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {convo.lastMessage && (
                                                        <p className={`text-sm truncate ${unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                                            {convo.lastMessageSenderId === user?.id && 'You: '}
                                                            {convo.lastMessage}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Unread badge */}
                                                {unreadCount > 0 && (
                                                    <div className="h-6 min-w-[24px] px-2 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
                                                        {unreadCount > 99 ? '99+' : unreadCount}
                                                    </div>
                                                )}
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

'use client'

// Chat interface for a conversation
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useMessages } from '@/hooks/useConversations'
import { conversationDoc, getDoc } from '@/lib/firestore'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ArrowLeft, Send } from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'
import type { Conversation } from '@/types'

export default function ConversationPage() {
    const params = useParams()
    const conversationId = params.conversationId as string
    const router = useRouter()

    const { user, isLoading: isUserLoading } = useCurrentUser()
    const { messages, isLoading: isMessagesLoading, sendMessage, markAsRead } = useMessages(
        conversationId,
        user?.id,
        user?.displayName
    )

    const [conversation, setConversation] = useState<Conversation | null>(null)
    const [isConvoLoading, setIsConvoLoading] = useState(true)
    const [newMessage, setNewMessage] = useState('')
    const [isSending, setIsSending] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Fetch conversation details
    useEffect(() => {
        if (!conversationId) return

        const fetchConversation = async () => {
            try {
                const convoSnap = await getDoc(conversationDoc(conversationId))
                if (convoSnap.exists()) {
                    setConversation(convoSnap.data() as Conversation)
                } else {
                    router.replace('/messages')
                }
            } catch (error) {
                console.error('Error fetching conversation:', error)
            } finally {
                setIsConvoLoading(false)
            }
        }

        fetchConversation()
    }, [conversationId, router])

    // Mark messages as read when viewing
    useEffect(() => {
        if (user?.id && conversationId && !isMessagesLoading) {
            markAsRead()
        }
    }, [user?.id, conversationId, isMessagesLoading, markAsRead, messages.length])

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Redirect if not logged in
    useEffect(() => {
        if (!isUserLoading && !user) {
            router.replace('/dashboard')
        }
    }, [isUserLoading, user, router])

    const handleSend = async () => {
        if (!newMessage.trim() || isSending) return

        setIsSending(true)
        try {
            await sendMessage(newMessage)
            setNewMessage('')
            inputRef.current?.focus()
        } catch (error) {
            console.error('Error sending message:', error)
        } finally {
            setIsSending(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    // Get the other participant's info
    const getOtherParticipant = () => {
        if (!conversation || !user) return { name: '', imageUrl: undefined }
        const isProvider = user.id === conversation.providerId
        return {
            name: isProvider ? conversation.bookerName : conversation.providerName,
            imageUrl: isProvider ? conversation.bookerImageUrl : conversation.providerImageUrl,
        }
    }

    // Get initials for avatar
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    // Format message timestamp
    const formatMessageTime = (date: Date) => {
        if (isToday(date)) {
            return format(date, 'h:mm a')
        }
        if (isYesterday(date)) {
            return `Yesterday ${format(date, 'h:mm a')}`
        }
        return format(date, 'MMM d, h:mm a')
    }

    const isLoading = isUserLoading || isConvoLoading || isMessagesLoading
    const other = getOtherParticipant()

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        )
    }

    return (
        <div className="h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/20">
            {/* Header */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <Link href="/messages">
                                <Button variant="ghost" size="icon">
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            </Link>
                            {/* Other participant info */}
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border-2 border-background overflow-hidden relative">
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
                                <h1 className="text-lg font-semibold">{other.name}</h1>
                            </div>
                        </div>
                        <ThemeToggle />
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    {messages.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>No messages yet. Start the conversation!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {messages.map((message, index) => {
                                const isMe = message.senderId === user?.id
                                const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId

                                return (
                                    <div
                                        key={message.id}
                                        className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}
                                    >
                                        {/* Avatar (only show for first message in a group) */}
                                        {showAvatar ? (
                                            <div className={`h-8 w-8 rounded-full bg-muted flex items-center justify-center border overflow-hidden relative shrink-0 ${isMe ? 'bg-primary/10' : ''}`}>
                                                {!isMe && other.imageUrl ? (
                                                    <Image
                                                        src={other.imageUrl}
                                                        alt={other.name}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <span className={`text-xs font-semibold ${isMe ? 'text-primary' : 'text-muted-foreground'}`}>
                                                        {getInitials(isMe ? (user?.displayName || '') : other.name)}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="w-8 shrink-0" />
                                        )}

                                        {/* Message bubble */}
                                        <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div
                                                className={`rounded-2xl px-4 py-2 ${
                                                    isMe
                                                        ? 'bg-primary text-primary-foreground rounded-br-md'
                                                        : 'bg-muted rounded-bl-md'
                                                }`}
                                            >
                                                <p className="text-sm whitespace-pre-wrap break-words">
                                                    {message.content}
                                                </p>
                                            </div>
                                            <p className={`text-xs text-muted-foreground mt-1 ${isMe ? 'text-right' : ''}`}>
                                                {formatMessageTime(message.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>
            </div>

            {/* Input */}
            <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            className="flex-1 px-4 py-3 rounded-full border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                            disabled={isSending}
                        />
                        <Button
                            onClick={handleSend}
                            disabled={!newMessage.trim() || isSending}
                            size="icon"
                            className="h-12 w-12 rounded-full"
                        >
                            <Send className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

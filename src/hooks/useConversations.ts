// Hooks for managing conversations and messages
import { useState, useEffect, useCallback } from 'react'
import {
    conversationsCollection,
    conversationDoc,
    messagesCollection,
    messageDoc,
    setDoc,
    updateDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    getDocs,
    Timestamp,
    db,
} from '@/lib/firestore'
import { doc } from 'firebase/firestore'
import type { Conversation, Message } from '@/types'

interface UseConversationsReturn {
    conversations: Conversation[]
    totalUnread: number
    isLoading: boolean
    error: Error | null
}

// Hook to get real-time conversation list for a user
export function useConversations(userId: string | undefined): UseConversationsReturn {
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        if (!userId) {
            setConversations([])
            setIsLoading(false)
            return
        }

        const q = query(
            conversationsCollection,
            where('participantIds', 'array-contains', userId)
        )

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const convos = snapshot.docs.map((doc) => doc.data() as Conversation)
            // Sort by lastMessageAt (most recent first)
            convos.sort((a, b) => {
                const aTime = a.lastMessageAt?.getTime() || a.createdAt.getTime()
                const bTime = b.lastMessageAt?.getTime() || b.createdAt.getTime()
                return bTime - aTime
            })
            setConversations(convos)
            setIsLoading(false)
        }, (err) => {
            console.error('Error fetching conversations:', err)
            setError(err as Error)
            setIsLoading(false)
        })

        return () => unsubscribe()
    }, [userId])

    // Calculate total unread count
    const totalUnread = conversations.reduce((total, convo) => {
        return total + (userId ? (convo.unreadCount[userId] || 0) : 0)
    }, 0)

    return { conversations, totalUnread, isLoading, error }
}

interface UseMessagesReturn {
    messages: Message[]
    isLoading: boolean
    error: Error | null
    sendMessage: (content: string) => Promise<void>
    markAsRead: () => Promise<void>
}

// Hook to get real-time messages for a conversation
export function useMessages(
    conversationId: string | undefined,
    userId: string | undefined,
    userName: string | undefined
): UseMessagesReturn {
    const [messages, setMessages] = useState<Message[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        if (!conversationId) {
            setMessages([])
            setIsLoading(false)
            return
        }

        // Query without orderBy to avoid needing a composite index
        // We'll sort client-side instead
        const q = query(
            messagesCollection,
            where('conversationId', '==', conversationId)
        )

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map((doc) => doc.data() as Message)
            // Sort by createdAt client-side
            msgs.sort((a, b) => {
                const aTime = a.createdAt?.getTime?.() || 0
                const bTime = b.createdAt?.getTime?.() || 0
                return aTime - bTime
            })
            setMessages(msgs)
            setIsLoading(false)
        }, (err) => {
            console.error('Error fetching messages:', err)
            setError(err as Error)
            setIsLoading(false)
        })

        return () => unsubscribe()
    }, [conversationId])

    // Send a new message
    const sendMessage = useCallback(async (content: string) => {
        if (!conversationId || !userId || !userName || !content.trim()) {
            return
        }

        const messageId = doc(messagesCollection).id
        const now = Timestamp.now()

        const newMessage: Message = {
            id: messageId,
            conversationId,
            senderId: userId,
            senderName: userName,
            content: content.trim(),
            status: 'sent',
            createdAt: now.toDate(),
        }

        try {
            // Create the message
            await setDoc(messageDoc(messageId), newMessage)

            // Update conversation with last message info and increment unread for other participant
            const convoRef = conversationDoc(conversationId)
            const convoSnap = await getDocs(query(
                conversationsCollection,
                where('__name__', '==', conversationId)
            ))

            if (!convoSnap.empty) {
                const convo = convoSnap.docs[0].data() as Conversation
                const otherParticipantId = convo.participantIds.find(id => id !== userId)

                const unreadCount = { ...convo.unreadCount }
                if (otherParticipantId) {
                    unreadCount[otherParticipantId] = (unreadCount[otherParticipantId] || 0) + 1
                }

                await updateDoc(convoRef, {
                    lastMessage: content.trim(),
                    lastMessageAt: now,
                    lastMessageSenderId: userId,
                    unreadCount,
                    updatedAt: now,
                })
            }
        } catch (err) {
            console.error('Error sending message:', err)
            throw err
        }
    }, [conversationId, userId, userName])

    // Mark messages as read
    const markAsRead = useCallback(async () => {
        if (!conversationId || !userId) {
            return
        }

        try {
            const convoRef = conversationDoc(conversationId)

            // Reset unread count for this user
            await updateDoc(convoRef, {
                [`unreadCount.${userId}`]: 0,
                updatedAt: Timestamp.now(),
            })
        } catch (err) {
            console.error('Error marking messages as read:', err)
        }
    }, [conversationId, userId])

    return { messages, isLoading, error, sendMessage, markAsRead }
}

interface CreateConversationData {
    providerId: string
    bookerId: string
    providerName: string
    bookerName: string
    providerImageUrl?: string
    bookerImageUrl?: string
    bookingId: string
}

// Get or create a conversation for a booking
export async function getOrCreateConversation(data: CreateConversationData): Promise<Conversation> {
    // Check if conversation already exists for this booking
    const existingQuery = query(
        conversationsCollection,
        where('bookingId', '==', data.bookingId)
    )
    const existingSnap = await getDocs(existingQuery)

    if (!existingSnap.empty) {
        return existingSnap.docs[0].data() as Conversation
    }

    // Create new conversation
    const conversationId = doc(conversationsCollection).id
    const now = Timestamp.now()

    const newConversation: Conversation = {
        id: conversationId,
        participantIds: [data.providerId, data.bookerId],
        providerId: data.providerId,
        bookerId: data.bookerId,
        providerName: data.providerName,
        bookerName: data.bookerName,
        providerImageUrl: data.providerImageUrl,
        bookerImageUrl: data.bookerImageUrl,
        bookingId: data.bookingId,
        unreadCount: {
            [data.providerId]: 0,
            [data.bookerId]: 0,
        },
        createdAt: now.toDate(),
        updatedAt: now.toDate(),
    }

    await setDoc(conversationDoc(conversationId), newConversation)

    return newConversation
}

// Get conversation ID for a booking (if exists)
export async function getConversationByBookingId(bookingId: string): Promise<Conversation | null> {
    const q = query(
        conversationsCollection,
        where('bookingId', '==', bookingId)
    )
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
        return null
    }

    return snapshot.docs[0].data() as Conversation
}

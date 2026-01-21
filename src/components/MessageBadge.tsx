'use client'

// Badge showing total unread message count for navigation
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useConversations } from '@/hooks/useConversations'

interface MessageBadgeProps {
    className?: string
}

export function MessageBadge({ className = '' }: MessageBadgeProps) {
    const { user } = useCurrentUser()
    const { totalUnread } = useConversations(user?.id)

    if (totalUnread === 0) {
        return null
    }

    return (
        <span className={`inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium ${className}`}>
            {totalUnread > 99 ? '99+' : totalUnread}
        </span>
    )
}

'use client'

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ConfirmDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'default' | 'destructive'
    onConfirm: () => void
    onCancel?: () => void
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'default',
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const handleCancel = () => {
        onCancel?.()
        onOpenChange(false)
    }

    const handleConfirm = () => {
        onConfirm()
        onOpenChange(false)
    }

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={handleCancel}>
                        {cancelLabel}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        className={variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
                    >
                        {confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

// Hook for easier usage with async/await pattern
import { useState, useCallback } from 'react'

interface ConfirmOptions {
    title: string
    description: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'default' | 'destructive'
}

export function useConfirmDialog() {
    const [isOpen, setIsOpen] = useState(false)
    const [options, setOptions] = useState<ConfirmOptions>({
        title: '',
        description: '',
    })
    const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null)

    const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
        setOptions(opts)
        setIsOpen(true)
        return new Promise((resolve) => {
            setResolveRef(() => resolve)
        })
    }, [])

    const handleConfirm = useCallback(() => {
        resolveRef?.(true)
        setIsOpen(false)
    }, [resolveRef])

    const handleCancel = useCallback(() => {
        resolveRef?.(false)
        setIsOpen(false)
    }, [resolveRef])

    const ConfirmDialogComponent = (
        <ConfirmDialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) handleCancel()
            }}
            title={options.title}
            description={options.description}
            confirmLabel={options.confirmLabel}
            cancelLabel={options.cancelLabel}
            variant={options.variant}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
        />
    )

    return { confirm, ConfirmDialog: ConfirmDialogComponent }
}

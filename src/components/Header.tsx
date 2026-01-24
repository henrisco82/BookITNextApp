'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Menu, X, Calendar, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export interface NavItem {
    href: string
    label: string
    icon?: React.ReactNode
    variant?: 'default' | 'ghost' | 'outline' | 'destructive'
}

interface HeaderProps {
    title: string
    titleIcon?: React.ReactNode
    navItems?: NavItem[]
    showSignOut?: boolean
    backHref?: string
    backIcon?: React.ReactNode
    maxWidth?: string
}

export function Header({
    title,
    titleIcon,
    navItems = [],
    showSignOut = true,
    backHref,
    backIcon,
    maxWidth = 'max-w-7xl'
}: HeaderProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const { signOut } = useAuth()
    const router = useRouter()

    const handleSignOut = async () => {
        await signOut()
        router.push('/')
    }

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen)
    const closeMenu = () => setIsMenuOpen(false)

    return (
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className={`${maxWidth} mx-auto px-4 sm:px-6 lg:px-8`}>
                <div className="flex justify-between items-center h-16">
                    {/* Left side - Logo/Title */}
                    <div className="flex items-center gap-3">
                        {backHref ? (
                            <Link href={backHref}>
                                <Button variant="ghost" size="icon">
                                    {backIcon}
                                </Button>
                            </Link>
                        ) : titleIcon ? (
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                {titleIcon}
                            </div>
                        ) : null}
                        <h1 className="text-xl font-semibold">{title}</h1>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-3">
                        {navItems.map((item, index) => (
                            <Link key={index} href={item.href}>
                                <Button variant={item.variant || 'ghost'} size="sm" className="gap-2">
                                    {item.icon}
                                    {item.label}
                                </Button>
                            </Link>
                        ))}
                        <ThemeToggle />
                        {showSignOut && (
                            <Button
                                onClick={handleSignOut}
                                variant="ghost"
                                size="sm"
                                className="gap-2"
                            >
                                <LogOut className="h-4 w-4" />
                                Sign Out
                            </Button>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="flex md:hidden items-center gap-2">
                        <ThemeToggle />
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleMenu}
                            aria-label="Toggle menu"
                        >
                            {isMenuOpen ? (
                                <X className="h-5 w-5" />
                            ) : (
                                <Menu className="h-5 w-5" />
                            )}
                        </Button>
                    </div>
                </div>

                {/* Mobile Navigation Menu */}
                {isMenuOpen && (navItems.length > 0 || showSignOut) && (
                    <div className="md:hidden border-t py-4 space-y-2">
                        {navItems.map((item, index) => (
                            <Link key={index} href={item.href} onClick={closeMenu}>
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start gap-2"
                                >
                                    {item.icon}
                                    {item.label}
                                </Button>
                            </Link>
                        ))}
                        {showSignOut && (
                            <Button
                                onClick={() => {
                                    closeMenu()
                                    handleSignOut()
                                }}
                                variant="ghost"
                                className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                            >
                                <LogOut className="h-4 w-4" />
                                Sign Out
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

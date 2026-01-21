'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ThemeToggle'
import {
    Calendar,
    Video,
    CreditCard,
    Star,
    Clock,
    Shield,
    Users,
    CheckCircle,
    ArrowRight,
    Sparkles,
    MessageSquare,
} from 'lucide-react'

export default function LandingPage() {
    const { isSignedIn } = useAuth()

    return (
        <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <Image
                                src="/logo.png"
                                alt="BookIt"
                                width={40}
                                height={40}
                                className="rounded-xl"
                            />
                            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                BookIt
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <ThemeToggle />
                            {isSignedIn ? (
                                <Link href="/dashboard">
                                    <Button>Go to Dashboard</Button>
                                </Link>
                            ) : (
                                <>
                                    <Link href="/signin">
                                        <Button variant="ghost">Sign In</Button>
                                    </Link>
                                    <Link href="/signup">
                                        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                                            Get Started
                                        </Button>
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
                            <Sparkles className="h-4 w-4" />
                            The Future of Professional Booking
                        </div>
                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
                            Book Sessions with
                            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                {' '}Top Professionals
                            </span>
                        </h1>
                        <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                            Connect with teachers, mentors, therapists, and coaches.
                            Book paid one-on-one sessions and join video calls instantly after payment.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/signup">
                                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-6">
                                    Start Booking
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </Link>
                            <Link href="/browse">
                                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6">
                                    Browse Professionals
                                </Button>
                            </Link>
                        </div>

                        {/* Trust Badges */}
                        <div className="mt-12 flex flex-wrap justify-center gap-8 text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-green-500" />
                                <span>Secure Payments</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Video className="h-5 w-5 text-blue-500" />
                                <span>HD Video Calls</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MessageSquare className="h-5 w-5 text-purple-500" />
                                <span>In-App Messaging</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Star className="h-5 w-5 text-yellow-500" />
                                <span>Verified Professionals</span>
                            </div>
                        </div>
                    </div>

                    {/* Hero Image/Mockup */}
                    <div className="mt-16 relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur-3xl" />
                        <div className="relative bg-gradient-to-b from-muted/50 to-muted rounded-3xl border-2 p-8 shadow-2xl">
                            <div className="grid md:grid-cols-3 gap-6">
                                {/* Sample Provider Cards */}
                                {[
                                    { name: 'Sarah Johnson', role: 'Life Coach', price: 75, rating: 4.9 },
                                    { name: 'Michael Chen', role: 'Business Mentor', price: 120, rating: 5.0 },
                                    { name: 'Emma Williams', role: 'Language Tutor', price: 45, rating: 4.8 },
                                ].map((provider, i) => (
                                    <Card key={i} className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
                                        <CardContent className="p-6">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/20">
                                                    <span className="text-xl font-semibold text-primary">
                                                        {provider.name[0]}
                                                    </span>
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold">{provider.name}</h3>
                                                    <p className="text-sm text-muted-foreground">{provider.role}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1">
                                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                                    <span className="font-medium">{provider.rating}</span>
                                                </div>
                                                <span className="font-semibold text-primary">€{provider.price}/hr</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                            Everything You Need to Connect
                        </h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            A complete platform for booking professional sessions with integrated payments and video calls.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            {
                                icon: Calendar,
                                title: 'Easy Scheduling',
                                description: 'Browse availability and book sessions that fit your schedule. Real-time calendar sync.',
                                color: 'text-blue-500',
                                bg: 'bg-blue-500/10',
                            },
                            {
                                icon: CreditCard,
                                title: 'Secure Payments',
                                description: 'Pay securely with Stripe. Automatic refunds for cancellations. No hidden fees.',
                                color: 'text-green-500',
                                bg: 'bg-green-500/10',
                            },
                            {
                                icon: Video,
                                title: 'Instant Video Calls',
                                description: 'Join HD video sessions directly from your browser. No downloads required.',
                                color: 'text-purple-500',
                                bg: 'bg-purple-500/10',
                            },
                            {
                                icon: Star,
                                title: 'Reviews & Ratings',
                                description: 'Read reviews from real clients. Leave feedback after your session.',
                                color: 'text-yellow-500',
                                bg: 'bg-yellow-500/10',
                            },
                            {
                                icon: Clock,
                                title: 'Flexible Sessions',
                                description: 'Choose session lengths that work for you. 30, 60, or 90-minute options.',
                                color: 'text-orange-500',
                                bg: 'bg-orange-500/10',
                            },
                            {
                                icon: MessageSquare,
                                title: 'In-App Messaging',
                                description: 'Chat directly with your provider before and after sessions. Real-time notifications.',
                                color: 'text-indigo-500',
                                bg: 'bg-indigo-500/10',
                            },
                            {
                                icon: Shield,
                                title: 'Money-Back Guarantee',
                                description: 'Full refund if your session is declined. Partial refund for cancellations.',
                                color: 'text-pink-500',
                                bg: 'bg-pink-500/10',
                            },
                        ].map((feature, i) => (
                            <Card key={i} className="border-2 hover:border-primary/30 transition-all group">
                                <CardContent className="p-6">
                                    <div className={`h-12 w-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                        <feature.icon className={`h-6 w-6 ${feature.color}`} />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                                    <p className="text-muted-foreground">{feature.description}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                            How It Works
                        </h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Get started in minutes. Book your first session today.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                step: '01',
                                title: 'Find Your Pro',
                                description: 'Browse our directory of verified professionals. Filter by expertise, price, and availability.',
                            },
                            {
                                step: '02',
                                title: 'Book & Pay',
                                description: 'Select a time slot and pay securely. Your session is confirmed once the provider accepts.',
                            },
                            {
                                step: '03',
                                title: 'Join the Call',
                                description: 'Get a video call link in your email. Join directly from your browser at session time.',
                            },
                        ].map((item, i) => (
                            <div key={i} className="relative">
                                {i < 2 && (
                                    <div className="hidden md:block absolute top-12 left-[60%] w-[80%] border-t-2 border-dashed border-primary/30" />
                                )}
                                <div className="text-center">
                                    <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/20 mb-6">
                                        <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                            {item.step}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                                    <p className="text-muted-foreground">{item.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* For Professionals Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                                <Users className="h-4 w-4" />
                                For Professionals
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                                Grow Your Practice with BookIt
                            </h2>
                            <p className="text-xl text-muted-foreground mb-8">
                                Join thousands of professionals who use BookIt to manage their bookings,
                                accept payments, and connect with clients worldwide.
                            </p>
                            <ul className="space-y-4 mb-8">
                                {[
                                    'Set your own rates and availability',
                                    'Accept payments directly to your bank',
                                    'Manage bookings from one dashboard',
                                    'Message clients directly in the app',
                                    'Build your reputation with reviews',
                                    'Showcase your work with portfolios',
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3">
                                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                            <Link href="/signup">
                                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                                    Become a Provider
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </Link>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur-2xl" />
                            <Card className="relative border-2">
                                <CardContent className="p-8">
                                    <div className="text-center mb-8">
                                        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/20 mx-auto mb-4">
                                            <span className="text-3xl font-semibold text-primary">S</span>
                                        </div>
                                        <h3 className="text-xl font-semibold">Sarah Johnson</h3>
                                        <p className="text-muted-foreground">Life Coach</p>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div className="p-4 rounded-xl bg-muted/50">
                                            <p className="text-2xl font-bold text-primary">127</p>
                                            <p className="text-sm text-muted-foreground">Sessions</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-muted/50">
                                            <p className="text-2xl font-bold text-primary">4.9</p>
                                            <p className="text-sm text-muted-foreground">Rating</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-muted/50">
                                            <p className="text-2xl font-bold text-primary">€9.5k</p>
                                            <p className="text-sm text-muted-foreground">Earned</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                            Loved by Thousands
                        </h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            See what our users are saying about their experience with BookIt.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                name: 'Alex Rivera',
                                role: 'Student',
                                content: 'Found an amazing Spanish tutor through BookIt. The booking process was seamless and the video quality was excellent!',
                                rating: 5,
                            },
                            {
                                name: 'Jessica Park',
                                role: 'Entrepreneur',
                                content: 'My business mentor has been invaluable. BookIt made it easy to schedule weekly sessions around my busy schedule.',
                                rating: 5,
                            },
                            {
                                name: 'David Thompson',
                                role: 'Professional',
                                content: 'As a therapist, BookIt has streamlined my practice. Easy payments, reliable video calls, and happy clients.',
                                rating: 5,
                            },
                        ].map((testimonial, i) => (
                            <Card key={i} className="border-2">
                                <CardContent className="p-6">
                                    <div className="flex gap-1 mb-4">
                                        {[...Array(testimonial.rating)].map((_, j) => (
                                            <Star key={j} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                                        ))}
                                    </div>
                                    <p className="text-muted-foreground mb-6">&ldquo;{testimonial.content}&rdquo;</p>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                            <span className="font-semibold text-primary">{testimonial.name[0]}</span>
                                        </div>
                                        <div>
                                            <p className="font-semibold">{testimonial.name}</p>
                                            <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-3xl" />
                        <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 sm:p-16">
                            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                                Ready to Get Started?
                            </h2>
                            <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
                                Join BookIt today and connect with professionals who can help you achieve your goals.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link href="/signup">
                                    <Button size="lg" variant="secondary" className="w-full sm:w-auto text-lg px-8 py-6">
                                        Create Free Account
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </Button>
                                </Link>
                                <Link href="/browse">
                                    <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6 bg-transparent text-white border-white hover:bg-white/10">
                                        Browse Professionals
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-4 gap-8 mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <Image
                                    src="/logo.png"
                                    alt="BookIt"
                                    width={32}
                                    height={32}
                                    className="rounded-lg"
                                />
                                <span className="text-lg font-bold">BookIt</span>
                            </div>
                            <p className="text-muted-foreground text-sm">
                                The modern way to book professional sessions online.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Product</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li><Link href="/browse" className="hover:text-foreground transition-colors">Browse Professionals</Link></li>
                                <li><Link href="/signup" className="hover:text-foreground transition-colors">Become a Provider</Link></li>
                                <li><Link href="/signin" className="hover:text-foreground transition-colors">Sign In</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Categories</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li><span className="hover:text-foreground transition-colors cursor-pointer">Tutors</span></li>
                                <li><span className="hover:text-foreground transition-colors cursor-pointer">Coaches</span></li>
                                <li><span className="hover:text-foreground transition-colors cursor-pointer">Mentors</span></li>
                                <li><span className="hover:text-foreground transition-colors cursor-pointer">Therapists</span></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Support</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li><span className="hover:text-foreground transition-colors cursor-pointer">Help Center</span></li>
                                <li><span className="hover:text-foreground transition-colors cursor-pointer">Contact Us</span></li>
                                <li><span className="hover:text-foreground transition-colors cursor-pointer">Privacy Policy</span></li>
                                <li><span className="hover:text-foreground transition-colors cursor-pointer">Terms of Service</span></li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-8 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
                        <p className="text-sm text-muted-foreground">
                            &copy; {new Date().getFullYear()} BookIt. All rights reserved.
                        </p>
                        <div className="flex gap-4">
                            <ThemeToggle />
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}

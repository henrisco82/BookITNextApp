# Bookit - Complete Rebuild Documentation

A comprehensive step-by-step guide to rebuilding the Bookit one-on-one consultation booking platform from scratch.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Prerequisites](#3-prerequisites)
4. [Environment Setup](#4-environment-setup)
5. [Rebuild Guide](#5-rebuild-guide)
   - [Stage 1: Project Setup](#stage-1-project-setup)
   - [Stage 2: Authentication Layer](#stage-2-authentication-layer)
   - [Stage 3: Database Design](#stage-3-database-design)
   - [Stage 4: Booking System Logic](#stage-4-booking-system-logic)
   - [Stage 5: Payments Integration](#stage-5-payments-integration)
   - [Stage 6: Media Handling](#stage-6-media-handling)
   - [Stage 7: Video Meeting System](#stage-7-video-meeting-system)
   - [Stage 8: Email System](#stage-8-email-system)
   - [Stage 9: UI Implementation](#stage-9-ui-implementation)
   - [Stage 10: Deployment](#stage-10-deployment)
6. [Folder Structure](#6-folder-structure)
7. [Scripts & Commands](#7-scripts--commands)
8. [Common Problems](#8-common-problems)
9. [Security Practices](#9-security-practices)
10. [Scaling Recommendations](#10-scaling-recommendations)

---

## 1. Introduction

### What is Bookit?

Bookit is a SaaS platform that enables one-on-one consultation bookings between service providers and clients. Think of it as a specialized Calendly alternative focused on paid consultations with integrated payments, video meetings, and messaging.

### System Goals

- Enable service providers to monetize their expertise through paid consultations
- Provide a seamless booking experience with timezone-aware scheduling
- Handle payments securely with automatic provider payouts
- Facilitate video meetings without requiring additional software
- Maintain communication between providers and clients throughout the booking lifecycle

### Core User Flows

**Provider Flow:**
1. Sign up and complete profile setup (category, pricing, bio)
2. Connect Stripe account for receiving payments
3. Configure weekly availability schedule
4. Receive booking requests and accept/decline them
5. Conduct video consultations via generated meeting links
6. Receive payments automatically to connected Stripe account

**Booker (Client) Flow:**
1. Sign up and complete basic profile
2. Browse providers by category
3. View provider profiles, portfolios, and reviews
4. Select available time slot and complete payment
5. Wait for provider confirmation
6. Join video meeting at scheduled time
7. Leave review after consultation

**Booking Lifecycle:**
```
Payment → Pending → Confirmed → Completed → Reviewed
                 ↘ Declined (Full Refund)
         ↘ Cancelled by Booker (Partial Refund)
```

---

## 2. High-Level Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│                    Next.js App Router                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Provider │  │  Booker  │  │  Browse  │  │ Messages │        │
│  │Dashboard │  │Dashboard │  │Providers │  │  System  │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
└───────┼─────────────┼─────────────┼─────────────┼───────────────┘
        │             │             │             │
        └─────────────┴──────┬──────┴─────────────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                      API ROUTES                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Checkout │  │ Webhook  │  │  Refund  │  │ Onboard  │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
└───────┼─────────────┼─────────────┼─────────────┼───────────────┘
        │             │             │             │
┌───────┴─────────────┴─────────────┴─────────────┴───────────────┐
│                    EXTERNAL SERVICES                             │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  Clerk   │  │ Firebase │  │  Stripe  │  │Cloudinary│        │
│  │  (Auth)  │  │(Database)│  │(Payments)│  │ (Media)  │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                  │
│  ┌──────────┐  ┌──────────┐                                     │
│  │  Jitsi   │  │ EmailJS  │                                     │
│  │ (Video)  │  │ (Email)  │                                     │
│  └──────────┘  └──────────┘                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Frontend Responsibilities

- User interface rendering with React Server Components
- Client-side form handling and validation
- Real-time data subscriptions via Firestore listeners
- Timezone conversion for slot display
- Image uploads to Cloudinary
- Stripe Checkout integration

### Backend Responsibilities (API Routes)

- Stripe webhook processing for payment events
- Stripe Connect account creation and management
- Refund processing with platform fee handling
- Booking creation after successful payment
- Email notifications via EmailJS REST API

### Third-Party Services Integration

| Service | Purpose | Integration Type |
|---------|---------|------------------|
| Clerk | User authentication, profile images | SDK (client + server) |
| Firebase Firestore | Database for all application data | SDK (client + admin) |
| Stripe | Payment processing, provider payouts | SDK + Webhooks |
| Cloudinary | Portfolio image storage and CDN | REST API (unsigned uploads) |
| Jitsi Meet | Video consultations | URL generation (no SDK) |
| EmailJS | Transactional emails | SDK (client) + REST (server) |

### Data Flow: Booking Creation

```
1. Booker selects time slot
          ↓
2. POST /api/stripe/checkout
   - Creates Stripe Checkout Session
   - Includes booking metadata
          ↓
3. Redirect to Stripe Checkout
          ↓
4. Booker completes payment
          ↓
5. Stripe fires webhook → POST /api/stripe/webhook
   - Creates booking in Firestore (status: pending)
   - Generates Jitsi meeting link
   - Sends email notification to provider
          ↓
6. Provider receives notification
          ↓
7. Provider confirms/declines booking
   - Confirm: Update status, notify booker
   - Decline: Trigger full refund, notify booker
```

---

## 3. Prerequisites

### Software Requirements

| Software | Minimum Version | Purpose |
|----------|-----------------|---------|
| Node.js | 18.17.0 | JavaScript runtime |
| npm | 9.0.0 | Package manager |
| Git | 2.30.0 | Version control |
| VS Code (recommended) | Latest | Code editor |
| Stripe CLI | Latest | Webhook testing |

### Accounts to Create

Before starting development, create accounts on these platforms:

1. **Clerk** (https://clerk.com)
   - Free tier available
   - Used for authentication

2. **Firebase** (https://firebase.google.com)
   - Free Spark plan or Blaze plan
   - Used for Firestore database

3. **Stripe** (https://stripe.com)
   - Free to create, fees on transactions
   - Enable Stripe Connect for marketplace payments

4. **Cloudinary** (https://cloudinary.com)
   - Free tier with 25GB storage
   - Used for image uploads

5. **EmailJS** (https://emailjs.com)
   - Free tier with 200 emails/month
   - Used for notifications

6. **Vercel** (https://vercel.com)
   - Free tier for hobby projects
   - Used for deployment

### API Keys Needed

After creating accounts, gather these credentials:

**Clerk:**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

**Firebase:**
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `FIREBASE_CLIENT_EMAIL` (from service account)
- `FIREBASE_PRIVATE_KEY` (from service account)

**Stripe:**
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

**Cloudinary:**
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_API_KEY`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

**EmailJS:**
- `NEXT_PUBLIC_EMAILJS_SERVICE_ID`
- `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY`
- `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID`
- `NEXT_PUBLIC_EMAILJS_BOOKER_TEMPLATE_ID`
- `EMAILJS_PRIVATE_KEY`

---

## 4. Environment Setup

### Step 1: Create Project Directory

```bash
mkdir bookit
cd bookit
```

### Step 2: Initialize Next.js Project

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

When prompted:
- Would you like to use TypeScript? **Yes**
- Would you like to use ESLint? **Yes**
- Would you like to use Tailwind CSS? **Yes**
- Would you like to use `src/` directory? **Yes**
- Would you like to use App Router? **Yes**
- Would you like to use Turbopack? **Yes** (optional)
- Would you like to customize the default import alias? **No** (use @/*)

### Step 3: Install Dependencies

```bash
# Authentication
npm install @clerk/nextjs

# Firebase
npm install firebase firebase-admin

# Payments
npm install stripe @stripe/stripe-js

# Email
npm install @emailjs/browser

# Media
npm install cloudinary

# UI Components (Shadcn)
npx shadcn@latest init

# Date handling
npm install date-fns date-fns-tz

# Icons
npm install lucide-react

# Image gallery
npm install yet-another-react-lightbox

# Utilities
npm install clsx tailwind-merge class-variance-authority
```

When initializing Shadcn:
- Which style would you like to use? **Default**
- Which color would you like to use as base color? **Slate**
- Would you like to use CSS variables for colors? **Yes**

### Step 4: Add Shadcn Components

```bash
npx shadcn@latest add button card input label textarea alert-dialog
```

### Step 5: Create Environment File

Create `.env.local` in project root:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here

# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Firebase Admin (Server-side)
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Key Here\n-----END PRIVATE KEY-----\n"

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_API_KEY=your_api_key
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_preset

# EmailJS
NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_xxx
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=template_xxx
NEXT_PUBLIC_EMAILJS_BOOKER_TEMPLATE_ID=template_yyy
EMAILJS_PRIVATE_KEY=your_private_key
```

### Step 6: Configure Next.js

Update `next.config.ts`:

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.clerk.dev',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
}

export default nextConfig
```

### Step 7: Verify Setup

```bash
npm run dev
```

Navigate to `http://localhost:3000` to confirm the application starts without errors.

---

## 5. Rebuild Guide

### Stage 1: Project Setup

#### 1.1 Create Base Layout Structure

Create the root layout with Clerk provider at `src/app/layout.tsx`:

```typescript
import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Bookit - Book One-on-One Consultations',
  description: 'Connect with experts for personalized consultations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
```

#### 1.2 Define Application Routes

Create the following directory structure under `src/app/`:

```
src/app/
├── layout.tsx                    # Root layout
├── page.tsx                      # Landing page (/)
├── globals.css                   # Global styles
│
├── signin/[[...signin]]/        # Auth: Sign in
│   └── page.tsx
├── signup/[[...signup]]/        # Auth: Sign up
│   └── page.tsx
│
├── dashboard/                    # Main dashboard
│   └── page.tsx
├── profile-setup/               # Initial profile creation
│   └── page.tsx
├── profile/edit/                # Edit profile
│   └── page.tsx
│
├── browse/                      # Browse providers
│   └── page.tsx
├── book/
│   ├── [providerId]/            # Book specific provider
│   │   └── page.tsx
│   └── success/                 # Booking success
│       └── page.tsx
├── my-bookings/                 # View own bookings
│   └── page.tsx
│
├── provider/                    # Provider dashboard
│   ├── page.tsx
│   ├── availability/            # Manage availability
│   │   └── page.tsx
│   └── portfolio/               # Manage portfolio
│       └── page.tsx
│
├── view-provider/[providerId]/  # View provider profile
│   └── page.tsx
├── review/[bookingId]/          # Write review
│   └── page.tsx
│
├── messages/                    # Conversations list
│   ├── page.tsx
│   └── [conversationId]/        # Chat view
│       └── page.tsx
│
└── api/                         # API routes
    ├── bookings/[id]/
    │   └── route.ts
    └── stripe/
        ├── checkout/
        │   └── route.ts
        ├── webhook/
        │   └── route.ts
        ├── onboard/
        │   └── route.ts
        ├── refund/
        │   └── route.ts
        ├── refresh/
        │   └── route.ts
        └── return/
            └── route.ts
```

#### 1.3 Create Utility Functions

Create `src/lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}
```

#### 1.4 Define TypeScript Types

Create `src/types/index.ts`:

```typescript
import { Timestamp } from 'firebase/firestore'

// Provider categories
export const PROVIDER_CATEGORIES = [
  'Language Teacher',
  'Career Coach',
  'Financial Advisor',
  'Personal Trainer',
  'Life Coach',
  'Business Consultant',
  'Mental Health Counselor',
  'Nutritionist',
  'Music Instructor',
  'Art Teacher',
  'Academic Tutor',
  'Legal Consultant',
  'Tech Mentor',
  'Real Estate Advisor',
  'Wedding Planner',
  'Interior Designer',
  'Fitness Coach',
  'Yoga Instructor',
  'Photography Coach',
  'Other',
] as const

export type ProviderCategory = typeof PROVIDER_CATEGORIES[number]

export type UserRole = 'provider' | 'booker' | 'both'

export interface NotificationSettings {
  email: {
    newBookingRequest: boolean
    bookingConfirmed: boolean
    bookingDeclined: boolean
    bookingCancelled: boolean
  }
}

export interface User {
  id: string
  email: string
  displayName: string
  role: UserRole
  category?: ProviderCategory
  timezone: string
  defaultSessionMinutes: number
  bufferMinutes: number
  bio?: string
  imageUrl?: string
  notificationSettings: NotificationSettings
  pricePerSession?: number
  stripeAccountId?: string
  onboardingComplete?: boolean
  createdAt: Date
  updatedAt: Date
}

export type AvailabilityType = 'recurring' | 'exclusion'

export interface Availability {
  id: string
  providerId: string
  type: AvailabilityType
  weekday?: number       // 0-6 (Sun-Sat)
  startTime?: string     // "HH:mm"
  endTime?: string       // "HH:mm"
  date?: string          // "YYYY-MM-DD" for exclusions
  reason?: string
  createdAt: Date
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'rejected'

export interface Booking {
  id: string
  providerId: string
  providerName: string
  bookerId: string
  bookerName: string
  bookerEmail: string
  startUTC: Date
  endUTC: Date
  status: BookingStatus
  sessionMinutes: number
  notes?: string
  priceAtBooking?: number
  paymentIntentId?: string
  meetingLink?: string
  cancelledAt?: Date
  cancelledBy?: 'booker' | 'provider'
  cancellationReason?: string
  refundId?: string
  refundAmount?: number
  refundStatus?: string
  refundType?: 'full' | 'partial'
  refundedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface Review {
  id: string
  bookingId: string
  providerId: string
  bookerId: string
  bookerName: string
  bookerImageUrl?: string
  rating: number    // 1-5
  comment: string
  createdAt: Date
}

export interface PortfolioItem {
  id: string
  providerId: string
  imageUrls: string[]
  title: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

export interface Conversation {
  id: string
  participantIds: string[]
  providerId: string
  bookerId: string
  providerName: string
  bookerName: string
  providerImageUrl?: string
  bookerImageUrl?: string
  bookingId: string
  lastMessage?: string
  lastMessageAt?: Date
  lastMessageSenderId?: string
  unreadCount: Record<string, number>
  createdAt: Date
  updatedAt: Date
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  content: string
  status: 'sent' | 'delivered' | 'read'
  createdAt: Date
}

export interface TimeSlot {
  startUTC: Date
  endUTC: Date
}
```

---

### Stage 2: Authentication Layer

#### 2.1 Configure Clerk

Create `src/middleware.ts`:

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/signin(.*)',
  '/signup(.*)',
  '/api/stripe/webhook',
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

#### 2.2 Create Auth Pages

Create `src/app/signin/[[...signin]]/page.tsx`:

```typescript
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn afterSignInUrl="/dashboard" />
    </div>
  )
}
```

Create `src/app/signup/[[...signup]]/page.tsx`:

```typescript
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp afterSignUpUrl="/profile-setup" />
    </div>
  )
}
```

#### 2.3 Create useCurrentUser Hook

This hook synchronizes Clerk authentication with Firestore user profiles.

Create `src/hooks/useCurrentUser.ts`:

```typescript
'use client'

import { useUser } from '@clerk/nextjs'
import { useState, useEffect, useCallback } from 'react'
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { User, NotificationSettings, UserRole, ProviderCategory } from '@/types'

interface UseCurrentUserReturn {
  user: User | null
  clerkUser: ReturnType<typeof useUser>['user']
  imageUrl: string | null
  isLoading: boolean
  error: Error | null
  needsProfileSetup: boolean
  createProfile: (data: CreateProfileData) => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
}

interface CreateProfileData {
  displayName: string
  role: UserRole
  category?: ProviderCategory
  bio?: string
  pricePerSession?: number
  timezone: string
  defaultSessionMinutes: number
  bufferMinutes: number
}

const defaultNotificationSettings: NotificationSettings = {
  email: {
    newBookingRequest: true,
    bookingConfirmed: true,
    bookingDeclined: true,
    bookingCancelled: true,
  },
}

export function useCurrentUser(): UseCurrentUserReturn {
  const { user: clerkUser, isLoaded } = useUser()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false)

  useEffect(() => {
    if (!isLoaded) return

    if (!clerkUser) {
      setUser(null)
      setIsLoading(false)
      setNeedsProfileSetup(false)
      return
    }

    const userRef = doc(db, 'users', clerkUser.id)

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data()
          setUser({
            id: snapshot.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as User)
          setNeedsProfileSetup(false)
        } else {
          setUser(null)
          setNeedsProfileSetup(true)
        }
        setIsLoading(false)
      },
      (err) => {
        setError(err as Error)
        setIsLoading(false)
      }
    )

    return () => unsubscribe()
  }, [clerkUser, isLoaded])

  const createProfile = useCallback(async (data: CreateProfileData) => {
    if (!clerkUser) throw new Error('Not authenticated')

    const userRef = doc(db, 'users', clerkUser.id)
    const now = serverTimestamp()

    await setDoc(userRef, {
      ...data,
      email: clerkUser.emailAddresses[0]?.emailAddress || '',
      imageUrl: clerkUser.imageUrl,
      notificationSettings: defaultNotificationSettings,
      createdAt: now,
      updatedAt: now,
    })
  }, [clerkUser])

  const updateProfile = useCallback(async (data: Partial<User>) => {
    if (!clerkUser) throw new Error('Not authenticated')

    const userRef = doc(db, 'users', clerkUser.id)
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp(),
    })
  }, [clerkUser])

  return {
    user,
    clerkUser,
    imageUrl: clerkUser?.imageUrl || null,
    isLoading,
    error,
    needsProfileSetup,
    createProfile,
    updateProfile,
  }
}

// Helper hooks for role checking
export function useIsProvider(): boolean {
  const { user } = useCurrentUser()
  return user?.role === 'provider' || user?.role === 'both'
}

export function useIsBooker(): boolean {
  const { user } = useCurrentUser()
  return user?.role === 'booker' || user?.role === 'both'
}
```

#### 2.4 Create Profile Guard Component

Create `src/components/ProfileGuard.tsx`:

```typescript
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'

interface ProfileGuardProps {
  children: React.ReactNode
  requireProvider?: boolean
}

export function ProfileGuard({ children, requireProvider = false }: ProfileGuardProps) {
  const router = useRouter()
  const { user, isLoading, needsProfileSetup } = useCurrentUser()

  useEffect(() => {
    if (isLoading) return

    if (needsProfileSetup) {
      router.push('/profile-setup')
      return
    }

    if (requireProvider && user && user.role === 'booker') {
      router.push('/dashboard')
    }
  }, [isLoading, needsProfileSetup, user, requireProvider, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (needsProfileSetup) return null

  return <>{children}</>
}
```

#### 2.5 Create Profile Setup Page

Create `src/app/profile-setup/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PROVIDER_CATEGORIES, UserRole, ProviderCategory } from '@/types'

export default function ProfileSetupPage() {
  const router = useRouter()
  const { createProfile } = useCurrentUser()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    displayName: '',
    role: 'booker' as UserRole,
    category: '' as ProviderCategory | '',
    bio: '',
    pricePerSession: 25,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    defaultSessionMinutes: 60,
    bufferMinutes: 15,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await createProfile({
        ...formData,
        category: formData.role !== 'booker' ? (formData.category as ProviderCategory) : undefined,
        pricePerSession: formData.role !== 'booker' ? formData.pricePerSession : undefined,
      })
      router.push('/dashboard')
    } catch (error) {
      console.error('Failed to create profile:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const showProviderFields = formData.role === 'provider' || formData.role === 'both'

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Complete Your Profile</h1>
          <p className="text-muted-foreground mt-2">
            Tell us a bit about yourself to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="role">I want to</Label>
            <select
              id="role"
              className="w-full rounded-md border p-2"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
            >
              <option value="booker">Book consultations only</option>
              <option value="provider">Offer consultations only</option>
              <option value="both">Both book and offer consultations</option>
            </select>
          </div>

          {showProviderFields && (
            <>
              <div>
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  className="w-full rounded-md border p-2"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as ProviderCategory })}
                  required
                >
                  <option value="">Select a category</option>
                  {PROVIDER_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="pricePerSession">Price per Session (EUR)</Label>
                <Input
                  id="pricePerSession"
                  type="number"
                  min="1"
                  step="0.01"
                  value={formData.pricePerSession}
                  onChange={(e) => setFormData({ ...formData, pricePerSession: parseFloat(e.target.value) })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell clients about your expertise..."
                  rows={4}
                />
              </div>
            </>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Profile...' : 'Complete Setup'}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

---

### Stage 3: Database Design

#### 3.1 Set Up Firebase Client

Create `src/lib/firebase.ts`:

```typescript
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Initialize Firebase only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
export const db = getFirestore(app)
```

#### 3.2 Set Up Firebase Admin (Server-side)

Create `src/lib/firebase-admin.ts`:

```typescript
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  })
}

export const adminDb = getFirestore()
```

#### 3.3 Create Firestore Collection Helpers

Create `src/lib/firestore.ts`:

```typescript
import {
  collection,
  doc,
  CollectionReference,
  DocumentReference,
  QueryDocumentSnapshot,
  SnapshotOptions,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { User, Availability, Booking, Review, PortfolioItem, Conversation, Message } from '@/types'

// Generic converter factory for timestamp handling
function createConverter<T extends { createdAt: Date; updatedAt?: Date }>() {
  return {
    toFirestore(data: T) {
      const { createdAt, updatedAt, ...rest } = data
      return {
        ...rest,
        createdAt: Timestamp.fromDate(createdAt),
        ...(updatedAt && { updatedAt: Timestamp.fromDate(updatedAt) }),
      }
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T {
      const data = snapshot.data(options)
      return {
        id: snapshot.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
      } as T
    },
  }
}

// Booking converter (handles additional date fields)
const bookingConverter = {
  toFirestore(booking: Booking) {
    const { createdAt, updatedAt, startUTC, endUTC, cancelledAt, refundedAt, ...rest } = booking
    return {
      ...rest,
      createdAt: Timestamp.fromDate(createdAt),
      updatedAt: Timestamp.fromDate(updatedAt),
      startUTC: Timestamp.fromDate(startUTC),
      endUTC: Timestamp.fromDate(endUTC),
      ...(cancelledAt && { cancelledAt: Timestamp.fromDate(cancelledAt) }),
      ...(refundedAt && { refundedAt: Timestamp.fromDate(refundedAt) }),
    }
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Booking {
    const data = snapshot.data(options)
    return {
      id: snapshot.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      startUTC: data.startUTC?.toDate() || new Date(),
      endUTC: data.endUTC?.toDate() || new Date(),
      cancelledAt: data.cancelledAt?.toDate(),
      refundedAt: data.refundedAt?.toDate(),
    } as Booking
  },
}

// Collection references with converters
export const usersCollection = collection(db, 'users').withConverter(createConverter<User>()) as CollectionReference<User>
export const availabilityCollection = collection(db, 'availability').withConverter(createConverter<Availability>()) as CollectionReference<Availability>
export const bookingsCollection = collection(db, 'bookings').withConverter(bookingConverter) as CollectionReference<Booking>
export const reviewsCollection = collection(db, 'reviews').withConverter(createConverter<Review>()) as CollectionReference<Review>
export const portfolioCollection = collection(db, 'portfolio').withConverter(createConverter<PortfolioItem>()) as CollectionReference<PortfolioItem>
export const conversationsCollection = collection(db, 'conversations').withConverter(createConverter<Conversation>()) as CollectionReference<Conversation>
export const messagesCollection = collection(db, 'messages').withConverter(createConverter<Message>()) as CollectionReference<Message>

// Document reference helpers
export const userDoc = (userId: string): DocumentReference<User> =>
  doc(usersCollection, userId)

export const bookingDoc = (bookingId: string): DocumentReference<Booking> =>
  doc(bookingsCollection, bookingId)

export const availabilityDoc = (availabilityId: string): DocumentReference<Availability> =>
  doc(availabilityCollection, availabilityId)

export const reviewDoc = (reviewId: string): DocumentReference<Review> =>
  doc(reviewsCollection, reviewId)

export const portfolioDoc = (portfolioId: string): DocumentReference<PortfolioItem> =>
  doc(portfolioCollection, portfolioId)

export const conversationDoc = (conversationId: string): DocumentReference<Conversation> =>
  doc(conversationsCollection, conversationId)
```

#### 3.4 Firestore Security Rules

Deploy these rules to your Firebase project via the Firebase Console or CLI:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users collection
    match /users/{userId} {
      // Anyone can read provider profiles (for browsing)
      allow read: if true;
      // Only the user can write their own profile
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Availability collection
    match /availability/{availabilityId} {
      // Anyone can read (for booking)
      allow read: if true;
      // Only the provider can manage their availability
      allow write: if request.auth != null &&
        request.auth.uid == resource.data.providerId;
      allow create: if request.auth != null &&
        request.auth.uid == request.resource.data.providerId;
    }

    // Bookings collection
    match /bookings/{bookingId} {
      // Only participants can read
      allow read: if request.auth != null && (
        request.auth.uid == resource.data.providerId ||
        request.auth.uid == resource.data.bookerId
      );
      // Bookings created via webhook (server-side)
      allow create: if false;
      // Participants can update (status changes)
      allow update: if request.auth != null && (
        request.auth.uid == resource.data.providerId ||
        request.auth.uid == resource.data.bookerId
      );
    }

    // Reviews collection
    match /reviews/{reviewId} {
      // Anyone can read reviews
      allow read: if true;
      // Only the booker can create a review
      allow create: if request.auth != null &&
        request.auth.uid == request.resource.data.bookerId;
      // Reviews cannot be edited or deleted
      allow update, delete: if false;
    }

    // Portfolio collection
    match /portfolio/{portfolioId} {
      // Anyone can read portfolios
      allow read: if true;
      // Only the provider can manage their portfolio
      allow write: if request.auth != null &&
        request.auth.uid == resource.data.providerId;
      allow create: if request.auth != null &&
        request.auth.uid == request.resource.data.providerId;
    }

    // Conversations collection
    match /conversations/{conversationId} {
      // Only participants can read/write
      allow read, write: if request.auth != null &&
        request.auth.uid in resource.data.participantIds;
      allow create: if request.auth != null &&
        request.auth.uid in request.resource.data.participantIds;
    }

    // Messages collection
    match /messages/{messageId} {
      // Read if participant in conversation
      allow read: if request.auth != null;
      // Only sender can create message
      allow create: if request.auth != null &&
        request.auth.uid == request.resource.data.senderId;
    }
  }
}
```

#### 3.5 Firestore Indexes

Create these composite indexes in Firebase Console:

```
Collection: bookings
Fields: providerId (Asc), startUTC (Asc)

Collection: bookings
Fields: bookerId (Asc), createdAt (Desc)

Collection: availability
Fields: providerId (Asc), type (Asc)

Collection: reviews
Fields: providerId (Asc), createdAt (Desc)

Collection: portfolio
Fields: providerId (Asc), createdAt (Desc)

Collection: conversations
Fields: participantIds (Array contains), lastMessageAt (Desc)

Collection: messages
Fields: conversationId (Asc), createdAt (Asc)
```

---

### Stage 4: Booking System Logic

#### 4.1 Timezone Utilities

Create `src/lib/timezone.ts`:

```typescript
import { format, parseISO, addMinutes, isBefore, isAfter, startOfDay, addDays } from 'date-fns'
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz'
import type { Booking, TimeSlot } from '@/types'

/**
 * Get the user's browser timezone
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * Format a date in a specific timezone
 */
export function formatInTimezone(date: Date, timezone: string, formatStr: string): string {
  return formatInTimeZone(date, timezone, formatStr)
}

/**
 * Convert local time to UTC
 * @param dateStr - Date string in "YYYY-MM-DD" format
 * @param timeStr - Time string in "HH:mm" format
 * @param timezone - IANA timezone string
 */
export function localTimeToUTC(dateStr: string, timeStr: string, timezone: string): Date {
  const localDateTimeStr = `${dateStr}T${timeStr}:00`
  const localDate = parseISO(localDateTimeStr)
  return fromZonedTime(localDate, timezone)
}

/**
 * Convert UTC date to local time in a specific timezone
 */
export function utcToLocalTime(utcDate: Date, timezone: string): Date {
  return toZonedTime(utcDate, timezone)
}

/**
 * Generate available time slots for a given date
 */
export function generateTimeSlots(
  date: Date,
  startTime: string,          // "HH:mm"
  endTime: string,            // "HH:mm"
  durationMinutes: number,    // Session duration
  bufferMinutes: number,      // Gap between sessions
  timezone: string
): TimeSlot[] {
  const slots: TimeSlot[] = []
  const dateStr = format(date, 'yyyy-MM-dd')

  // Parse start and end times
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)

  // Calculate total minutes from midnight
  let currentMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin

  while (currentMinutes + durationMinutes <= endMinutes) {
    const slotStartTime = `${Math.floor(currentMinutes / 60).toString().padStart(2, '0')}:${(currentMinutes % 60).toString().padStart(2, '0')}`
    const slotEndMinutes = currentMinutes + durationMinutes
    const slotEndTime = `${Math.floor(slotEndMinutes / 60).toString().padStart(2, '0')}:${(slotEndMinutes % 60).toString().padStart(2, '0')}`

    slots.push({
      startUTC: localTimeToUTC(dateStr, slotStartTime, timezone),
      endUTC: localTimeToUTC(dateStr, slotEndTime, timezone),
    })

    // Move to next slot (duration + buffer)
    currentMinutes += durationMinutes + bufferMinutes
  }

  return slots
}

/**
 * Check if a slot conflicts with existing bookings
 */
export function isSlotAvailable(
  slotStart: Date,
  slotEnd: Date,
  existingBookings: Booking[]
): boolean {
  for (const booking of existingBookings) {
    // Skip cancelled/rejected bookings
    if (booking.status === 'cancelled' || booking.status === 'rejected') {
      continue
    }

    // Check for overlap
    const bookingStart = new Date(booking.startUTC)
    const bookingEnd = new Date(booking.endUTC)

    // Overlap exists if: slotStart < bookingEnd AND slotEnd > bookingStart
    if (isBefore(slotStart, bookingEnd) && isAfter(slotEnd, bookingStart)) {
      return false
    }
  }

  return true
}

/**
 * Check if a booking can be cancelled (must be > 1 hour before start)
 */
export function canCancelBooking(bookingStartUTC: Date): boolean {
  const now = new Date()
  const oneHourBefore = addMinutes(bookingStartUTC, -60)
  return isBefore(now, oneHourBefore)
}

/**
 * Get minutes until booking starts
 */
export function getMinutesUntilBooking(bookingStartUTC: Date): number {
  const now = new Date()
  const diffMs = bookingStartUTC.getTime() - now.getTime()
  return Math.floor(diffMs / 60000)
}

/**
 * Check if a date is excluded (provider unavailable)
 */
export function isDateExcluded(
  date: Date,
  exclusions: { date: string }[]
): boolean {
  const dateStr = format(date, 'yyyy-MM-dd')
  return exclusions.some((exc) => exc.date === dateStr)
}

/**
 * Get weekday number (0 = Sunday, 6 = Saturday)
 */
export function getWeekday(date: Date): number {
  return date.getDay()
}

/**
 * Generate dates for the next N days
 */
export function getNextDays(startDate: Date, numDays: number): Date[] {
  const dates: Date[] = []
  for (let i = 0; i < numDays; i++) {
    dates.push(addDays(startOfDay(startDate), i))
  }
  return dates
}
```

#### 4.2 Availability Management

The availability management page allows providers to set recurring weekly schedules and mark specific dates as unavailable. See Stage 9 for the complete UI implementation.

Key concepts:
- **Recurring slots**: Define available hours for each weekday (e.g., Monday 9:00-17:00)
- **Exclusions**: Mark specific dates as unavailable (holidays, time off)
- **Slot generation**: System generates bookable slots based on session duration and buffer time

---

### Stage 5: Payments Integration

#### 5.1 Stripe Client Setup

Create `src/lib/stripe.ts`:

```typescript
import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
})
```

#### 5.2 Stripe Onboarding Route

Create `src/app/api/stripe/onboard/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { stripe } from '@/lib/stripe'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let stripeAccountId = userData.stripeAccountId

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: userData.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
      })

      stripeAccountId = account.id

      await adminDb.collection('users').doc(userId).update({
        stripeAccountId: stripeAccountId,
      })
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/refresh?accountId=${stripeAccountId}`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/return?accountId=${stripeAccountId}`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (error) {
    console.error('Stripe onboard error:', error)
    return NextResponse.json({ error: 'Failed to create onboarding link' }, { status: 500 })
  }
}
```

#### 5.3 Stripe Checkout Route

Create `src/app/api/stripe/checkout/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { stripe } from '@/lib/stripe'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { providerId, startUTC, endUTC, notes, sessionMinutes } = body

    const providerDoc = await adminDb.collection('users').doc(providerId).get()
    const provider = providerDoc.data()

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    if (!provider.stripeAccountId) {
      return NextResponse.json({ error: 'Provider not set up for payments' }, { status: 400 })
    }

    const bookerDoc = await adminDb.collection('users').doc(userId).get()
    const booker = bookerDoc.data()

    if (!booker) {
      return NextResponse.json({ error: 'Booker not found' }, { status: 404 })
    }

    const priceInCents = Math.round((provider.pricePerSession || 25) * 100)
    const platformFee = Math.round(priceInCents * 0.01) // 1% platform fee

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Consultation with ${provider.displayName}`,
              description: `${sessionMinutes}-minute session`,
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/book/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/book/${providerId}`,
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: provider.stripeAccountId,
        },
        metadata: {
          bookerId: userId,
          bookerName: booker.displayName,
          bookerEmail: booker.email,
          providerId: providerId,
          providerName: provider.displayName,
          providerEmail: provider.email,
          startUTC: startUTC,
          endUTC: endUTC,
          notes: notes || '',
          priceAtBooking: provider.pricePerSession?.toString() || '25',
          sessionMinutes: sessionMinutes.toString(),
        },
      },
      customer_email: booker.email,
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
```

#### 5.4 Stripe Webhook Handler

Create `src/app/api/stripe/webhook/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { sendProviderNotificationServer } from '@/lib/email-server'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object

    const paymentIntent = await stripe.paymentIntents.retrieve(
      session.payment_intent as string
    )

    const metadata = paymentIntent.metadata

    const bookingId = `${metadata.providerId}_${metadata.bookerId}_${Date.now()}`
    const meetingLink = `https://meet.jit.si/bookit-${bookingId}`

    await adminDb.collection('bookings').doc(bookingId).set({
      providerId: metadata.providerId,
      providerName: metadata.providerName,
      bookerId: metadata.bookerId,
      bookerName: metadata.bookerName,
      bookerEmail: metadata.bookerEmail,
      startUTC: new Date(metadata.startUTC),
      endUTC: new Date(metadata.endUTC),
      status: 'pending',
      sessionMinutes: parseInt(metadata.sessionMinutes),
      notes: metadata.notes || null,
      priceAtBooking: parseFloat(metadata.priceAtBooking),
      paymentIntentId: paymentIntent.id,
      meetingLink: meetingLink,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    const providerDoc = await adminDb.collection('users').doc(metadata.providerId).get()
    const provider = providerDoc.data()

    if (provider?.notificationSettings?.email?.newBookingRequest !== false) {
      await sendProviderNotificationServer({
        providerEmail: metadata.providerEmail,
        providerName: metadata.providerName,
        bookerName: metadata.bookerName,
        bookerEmail: metadata.bookerEmail,
        startUTC: new Date(metadata.startUTC),
        notes: metadata.notes,
      })
    }
  }

  if (event.type === 'account.updated') {
    const account = event.data.object

    if (account.charges_enabled && account.payouts_enabled) {
      const usersSnapshot = await adminDb
        .collection('users')
        .where('stripeAccountId', '==', account.id)
        .get()

      if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0]
        await userDoc.ref.update({
          onboardingComplete: true,
        })
      }
    }
  }

  return NextResponse.json({ received: true })
}
```

#### 5.5 Stripe Refund Route

Create `src/app/api/stripe/refund/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { stripe } from '@/lib/stripe'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { bookingId, type } = await req.json()

    const bookingDoc = await adminDb.collection('bookings').doc(bookingId).get()
    const booking = bookingDoc.data()

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (userId !== booking.providerId && userId !== booking.bookerId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    if (!booking.paymentIntentId) {
      return NextResponse.json({ error: 'No payment to refund' }, { status: 400 })
    }

    const refundParams: {
      payment_intent: string
      refund_application_fee?: boolean
      reverse_transfer?: boolean
    } = {
      payment_intent: booking.paymentIntentId,
      reverse_transfer: true,
    }

    if (type === 'full') {
      refundParams.refund_application_fee = true
    }

    const refund = await stripe.refunds.create(refundParams)

    await adminDb.collection('bookings').doc(bookingId).update({
      status: 'cancelled',
      cancelledAt: FieldValue.serverTimestamp(),
      cancelledBy: userId === booking.providerId ? 'provider' : 'booker',
      refundId: refund.id,
      refundAmount: refund.amount,
      refundStatus: refund.status,
      refundType: type,
      refundedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true, refundId: refund.id })
  } catch (error) {
    console.error('Refund error:', error)
    return NextResponse.json({ error: 'Failed to process refund' }, { status: 500 })
  }
}
```

#### 5.6 Local Webhook Testing

Install Stripe CLI and run:

```bash
# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Copy the webhook signing secret (whsec_...) to .env.local
```

---

### Stage 6: Media Handling

#### 6.1 Cloudinary Configuration

1. Create a Cloudinary account at https://cloudinary.com

2. Create an unsigned upload preset:
   - Go to Settings > Upload
   - Click "Add upload preset"
   - Set signing mode to "Unsigned"
   - Note the preset name

3. Note your Cloud Name from the dashboard

#### 6.2 Cloudinary Upload Function

Create `src/lib/cloudinary.ts`:

```typescript
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

if (!CLOUD_NAME || !UPLOAD_PRESET) {
  console.warn('Cloudinary environment variables not set')
}

export interface UploadResult {
  secure_url: string
  public_id: string
  width: number
  height: number
}

export async function uploadToCloudinary(file: File): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary not configured')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  )

  if (!response.ok) {
    throw new Error('Failed to upload image')
  }

  const data: UploadResult = await response.json()
  return data.secure_url
}

export async function uploadMultipleToCloudinary(files: File[]): Promise<string[]> {
  const uploadPromises = files.map((file) => uploadToCloudinary(file))
  return Promise.all(uploadPromises)
}
```

---

### Stage 7: Video Meeting System

#### 7.1 Jitsi Integration

Jitsi Meet requires no SDK installation. Meeting links are generated as simple URLs.

#### 7.2 Meeting Link Generation

Meeting links are generated during booking creation (in the webhook handler):

```typescript
const meetingLink = `https://meet.jit.si/bookit-${bookingId}`
```

The `bookingId` ensures each meeting room is unique and secure.

#### 7.3 Meeting Link Display

Display the meeting link for confirmed bookings:

```typescript
{booking.status === 'confirmed' && booking.meetingLink && (
  <a
    href={booking.meetingLink}
    target="_blank"
    rel="noopener noreferrer"
    className="text-primary hover:underline"
  >
    Join Meeting
  </a>
)}
```

---

### Stage 8: Email System

#### 8.1 EmailJS Setup

1. Create an EmailJS account at https://emailjs.com
2. Connect your email service (Gmail, Outlook, etc.)
3. Create email templates for provider and booker notifications

#### 8.2 Client-side Email Function

Create `src/lib/email.ts`:

```typescript
import emailjs from '@emailjs/browser'
import { formatInTimezone } from './timezone'

const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!
const PROVIDER_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!
const BOOKER_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_BOOKER_TEMPLATE_ID!
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!

interface ProviderNotificationParams {
  providerEmail: string
  providerName: string
  bookerName: string
  bookerEmail: string
  startUTC: Date
  timezone: string
  notes?: string
  meetingLink?: string
}

export async function sendProviderNotification(params: ProviderNotificationParams): Promise<void> {
  const { providerEmail, providerName, bookerName, bookerEmail, startUTC, timezone, notes, meetingLink } = params

  const templateParams = {
    to_email: providerEmail,
    provider_name: providerName,
    customer_name: bookerName,
    customer_email: bookerEmail,
    booking_date: formatInTimezone(startUTC, timezone, 'EEEE, MMMM d, yyyy'),
    booking_time: formatInTimezone(startUTC, timezone, 'h:mm a'),
    customer_message: notes || '',
    meeting_link: meetingLink || '',
  }

  await emailjs.send(SERVICE_ID, PROVIDER_TEMPLATE_ID, templateParams, PUBLIC_KEY)
}

interface BookerNotificationParams {
  bookerEmail: string
  bookerName: string
  providerName: string
  startUTC: Date
  timezone: string
  statusMessage: string
  meetingLink?: string
}

export async function sendBookerNotification(params: BookerNotificationParams): Promise<void> {
  const { bookerEmail, bookerName, providerName, startUTC, timezone, statusMessage, meetingLink } = params

  const templateParams = {
    to_email: bookerEmail,
    customer_name: bookerName,
    provider_name: providerName,
    booking_date: formatInTimezone(startUTC, timezone, 'EEEE, MMMM d, yyyy'),
    booking_time: formatInTimezone(startUTC, timezone, 'h:mm a'),
    status_message: statusMessage,
    meeting_link: meetingLink || '',
  }

  await emailjs.send(SERVICE_ID, BOOKER_TEMPLATE_ID, templateParams, PUBLIC_KEY)
}
```

#### 8.3 Server-side Email Function

Create `src/lib/email-server.ts`:

```typescript
const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!
const PROVIDER_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!
const PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY!

interface EmailJSResponse {
  status: number
  text: string
}

async function sendEmailJS(
  templateId: string,
  templateParams: Record<string, string>
): Promise<EmailJSResponse> {
  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      service_id: SERVICE_ID,
      template_id: templateId,
      user_id: PUBLIC_KEY,
      accessToken: PRIVATE_KEY,
      template_params: templateParams,
    }),
  })

  return {
    status: response.status,
    text: await response.text(),
  }
}

interface ProviderNotificationParams {
  providerEmail: string
  providerName: string
  bookerName: string
  bookerEmail: string
  startUTC: Date
  notes?: string
}

export async function sendProviderNotificationServer(
  params: ProviderNotificationParams
): Promise<void> {
  const { providerEmail, providerName, bookerName, bookerEmail, startUTC, notes } = params

  const templateParams = {
    to_email: providerEmail,
    provider_name: providerName,
    customer_name: bookerName,
    customer_email: bookerEmail,
    booking_date: startUTC.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    booking_time: startUTC.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }),
    customer_message: notes || '',
  }

  await sendEmailJS(PROVIDER_TEMPLATE_ID, templateParams)
}
```

---

### Stage 9: UI Implementation

#### 9.1 Header Component

Create `src/components/Header.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { useUser, SignOutButton } from '@clerk/nextjs'
import { useCurrentUser, useIsProvider } from '@/hooks/useCurrentUser'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'

export function Header() {
  const { isSignedIn } = useUser()
  const { user } = useCurrentUser()
  const isProvider = useIsProvider()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Bookit
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {isSignedIn && user && (
              <>
                <Link href="/dashboard" className="hover:text-primary">Dashboard</Link>
                <Link href="/browse" className="hover:text-primary">Browse</Link>
                {isProvider && (
                  <>
                    <Link href="/provider" className="hover:text-primary">Provider Dashboard</Link>
                    <Link href="/provider/availability" className="hover:text-primary">Availability</Link>
                  </>
                )}
                <Link href="/my-bookings" className="hover:text-primary">My Bookings</Link>
                <Link href="/messages" className="hover:text-primary">Messages</Link>
                <Link href="/profile/edit" className="hover:text-primary">Profile</Link>
                <SignOutButton>
                  <Button variant="outline" size="sm">Sign Out</Button>
                </SignOutButton>
              </>
            )}
            {!isSignedIn && (
              <>
                <Link href="/signin">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link href="/signup">
                  <Button>Get Started</Button>
                </Link>
              </>
            )}
          </nav>

          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </header>
  )
}
```

#### 9.2 Additional UI Components

Implement the remaining pages following the same patterns:
- Landing page with hero section and features
- Dashboard with role-aware navigation
- Browse providers with search and filtering
- Booking flow with calendar and time slot selection
- Provider dashboard for managing bookings
- Availability management for providers
- Portfolio management for providers
- Messages and conversations

---

### Stage 10: Deployment

#### 10.1 Vercel Setup

1. Push your code to GitHub, GitLab, or Bitbucket

2. Go to https://vercel.com and sign in

3. Click "Add New Project"

4. Import your repository

5. Configure project settings:
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`

#### 10.2 Environment Variables

In Vercel project settings, add all environment variables from your `.env.local` file.

#### 10.3 Stripe Webhook Configuration

1. Go to Stripe Dashboard > Developers > Webhooks

2. Add endpoint:
   - URL: `https://your-domain.vercel.app/api/stripe/webhook`
   - Events: `checkout.session.completed`, `account.updated`

3. Copy the webhook signing secret to Vercel environment variables

#### 10.4 Domain Setup

1. In Vercel project settings, go to Domains
2. Add your custom domain
3. Configure DNS as instructed
4. Update environment variables and third-party service URLs

---

## 6. Folder Structure

```
src/
├── app/                              # Next.js App Router
│   ├── api/                          # API Routes
│   │   ├── bookings/[id]/route.ts
│   │   └── stripe/
│   │       ├── checkout/route.ts
│   │       ├── webhook/route.ts
│   │       ├── onboard/route.ts
│   │       ├── refund/route.ts
│   │       ├── refresh/route.ts
│   │       └── return/route.ts
│   ├── signin/[[...signin]]/
│   ├── signup/[[...signup]]/
│   ├── dashboard/
│   ├── profile-setup/
│   ├── profile/edit/
│   ├── browse/
│   ├── book/[providerId]/
│   ├── book/success/
│   ├── my-bookings/
│   ├── provider/
│   ├── provider/availability/
│   ├── provider/portfolio/
│   ├── view-provider/[providerId]/
│   ├── review/[bookingId]/
│   ├── messages/
│   ├── messages/[conversationId]/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ui/                           # Shadcn components
│   ├── Header.tsx
│   ├── ProfileGuard.tsx
│   ├── MessageBadge.tsx
│   └── ConfirmDialog.tsx
├── hooks/
│   ├── useCurrentUser.ts
│   └── useConversations.ts
├── lib/
│   ├── firebase.ts
│   ├── firebase-admin.ts
│   ├── firestore.ts
│   ├── stripe.ts
│   ├── cloudinary.ts
│   ├── email.ts
│   ├── email-server.ts
│   ├── timezone.ts
│   └── utils.ts
├── types/
│   └── index.ts
└── middleware.ts
```

---

## 7. Scripts & Commands

### Development

```bash
npm run dev          # Start development server
npm run dev -- -p 3001  # Run on specific port
```

### Building

```bash
npm run build        # Create production build
npm start            # Start production server
```

### Linting

```bash
npm run lint         # Run ESLint
npm run lint -- --fix   # Fix auto-fixable issues
```

### Stripe CLI

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
stripe trigger checkout.session.completed
```

---

## 8. Common Problems

### Stripe Webhooks Locally

**Problem:** Webhooks not reaching local server

**Solution:**
1. Install Stripe CLI
2. Run `stripe listen --forward-to localhost:3000/api/stripe/webhook`
3. Use the provided `whsec_` secret in `.env.local`

### Environment Variable Issues

**Problem:** `FIREBASE_PRIVATE_KEY` not working

**Solution:** In `.env.local`, wrap the key in quotes and use escaped newlines:
```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"
```

### Authentication Redirect Loop

**Problem:** Endless redirect between signin and protected pages

**Solution:**
1. Check Clerk middleware configuration
2. Ensure public routes are properly defined
3. Clear browser cookies

### Build Errors

**Problem:** Type errors in production build

**Solution:**
1. Run `npm run lint` to find issues
2. Fix TypeScript errors before building

---

## 9. Security Practices

### Environment Variables

- Never commit `.env.local` to version control
- Use `NEXT_PUBLIC_` prefix only for client-safe variables
- Rotate keys periodically

### API Protection

- Verify authentication in all API routes
- Validate request bodies
- Rate limit sensitive endpoints

### Firestore Rules

- Require authentication for writes
- Limit access to user's own data
- Validate data structure

### Stripe Webhook Verification

Always verify webhook signatures before processing events.

---

## 10. Scaling Recommendations

### Performance Optimization

1. Use Cloudinary transformations for image thumbnails
2. Implement pagination for large lists
3. Use SWR or React Query for data fetching

### Background Jobs

Consider Vercel Cron Jobs or Firebase Cloud Functions for:
- Reminder emails
- Cleanup tasks
- Analytics

### Monitoring

Implement monitoring for:
- API response times
- Error rates
- Webhook success rates

---

## Conclusion

This documentation provides a complete blueprint for rebuilding the Bookit consultation booking platform. Follow each stage sequentially, test thoroughly at each step, and refer to the troubleshooting section when issues arise.

---

*Documentation generated for Bookit v1.0*

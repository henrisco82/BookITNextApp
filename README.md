# BookIt

A booking application built with React, Vite, Tailwind CSS, and Shadcn UI.

## Tech Stack

- **React 19** with TypeScript
- **Vite** - Build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn UI** - Beautiful, accessible component library
- **React Router** - Client-side routing
- **Local Storage** - Simple authentication state management (for demo purposes)

## Features

- ✅ User sign up with email and password
- ✅ User sign in
- ✅ Protected routes
- ✅ Dashboard page
- ✅ Sign out functionality
- ✅ Beautiful UI with Shadcn components

## Getting Started

### Prerequisites

- Node.js 20.19+ or 22.12+
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
src/
├── components/
│   ├── ui/           # Shadcn UI components (Button, Input, Card, Label)
│   └── ProtectedRoute.tsx
├── contexts/
│   └── AuthContext.tsx    # Authentication state management
├── lib/
│   └── utils.ts      # Utility functions (cn helper)
├── pages/
│   ├── SignIn.tsx    # Sign in page
│   ├── SignUp.tsx    # Sign up page
│   └── Dashboard.tsx # Protected dashboard page
├── App.tsx           # Main app component with routing
└── main.tsx          # Entry point
```

## Usage

1. **Sign Up**: Navigate to `/signup` to create a new account
2. **Sign In**: Navigate to `/signin` to sign in with existing credentials
3. **Dashboard**: After signing in, you'll be redirected to `/dashboard`
4. **Sign Out**: Click the "Sign Out" button on the dashboard

## Notes

- This is a demo application using local storage for authentication
- Passwords are stored in plain text (not secure for production)
- For production use, implement proper backend authentication with hashed passwords and JWT tokens
- User data is stored in browser's local storage

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
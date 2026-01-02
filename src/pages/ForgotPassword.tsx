import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Mail, Lock, AlertCircle, Sparkles, ArrowLeft, Check } from 'lucide-react'

export function ForgotPassword() {
    const [email, setEmail] = useState('')
    const [step, setStep] = useState<'email' | 'reset'>('email')
    const [code, setCode] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const { initiatePasswordReset, completePasswordReset } = useAuth()
    const navigate = useNavigate()

    const handleInitiateReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            await initiatePasswordReset(email)
            setStep('reset')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send reset code')
        } finally {
            setIsLoading(false)
        }
    }

    const handleCompleteReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters')
            return
        }

        setIsLoading(true)

        try {
            await completePasswordReset(code, newPassword)
            navigate('/dashboard')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to reset password')
        } finally {
            setIsLoading(false)
        }
    }

    const passwordRequirements = [
        { label: 'At least 8 characters', met: newPassword.length >= 8 },
        { label: 'Passwords match', met: newPassword === confirmPassword && newPassword.length > 0 },
    ]

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
            </div>

            <div className="absolute top-4 right-4 z-10">
                <ThemeToggle />
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo/Brand Section */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 mb-4 shadow-lg">
                        <Sparkles className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Account Recovery</h1>
                    <p className="text-muted-foreground">Reset your password to regain access</p>
                </div>

                <Card className="border-2 shadow-xl">
                    <CardHeader className="space-y-1 pb-6">
                        <CardTitle className="text-2xl text-center">
                            {step === 'email' ? 'Forgot Password?' : 'Reset Password'}
                        </CardTitle>
                        <CardDescription className="text-center">
                            {step === 'email'
                                ? 'Enter your email to receive a verification code'
                                : 'Enter the code sent to your email and your new password'}
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={step === 'email' ? handleInitiateReset : handleCompleteReset}>
                        <CardContent className="space-y-4">
                            {error && (
                                <div className="flex items-start gap-3 p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                    <span className="flex-1">{error}</span>
                                </div>
                            )}

                            {step === 'email' ? (
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-sm font-medium">
                                        Email Address
                                    </Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            disabled={isLoading}
                                            className="pl-10 h-11"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="code" className="text-sm font-medium">
                                            Verification Code
                                        </Label>
                                        <Input
                                            id="code"
                                            type="text"
                                            placeholder="Enter code"
                                            value={code}
                                            onChange={(e) => setCode(e.target.value)}
                                            required
                                            disabled={isLoading}
                                            className="h-11 text-center text-lg tracking-widest"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="newPassword" className="text-sm font-medium">
                                            New Password
                                        </Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="newPassword"
                                                type="password"
                                                placeholder="••••••••"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                required
                                                disabled={isLoading}
                                                className="pl-10 h-11"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword" className="text-sm font-medium">
                                            Confirm New Password
                                        </Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="confirmPassword"
                                                type="password"
                                                placeholder="••••••••"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                required
                                                disabled={isLoading}
                                                className="pl-10 h-11"
                                            />
                                        </div>
                                    </div>

                                    {/* Password Requirements */}
                                    <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
                                        <p className="text-xs font-medium text-muted-foreground">Password requirements:</p>
                                        {passwordRequirements.map((req, index) => (
                                            <div key={index} className="flex items-center gap-2 text-xs">
                                                <div className={`h-4 w-4 rounded-full flex items-center justify-center ${req.met ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-muted text-muted-foreground'
                                                    }`}>
                                                    {req.met && <Check className="h-3 w-3" />}
                                                </div>
                                                <span className={req.met ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                                                    {req.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </CardContent>

                        <CardFooter className="flex flex-col space-y-4 pt-2">
                            <Button
                                type="submit"
                                className="w-full h-11 gap-2"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                        {step === 'email' ? 'Sending Code...' : 'Resetting Password...'}
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4" />
                                        {step === 'email' ? 'Send Verification Code' : 'Reset Password'}
                                    </>
                                )}
                            </Button>

                            <Link to="/signin" className="w-full">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full h-11 gap-2"
                                    disabled={isLoading}
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Back to Sign In
                                </Button>
                            </Link>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    )
}

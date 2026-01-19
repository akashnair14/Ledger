'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, Suspense } from 'react'
import { Shield, Mail, ArrowRight, Loader2, Lock, Key, UserPlus, LogIn } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import styles from './login.module.css'

function LoginContent() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [authMethod, setAuthMethod] = useState<'magic-link' | 'password'>('magic-link')
    const [isSignUp, setIsSignUp] = useState(false)
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null)
    const router = useRouter()
    const searchParams = useSearchParams()
    const supabase = createClient()

    useEffect(() => {
        const error = searchParams.get('error')
        if (error) {
            setMessage({ text: 'Authentication failed. Please try again.', type: 'error' })
        }
    }, [searchParams])

    const handleGoogleLogin = async () => {
        if (loading) return
        setLoading(true)
        setMessage(null)
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            })

            if (error) {
                setMessage({ text: error.message, type: 'error' })
                setLoading(false)
            }
        } catch (_err) {
            setMessage({ text: 'An unexpected error occurred.', type: 'error' })
            setLoading(false)
        }
    }

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (loading || !email) return
        setLoading(true)
        setMessage(null)

        try {
            if (authMethod === 'magic-link') {
                const { error } = await supabase.auth.signInWithOtp({
                    email,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                    },
                })

                if (error) {
                    setMessage({ text: error.message, type: 'error' })
                } else {
                    setMessage({ text: 'Check your email for the magic link!', type: 'success' })
                    setEmail('')
                }
            } else {
                // Password Auth
                if (isSignUp) {
                    const { error, data } = await supabase.auth.signUp({
                        email,
                        password,
                    })
                    if (error) {
                        setMessage({ text: error.message, type: 'error' })
                    } else if (data.session) {
                        // If session is present immediately (auto-confirm is on)
                        router.replace('/dashboard')
                    } else {
                        // Fallback if session isn't automatically started
                        setMessage({ text: 'Sign up successful! Re-signing in...', type: 'success' })
                        const { error: signInError } = await supabase.auth.signInWithPassword({
                            email,
                            password,
                        })
                        if (signInError) setMessage({ text: signInError.message, type: 'error' })
                        else router.replace('/dashboard')
                    }
                } else {
                    const { error } = await supabase.auth.signInWithPassword({
                        email,
                        password,
                    })
                    if (error) setMessage({ text: error.message, type: 'error' })
                    else router.replace('/dashboard')
                }
            }
        } catch (_err) {
            setMessage({ text: 'An unexpected error occurred.', type: 'error' })
        }
        setLoading(false)
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <div className={styles.logoBox}>
                        <Shield size={32} />
                    </div>
                    <h1 className={styles.title}>Welcome</h1>
                    <p className={styles.subtitle}>Enter your details to access your ledger</p>
                </div>

                <div className={styles.actions}>
                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className={styles.googleBtn}
                    >
                        {loading ? (
                            <Loader2 className="spin" size={18} />
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.04-3.71 1.04-2.85 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                        )}
                        <span>{loading ? 'One moment...' : 'Continue with Google'}</span>
                    </button>

                    <div className={styles.divider}>
                        <div className={styles.line}></div>
                        <span>or with email</span>
                        <div className={styles.line}></div>
                    </div>

                    <div className={styles.methodSelector}>
                        <button
                            className={`${styles.methodBtn} ${authMethod === 'magic-link' ? styles.activeMethod : ''}`}
                            onClick={() => {
                                setAuthMethod('magic-link');
                                setMessage(null);
                                setPassword('');
                            }}
                            type="button"
                        >
                            <Key size={14} /> Magic Link
                        </button>
                        <button
                            className={`${styles.methodBtn} ${authMethod === 'password' ? styles.activeMethod : ''}`}
                            onClick={() => {
                                setAuthMethod('password');
                                setMessage(null);
                            }}
                            type="button"
                        >
                            <Lock size={14} /> Password
                        </button>
                    </div>

                    <form onSubmit={handleEmailLogin} className={styles.form}>
                        <div className={styles.inputGroup}>
                            <Mail size={16} className={styles.inputIcon} />
                            <input
                                type="email"
                                placeholder="Email Address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className={styles.input}
                                disabled={loading}
                            />
                        </div>

                        {authMethod === 'password' && (
                            <div className={styles.inputGroup}>
                                <Lock size={16} className={styles.inputIcon} />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className={styles.input}
                                    disabled={loading}
                                />
                            </div>
                        )}

                        {authMethod === 'password' && !isSignUp && (
                            <Link href="/forgot-password" className={styles.forgotPassword}>
                                Forgot Password?
                            </Link>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !email || (authMethod === 'password' && !password)}
                            className={styles.submitBtn}
                        >
                            {loading ? <Loader2 className="spin" size={18} /> : (
                                isSignUp ? 'Create Account' : 'Sign In'
                            )}
                            {!loading && <ArrowRight size={18} />}
                        </button>

                        {authMethod === 'password' && (
                            <button
                                type="button"
                                className={styles.toggleAuthMode}
                                onClick={() => setIsSignUp(!isSignUp)}
                            >
                                {isSignUp ? (
                                    <><LogIn size={14} /> Already have an account? Sign In</>
                                ) : (
                                    <><UserPlus size={14} /> Need an account? Sign Up</>
                                )}
                            </button>
                        )}
                    </form>
                </div>

                {message && (
                    <div className={`${styles.message} ${message.type === 'error' ? styles.error : styles.success}`}>
                        {message.text}
                    </div>
                )}

                <div className={styles.footer}>
                    <Shield size={12} />
                    <span>Secure Ledger System</span>
                </div>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc' }}>
                <Loader2 className="spin" size={32} color="#0f172a" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    )
}

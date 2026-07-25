'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, Suspense } from 'react'
import { 
  Shield, 
  Mail, 
  ArrowRight, 
  Loader2, 
  Lock, 
  Key, 
  UserPlus, 
  LogIn, 
  Eye, 
  EyeOff, 
  Wifi, 
  Database, 
  FileText, 
  Layers, 
  CheckCircle2, 
  ChevronRight 
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import styles from './login.module.css'

function LoginContent() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [authMethod, setAuthMethod] = useState<'magic-link' | 'password'>('magic-link')
    const [isSignUp, setIsSignUp] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [capsLockActive, setCapsLockActive] = useState(false)
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null)
    const router = useRouter()
    const searchParams = useSearchParams()
    const supabase = createClient()

    useEffect(() => {
        const error = searchParams.get('error')
        if (error) {
            setMessage({ text: 'Authentication failed. Please try again.', type: 'error' })
        }

        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                router.replace('/dashboard');
            }
        };
        checkSession();
    }, [searchParams, supabase.auth, router])

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
        } catch {
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
                if (isSignUp) {
                    const { error, data } = await supabase.auth.signUp({
                        email,
                        password,
                    })
                    if (error) {
                        setMessage({ text: error.message, type: 'error' })
                    } else if (data.session) {
                        router.replace('/dashboard')
                    } else {
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
        } catch {
            setMessage({ text: 'An unexpected error occurred.', type: 'error' })
        }
        setLoading(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (typeof window !== 'undefined') {
            const caps = e.getModifierState && e.getModifierState('CapsLock')
            setCapsLockActive(caps)
        }
    }

    const getPasswordStrength = (pass: string) => {
        if (!pass) return { score: 0, text: '', color: 'rgba(255,255,255,0.05)' }
        let score = 0
        if (pass.length >= 6) score += 1
        if (pass.length >= 10) score += 1
        if (/[A-Z]/.test(pass)) score += 1
        if (/[0-9]/.test(pass)) score += 1
        if (/[^A-Za-z0-9]/.test(pass)) score += 1
        
        let text = 'Weak'
        let color = '#ef4444' // Red
        if (score >= 4) {
            text = 'Strong'
            color = '#10b981' // Green
        } else if (score >= 2) {
            text = 'Medium'
            color = '#f05c38' // Orange
        }
        return { score, text, color }
    }

    const passwordStrength = getPasswordStrength(password)

    return (
        <div className={styles.container}>
            {/* Left Panel: Product Showcase (Desktop Only) */}
            <div className={styles.leftPanel}>
                <Link href="/" className={styles.leftLogo}>
                    <div className={styles.logoIconSmall}>L</div>
                    <span>LedgerManager</span>
                </Link>

                <div className={styles.leftPanelContent}>
                    <h2 className={styles.showcaseHeadline}>
                        Manage Every Business Payment with Confidence
                    </h2>
                    <p className={styles.showcaseSub}>
                        Replace paper ledgers with a secure, offline-first digital ledger built for modern businesses.
                    </p>

                    <div className={styles.showcaseBadges}>
                        <div className={styles.showcaseBadge}>
                            <Wifi size={14} /> Offline First
                        </div>
                        <div className={styles.showcaseBadge}>
                            <Database size={14} /> Secure Cloud Sync
                        </div>
                        <div className={styles.showcaseBadge}>
                            <FileText size={14} /> PDF Statements
                        </div>
                        <div className={styles.showcaseBadge}>
                            <Layers size={14} /> Multi Device Support
                        </div>
                    </div>

                    {/* Dashboard Preview / Floating Cards */}
                    <div className={styles.previewContainer}>
                        <div className={styles.floatingCard}>
                            <span className={styles.previewTitle}>Total Collection</span>
                            <div className={`${styles.previewVal} ${styles.textGreen}`}>₹1,45,200</div>
                            <span className={styles.previewSub}>+18.2% vs last month</span>
                        </div>

                        <div className={styles.floatingCard}>
                            <span className={styles.previewTitle}>Active Customer Credit</span>
                            <div className={`${styles.previewVal} ${styles.textOrange}`}>₹24,800</div>
                            <span className={styles.previewSub}>7 outstanding balances</span>
                        </div>

                        <div className={styles.floatingCard} style={{ width: '310px' }}>
                            <span className={styles.previewTitle}>Recent Logs</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                    <span>Arjun Sharma (Grocery)</span>
                                    <span className={styles.textGreen}>+₹8,500</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                    <span>Rajesh Mehta (Retail)</span>
                                    <span className={styles.textOrange}>-₹4,500</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#64748b', zIndex: 10 }}>
                    © 2026 LedgerManager. Secure offline-first accounting.
                </div>
            </div>

            {/* Right Panel: Authentication Form */}
            <div className={styles.rightPanel}>
                <div className={styles.card}>
                    <div className={styles.header}>
                        <div className={styles.logoBox}>L</div>
                        <h1 className={styles.title}>
                            {isSignUp ? 'Create Account' : 'Welcome Back 👋'}
                        </h1>
                        <p className={styles.subtitle}>
                            {isSignUp 
                              ? 'Create your LedgerManager account and start tracking business transactions in minutes.' 
                              : 'Welcome back! Continue managing your customers and payments.'}
                        </p>
                    </div>

                    <div className={styles.actions}>
                        <button
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className={styles.googleBtn}
                            title="Sign in securely using Google OAuth authentication"
                        >
                            <span className={styles.googleIconWrapper}>
                                <svg width="18" height="18" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.04-3.71 1.04-2.85 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                            </span>
                            <span>{loading ? 'Connecting...' : 'Continue with Google'}</span>
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

                        <form onSubmit={handleEmailLogin} className={styles.form} onKeyDown={handleKeyDown}>
                            <div className={styles.inputGroup}>
                                <Mail size={16} className={styles.inputIcon} />
                                <input
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className={styles.input}
                                    disabled={loading}
                                    aria-label="Email Address"
                                />
                            </div>

                            {authMethod === 'password' && (
                                <>
                                    <div className={styles.inputGroup}>
                                        <Lock size={16} className={styles.inputIcon} />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className={styles.input}
                                            disabled={loading}
                                            aria-label="Password"
                                        />
                                        <div className={styles.inputAccessory}>
                                            {capsLockActive && (
                                                <span className={styles.capsLockBadge}>Caps</span>
                                            )}
                                            <button
                                                type="button"
                                                className={styles.revealPasswordBtn}
                                                onClick={() => setShowPassword(!showPassword)}
                                                aria-label={showPassword ? "Hide password" : "Show password"}
                                            >
                                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {isSignUp && password.length > 0 && (
                                        <div className={styles.strengthContainer}>
                                            <div className={styles.strengthBar}>
                                                <div 
                                                    className={styles.strengthProgress} 
                                                    style={{ 
                                                        width: `${(passwordStrength.score / 5) * 100}%`,
                                                        backgroundColor: passwordStrength.color 
                                                    }}
                                                />
                                            </div>
                                            <span className={styles.strengthText} style={{ color: passwordStrength.color }}>
                                                Password Strength: {passwordStrength.text}
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}

                            {authMethod === 'password' && !isSignUp && (
                                <Link href="/forgot-password" className={styles.forgotPassword} title="Recover your forgotten password">
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

                            <button
                                type="button"
                                className={styles.toggleAuthMode}
                                onClick={() => {
                                    setIsSignUp(!isSignUp);
                                    setMessage(null);
                                }}
                            >
                                {isSignUp ? (
                                    <><LogIn size={14} /> Already have an account? Sign In</>
                                ) : (
                                    <><UserPlus size={14} /> Need an account? Sign Up</>
                                )}
                            </button>
                        </form>
                    </div>

                    {message && (
                        <div className={`${styles.message} ${message.type === 'error' ? styles.error : styles.success}`}>
                            {message.text}
                        </div>
                    )}

                    {/* Secure notice info box */}
                    <div className={styles.securityNoticeCard}>
                        <div className={styles.securityNoticeHeader}>
                            <Lock size={12} className={styles.textOrange} />
                            <span>Secure Authentication</span>
                        </div>
                        <p>Your business logs and customer credit balances are encrypted using modern web standards.</p>
                    </div>

                    {/* Trust badges footer */}
                    <div className={styles.footer}>
                        <div className={styles.footerItem}>
                            <CheckCircle2 size={12} /> <span>256-bit Encryption</span>
                        </div>
                        <div className={styles.footerItem}>
                            <CheckCircle2 size={12} /> <span>Offline First</span>
                        </div>
                        <div className={styles.footerItem}>
                            <CheckCircle2 size={12} /> <span>Cloud Sync</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#06090a' }}>
                <Loader2 className="spin" size={32} color="var(--primary, #f05c38)" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    )
}

'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { Shield, Mail, ArrowRight, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import styles from './forgot-password.module.css'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null)
    const supabase = createClient()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (loading || !email) return
        setLoading(true)
        setMessage(null)

        try {
            // Send reset link directly without validating email existence beforehand
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
            })

            if (error) {
                setMessage({ text: error.message, type: 'error' })
            } else {
                setMessage({ 
                    text: 'If an account exists with this email, a password reset link has been sent.', 
                    type: 'success' 
                })
                setEmail('')
            }
        } catch {
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
                    <h1 className={styles.title}>Forgot Password</h1>
                    <p className={styles.subtitle}>Enter your email to reset your password</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
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
                            aria-label="Email Address"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !email}
                        className={styles.submitBtn}
                    >
                        {loading ? <Loader2 className="spin" size={18} /> : 'Send Reset Link'}
                        {!loading && <ArrowRight size={18} />}
                    </button>
                </form>

                {message && (
                    <div className={`${styles.message} ${message.type === 'error' ? styles.error : styles.success}`}>
                        {message.text}
                    </div>
                )}

                <div className={styles.backLink}>
                    <Link href="/login" className={styles.link}>
                        <ArrowLeft size={16} /> Back to Login
                    </Link>
                </div>

                <div className={styles.footer}>
                    <Shield size={12} />
                    <span>Secure Ledger System</span>
                </div>
            </div>
        </div>
    )
}

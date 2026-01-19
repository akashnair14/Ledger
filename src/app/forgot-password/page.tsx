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
            // 1. Check if user exists first
            const { data: exists, error: checkError } = await supabase.rpc('check_email_exists', {
                email_arg: email
            })

            if (checkError) {
                console.error('RPC Error:', checkError)
                // Fallback if RPC fails or not created yet
            } else if (exists === false) {
                setMessage({
                    text: 'No user found with this email. Please sign up to continue.',
                    type: 'error'
                })
                setLoading(false)
                return
            }

            // 2. Send reset link if user exists
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
            })

            if (error) {
                setMessage({ text: error.message, type: 'error' })
            } else {
                setMessage({ text: 'Check your email for the password reset link!', type: 'success' })
                setEmail('')
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

'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { Shield, Lock, ArrowRight, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import styles from './reset-password.module.css'

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        // Verify we have a session (came from magic link/reset link)
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                setMessage({ text: 'Invalid or expired reset link. Please try again.', type: 'error' })
            }
        }
        checkSession()
    }, [supabase.auth])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (loading || !password) return
        setLoading(true)
        setMessage(null)

        try {
            const { error } = await supabase.auth.updateUser({
                password: password,
            })

            if (error) {
                setMessage({ text: error.message, type: 'error' })
            } else {
                setMessage({ text: 'Password updated successfully! Redirecting...', type: 'success' })
                setTimeout(() => {
                    router.push('/dashboard')
                }, 2000)
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
                    <h1 className={styles.title}>Reset Password</h1>
                    <p className={styles.subtitle}>Enter your new password below</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <Lock size={16} className={styles.inputIcon} />
                        <input
                            type="password"
                            placeholder="New Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className={styles.input}
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !password}
                        className={styles.submitBtn}
                    >
                        {loading ? <Loader2 className="spin" size={18} /> : 'Update Password'}
                        {!loading && <ArrowRight size={18} />}
                    </button>
                </form>

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

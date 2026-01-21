'use client';

import React, { useState, useEffect } from 'react';
import { bioAuth } from '@/lib/auth/biometrics';
import { Fingerprint, Lock, ShieldAlert, Loader2 } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './AppLock.module.css';

interface AppLockProps {
    children: React.ReactNode;
}

export const AppLock: React.FC<AppLockProps> = ({ children }) => {
    const pathname = usePathname();
    const [isLocked, setIsLocked] = useState<boolean>(false);
    const [isChecking, setIsChecking] = useState<boolean>(true);
    const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const isPublic = pathname === '/' || pathname === '/login' || pathname === '/forgot-password' || pathname === '/reset-password' || pathname?.startsWith('/auth') || pathname?.startsWith('/docs');

    const handleUnlock = async () => {
        setIsAuthenticating(true);
        setError(null);
        try {
            const success = await bioAuth.authenticate();
            if (success) {
                setIsLocked(false);
                sessionStorage.setItem('app_unlocked', 'true');
            } else {
                setError('Biometric authentication failed. Please try again.');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
            console.error(err);
        } finally {
            setIsAuthenticating(false);
        }
    };

    useEffect(() => {
        const checkLock = async () => {
            if (isPublic) {
                setIsLocked(false);
                setIsChecking(false);
                return;
            }

            const enabled = await bioAuth.isEnabled();
            if (enabled) {
                const sessionAuth = sessionStorage.getItem('app_unlocked');
                if (sessionAuth === 'true') {
                    setIsLocked(false);
                } else {
                    setIsLocked(true);
                    // Only trigger auto-unlock if we are definitely on a protected page
                    // and not already authenticating
                    if (!isAuthenticating && !isPublic) {
                        handleUnlock();
                    }
                }
            } else {
                setIsLocked(false);
            }
            setIsChecking(false);
        };

        checkLock();
    }, [isPublic, pathname]);

    // We must always render children to avoid hydration mismatches that break event listeners (like logout button)
    // The lock overlay will appear on top if isLocked is true.
    return (
        <>
            {children}
            <AnimatePresence>
                {isLocked && (
                    <motion.div
                        className={styles.overlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className={styles.lockCard}>
                            <div className={styles.iconContainer}>
                                <div className={styles.iconCircle}>
                                    <Lock size={32} className={styles.lockIcon} />
                                </div>
                            </div>

                            <div className={styles.textSection}>
                                <h1>Ledger Secured</h1>
                                <p>Unlock with your biometric credentials to access your financial records.</p>
                            </div>

                            <button
                                className={styles.unlockBtn}
                                onClick={handleUnlock}
                                disabled={isAuthenticating}
                            >
                                {isAuthenticating ? (
                                    <>
                                        <Loader2 size={24} className={styles.spin} />
                                        <span>Authenticating...</span>
                                    </>
                                ) : (
                                    <>
                                        <Fingerprint size={24} />
                                        <span>Unlock Ledger</span>
                                    </>
                                )}
                            </button>

                            {error && (
                                <motion.div
                                    className={styles.errorBox}
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                >
                                    <ShieldAlert size={16} />
                                    <span>{error}</span>
                                </motion.div>
                            )}

                            <div className={styles.footer}>
                                <p>Your data is encrypted and secure.</p>
                                {/* EMERGENCY LOGOUT if biometric fails */}
                                <button
                                    onClick={() => window.location.href = '/auth/signout'}
                                    style={{
                                        marginTop: '1rem',
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--text-dim)',
                                        textDecoration: 'underline',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Log out from this device
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

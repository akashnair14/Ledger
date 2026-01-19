'use client';

import React, { useState, useEffect } from 'react';
import { bioAuth } from '@/lib/auth/biometrics';
import { Fingerprint, Lock, ShieldCheck } from 'lucide-react';
import { usePathname } from 'next/navigation';
import styles from './AppLock.module.css';

interface AppLockProps {
    children: React.ReactNode;
}

export const AppLock: React.FC<AppLockProps> = ({ children }) => {
    const pathname = usePathname();
    const [isLocked, setIsLocked] = useState<boolean>(false);
    const [isChecking, setIsChecking] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const isPublic = pathname === '/' || pathname === '/login' || pathname === '/forgot-password' || pathname === '/reset-password' || pathname?.startsWith('/auth') || pathname?.startsWith('/docs');

    const handleUnlock = async () => {
        setIsChecking(true);
        setError(null);
        const success = await bioAuth.authenticate();
        if (success) {
            setIsLocked(false);
            sessionStorage.setItem('app_unlocked', 'true');
        } else {
            setError('Biometric authentication failed. Please try again.');
        }
        setIsChecking(false);
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
                    handleUnlock();
                }
            }
            setIsChecking(false);
        };

        checkLock();
    }, [isPublic]);





    if (isChecking && !isLocked) return null;

    if (isLocked) {
        return (
            <div className={styles.overlay}>
                <div className={styles.lockCard}>
                    <div className={styles.iconContainer}>
                        <Lock className={styles.lockIcon} size={48} />
                    </div>
                    <h2>Ledger Locked</h2>
                    <p>Verification required to access your financial records.</p>
                    {error && <p className={styles.error}>{error}</p>}
                    <button
                        className={styles.unlockBtn}
                        onClick={handleUnlock}
                        disabled={isChecking}
                    >
                        {isChecking ? 'Verifying...' : (
                            <>
                                <Fingerprint size={24} />
                                <span>Unlock with Biometrics</span>
                            </>
                        )}
                    </button>
                    <div className={styles.footer}>
                        <ShieldCheck size={16} />
                        <span>Secure Device Encryption Active</span>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

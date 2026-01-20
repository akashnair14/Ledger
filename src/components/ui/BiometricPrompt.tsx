'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, X, Fingerprint, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { bioAuth } from '@/lib/auth/biometrics';
import { useToast } from '@/context/ToastContext';
import styles from './BiometricPrompt.module.css';

export function BiometricPrompt() {
    const [isVisible, setIsVisible] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        const checkStatus = async () => {
            const isSupported = await bioAuth.isSupported();
            const isEnabled = await bioAuth.isEnabled();
            const dismissedThisSession = sessionStorage.getItem('bio_prompt_dismissed');

            if (isSupported && !isEnabled && !dismissedThisSession) {
                // Delay showing slightly for better UX
                setTimeout(() => setIsVisible(true), 2000);
            }
        };
        checkStatus();
    }, []);

    const handleEnable = async () => {
        try {
            const success = await bioAuth.register();
            if (success) {
                await bioAuth.setEnabled(true);
                showToast('Biometric lock enabled successfully!', 'success');
                setIsVisible(false);
            } else {
                showToast('Failed to enable biometric lock. Try again.', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('An error occurred during setup.', 'error');
        }
    };

    const handleDismiss = () => {
        sessionStorage.setItem('bio_prompt_dismissed', 'true');
        setIsVisible(false);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className={styles.promptContainer}
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                >
                    <div className={styles.glassCard}>
                        <div className={styles.iconSection}>
                            <div className={styles.iconGlow}>
                                <Fingerprint size={24} className={styles.icon} />
                            </div>
                        </div>

                        <div className={styles.content}>
                            <h3>Secure Your Ledger <Sparkles size={14} className={styles.sparkle} /></h3>
                            <p>Enable Biometric Lock to keep your financial data private.</p>
                        </div>

                        <div className={styles.actions}>
                            <button className={styles.enableBtn} onClick={handleEnable}>
                                <ShieldCheck size={18} /> Enable Now
                            </button>
                            <button className={styles.closeBtn} onClick={handleDismiss} aria-label="Dismiss">
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

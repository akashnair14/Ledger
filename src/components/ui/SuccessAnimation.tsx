'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import styles from './SuccessAnimation.module.css';

interface SuccessAnimationProps {
    isVisible: boolean;
    onComplete: () => void;
    message?: string;
}

export const SuccessAnimation = ({ isVisible, onComplete, message = 'Transaction Saved' }: SuccessAnimationProps) => {
    return (
        <AnimatePresence onExitComplete={onComplete}>
            {isVisible && (
                <div className={styles.overlay}>
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 1.5, opacity: 0 }}
                        transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                        className={styles.card}
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring' }}
                        >
                            <CheckCircle2 size={80} className={styles.icon} />
                        </motion.div>
                        <motion.h2
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            {message}
                        </motion.h2>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

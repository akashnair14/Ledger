'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { motion } from 'framer-motion';
import styles from './Toast.module.css';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
    duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [onClose, duration]);

    const Icon = {
        success: CheckCircle2,
        error: AlertCircle,
        info: Info
    }[type];

    return (
        <motion.div
            className={`${styles.toast} ${styles[type]}`}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
        >
            <div className={styles.iconBox}>
                <Icon size={20} />
            </div>
            <p className={styles.message}>{message}</p>
            <button className={styles.closeBtn} onClick={onClose}>
                <X size={16} />
            </button>
        </motion.div>
    );
};

'use client';

import { useState, useEffect } from 'react';
import { Mic, X, Loader2, Sparkles } from 'lucide-react';
import { useVoice } from '@/hooks/useVoice';
import { parseVoiceCommand, VoiceIntent } from '@/lib/ai/voice-parser';
import { useCustomers } from '@/hooks/useSupabase'; // To find customer by name
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import styles from './VoiceCommandButton.module.css';

export const VoiceCommandButton = () => {
    const { isListening, transcript, error, startListening, stopListening, isSupported } = useVoice();
    const { customers } = useCustomers();
    const router = useRouter();
    const { showToast } = useToast();
    const [showOverlay, setShowOverlay] = useState(false);
    const [processing, setProcessing] = useState(false);

    // Auto-process when listening stops and we have a transcript
    useEffect(() => {
        if (!isListening && showOverlay && transcript && !processing) {
            handleProcess();
        }
    }, [isListening, transcript, showOverlay]);

    const handleStart = () => {
        setShowOverlay(true);
        startListening();
    };

    const handleClose = () => {
        stopListening();
        setShowOverlay(false);
        setProcessing(false);
    };

    const handleProcess = async () => {
        setProcessing(true);
        // Short delay to let user see the final transcript
        await new Promise(r => setTimeout(r, 500));

        const intent = parseVoiceCommand(transcript);
        if (!intent) {
            showToast('Could not understand command', 'error');
            handleClose();
            return;
        }

        // Find Customer
        // Fuzzy match: simple 'includes' for now
        // "Rahul" -> matches "Rahul Sharma"
        if (intent.name === 'Unknown') {
            showToast('Please say a customer name', 'error');
            handleClose();
            return;
        }

        const target = customers?.find(c => c.name.toLowerCase().includes(intent.name.toLowerCase()));

        if (target) {
            // Found! Navigate
            // We'll pass params via URL to be picked up by the page
            const params = new URLSearchParams();
            params.set('quickAdd', 'true');
            params.set('amount', intent.amount.toString());
            params.set('type', intent.type); // 'CREDIT' or 'PAYMENT'
            params.set('note', 'Voice Entry');

            router.push(`/customers/${target.id}?${params.toString()}`);
            showToast(`Opening ${target.name}...`);
        } else {
            showToast(`Customer "${intent.name}" not found`, 'error');
        }

        handleClose();
    };

    if (!isSupported) return null;

    return (
        <>
            <button className={styles.micBtn} onClick={handleStart} aria-label="Voice Command">
                <div className={styles.micIconInner}>
                    <Mic size={24} />
                </div>
            </button>

            {showOverlay && (
                <div className={styles.overlay}>
                    <button className={styles.closeBtn} onClick={handleClose}><X size={24} /></button>

                    <div className={styles.content}>
                        <div className={`${styles.ripple} ${isListening ? styles.active : ''}`}>
                            <Mic size={48} className={styles.overlayIcon} />
                        </div>

                        <h3 className={styles.status}>
                            {processing ? 'Processing...' : (isListening ? 'Listening...' : 'Thinking...')}
                        </h3>

                        <p className={styles.transcript}>
                            {transcript || "Say 'Paid 500 to Rahul'..."}
                        </p>

                        {error && <p className={styles.error}>{error}</p>}
                    </div>
                </div>
            )}
        </>
    );
};

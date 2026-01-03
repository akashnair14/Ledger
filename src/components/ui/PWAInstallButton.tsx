'use client';

import { useState, useEffect } from 'react';
import { Download, Smartphone, Laptop, CheckCircle2 } from 'lucide-react';
import styles from './PWAInstallButton.module.css';

export const PWAInstallButton = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
        }

        const handleBeforeInstallPrompt = (e: any) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            setIsVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        window.addEventListener('appinstalled', () => {
            setIsVisible(false);
            setIsInstalled(true);
            setDeferredPrompt(null);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('User accepted the A2HS prompt');
        } else {
            console.log('User dismissed the A2HS prompt');
        }
        setDeferredPrompt(null);
        setIsVisible(false);
    };

    if (isInstalled) return null;
    if (!isVisible) return null;

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.iconBox}>
                    <Smartphone className={styles.phoneIcon} />
                    <Laptop className={styles.laptopIcon} />
                </div>
                <div className={styles.text}>
                    <h3>Install Ledger Manager</h3>
                    <p>Access your accounts offline and get a better experience.</p>
                </div>
            </div>
            <button className={styles.installBtn} onClick={handleInstallClick}>
                <Download size={18} />
                <span>Install App</span>
            </button>
        </div>
    );
};

'use client';

import { useState, useEffect } from 'react';
import { Download, Smartphone, Laptop } from 'lucide-react';
import { Modal } from './Modal';
import styles from './PWAInstallButton.module.css';

export const PWAInstallButton = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (typeof window !== 'undefined') {
            if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
                setIsInstalled(true);
            }
        }

        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);

            // Show modal automatically if not installed and hasn't been dismissed this session
            const dismissed = sessionStorage.getItem('pwa_prompt_dismissed');
            if (!dismissed) {
                setIsModalOpen(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setIsModalOpen(false);
            setDeferredPrompt(null);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('User accepted the A2HS prompt');
        } else {
            console.log('User dismissed the A2HS prompt');
        }
        setDeferredPrompt(null);
        setIsModalOpen(false);
    };

    const handleClose = () => {
        setIsModalOpen(false);
        sessionStorage.setItem('pwa_prompt_dismissed', 'true');
    };

    if (isInstalled) return null;

    return (
        <Modal
            isOpen={isModalOpen}
            onClose={handleClose}
            title="Install Ledger Manager"
        >
            <div className={styles.modalBody}>
                <div className={styles.iconBoxLarge}>
                    <Smartphone size={48} className={styles.phoneIcon} />
                    <Laptop size={24} className={styles.laptopIcon} />
                </div>
                <div className={styles.modalText}>
                    <p>Experience Ledger Manager as a native application. Get better performance, offline access, and a cleaner interface.</p>
                </div>
                <button className={styles.installBtnModal} onClick={handleInstallClick}>
                    <Download size={20} />
                    <span>Install App</span>
                </button>
            </div>
        </Modal>
    );
};

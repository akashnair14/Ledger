'use client';

import { useState, useEffect } from 'react';
import { Download, Smartphone, Laptop } from 'lucide-react';
import { Modal } from './Modal';
import styles from './PWAInstallButton.module.css';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export const PWAInstallButton = () => {
    const { isInstalled, promptInstall, canInstall } = usePWAInstall();
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        // Show modal automatically if can install and hasn't been dismissed this session
        if (canInstall) {
            const dismissed = sessionStorage.getItem('pwa_prompt_dismissed');
            if (!dismissed) {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setIsModalOpen(true);
            }
        }
    }, [canInstall]);

    const handleInstallClick = async () => {
        await promptInstall();
        setIsModalOpen(false);
    };

    const handleClose = () => {
        setIsModalOpen(false);
        sessionStorage.setItem('pwa_prompt_dismissed', 'true');
    };

    if (isInstalled) return null;
    if (!canInstall && !isModalOpen) return null; // Only show if installable or modal already open

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

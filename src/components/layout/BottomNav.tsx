'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, ReceiptText, Settings, BarChart3, Camera } from 'lucide-react';
import styles from './BottomNav.module.css';
import { VoiceCommandButton } from '../features/VoiceCommandButton';

import React, { memo } from 'react';

const NAV_ITEMS_LEFT = [
    { label: 'Customers', href: '/dashboard', icon: Users },
    { label: 'Transactions', href: '/transactions', icon: ReceiptText },
];

const NAV_ITEMS_RIGHT = [
    { label: 'Kacha Bills', href: '/kacha-bills', icon: Camera },
    { label: 'Settings', href: '/settings', icon: Settings },
];

export const BottomNav = memo(function BottomNav() {
    const pathname = usePathname();

    if (pathname === '/' || pathname === '/login' || pathname?.startsWith('/docs')) return null;

    return (
        <nav className={styles.bottomNav}>
            {NAV_ITEMS_LEFT.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                    >
                        <div className={styles.navItemContent}>
                            <Icon size={24} />
                            <span>{item.label}</span>
                        </div>
                    </Link>
                );
            })}

            <div className={styles.voiceWrapper}>
                <VoiceCommandButton />
            </div>

            {NAV_ITEMS_RIGHT.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                    >
                        <div className={styles.navItemContent}>
                            <Icon size={24} />
                            <span>{item.label}</span>
                        </div>
                    </Link>
                );
            })}
        </nav>
    );
});

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, ReceiptText, Settings, BarChart3 } from 'lucide-react';
import styles from './BottomNav.module.css';
import { VoiceCommandButton } from '../features/VoiceCommandButton';

export const BottomNav = () => {
    const pathname = usePathname();

    const navItems = [
        { label: 'Customers', href: '/dashboard', icon: Users },
        { label: 'Transactions', href: '/transactions', icon: ReceiptText },
        { label: 'Analytics', href: '/analytics', icon: BarChart3 },
        { label: 'Settings', href: '/settings', icon: Settings },
    ];

    if (pathname === '/' || pathname === '/login') return null;

    return (
        <nav className={styles.bottomNav}>
            {navItems.slice(0, 2).map((item) => {
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

            {navItems.slice(2).map((item) => {
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
};

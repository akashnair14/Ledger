'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, ReceiptText, Settings, CreditCard } from 'lucide-react';
import styles from './BottomNav.module.css';

export const BottomNav = () => {
    const pathname = usePathname();

    const navItems = [
        { label: 'Customers', href: '/', icon: Users },
        { label: 'Transactions', href: '/transactions', icon: ReceiptText },
        { label: 'Sync', href: '/sync', icon: CreditCard },
        { label: 'Settings', href: '/settings', icon: Settings },
    ];

    return (
        <nav className={styles.bottomNav}>
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                    >
                        <Icon size={24} />
                        <span>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
};

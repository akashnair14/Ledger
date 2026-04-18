'use client';

import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { GlobalSearch } from '../ui/GlobalSearch';
import { usePathname } from 'next/navigation';
import { PullToRefresh } from './PullToRefresh';
import styles from './Shell.module.css';

export const Shell = ({ children }: { children: React.ReactNode }) => {
    const pathname = usePathname();
    const isPublic = pathname === '/' || pathname === '/login' || pathname === '/forgot-password' || pathname === '/reset-password' || pathname?.startsWith('/auth') || pathname?.startsWith('/docs');

    if (isPublic) {
        return <>{children}</>;
    }

    return (
        <div className={styles.shell}>
            <div className={styles.desktopSidebar}>
                <Sidebar />
            </div>
            <div className={styles.mobileNav}>
                <GlobalSearch />
                <Navbar />
            </div>

            <main className={styles.main}>
                <div className={styles.content}>
                    <PullToRefresh>
                        {children}
                    </PullToRefresh>
                </div>
            </main>

            <div className={styles.mobileNav}>
                <BottomNav />
            </div>
        </div>
    );
};

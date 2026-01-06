'use client';

import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { GlobalSearch } from '../ui/GlobalSearch';
import { usePathname } from 'next/navigation';
import styles from './Shell.module.css';

export const Shell = ({ children }: { children: React.ReactNode }) => {
    const pathname = usePathname();
    const isPublic = pathname === '/' || pathname === '/login';

    return (
        <div className={styles.shell}>
            {!isPublic && (
                <>
                    <div className={styles.desktopSidebar}>
                        <Sidebar />
                    </div>
                    <div className={styles.mobileNav}>
                        <GlobalSearch />
                        <Navbar />
                    </div>
                </>
            )}

            <main className={isPublic ? styles.publicMain : styles.main}>
                <div className={isPublic ? styles.publicContent : styles.content}>
                    {children}
                </div>
            </main>

            <div className={styles.mobileNav}>
                <BottomNav />
            </div>
        </div>
    );
};

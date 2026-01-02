'use client';

import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';
import styles from './Shell.module.css';

export const Shell = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className={styles.shell}>
            <Navbar />
            <main className={styles.main}>
                <div className={styles.content}>
                    {children}
                </div>
            </main>
            <BottomNav />
        </div>
    );
};

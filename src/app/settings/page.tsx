'use client';

import { db, Customer, Transaction } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { FileUp, Settings as SettingsIcon, Trash2, Database, Shield, Fingerprint, ToggleLeft, ToggleRight } from 'lucide-react';
import { exportToCSV, exportToExcel, exportToJSON } from '@/lib/export/generate';
import { importFromCSV } from '@/lib/import/csv';
import { bioAuth } from '@/lib/auth/biometrics';
import { useTheme } from '@/context/ThemeContext';
import { useBook } from '@/context/BookContext';
import { useState, useEffect } from 'react';
import { Palette, Moon, Sun } from 'lucide-react';
import styles from './SettingsPage.module.css';

export default function SettingsPage() {
    const { theme, toggleTheme, primaryColor, setPrimaryColor } = useTheme();
    const { activeBook } = useBook();
    const customers = useLiveQuery(() => db.customers.toArray());
    const transactions = useLiveQuery(() => db.transactions.toArray());
    const [lockEnabled, setLockEnabled] = useState(false);
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        const initSecurity = async () => {
            setIsSupported(await bioAuth.isSupported());
            setLockEnabled(await bioAuth.isEnabled());
        };
        initSecurity();
    }, []);

    const toggleLock = async () => {
        if (!lockEnabled) {
            // Register first
            const success = await bioAuth.register();
            if (success) {
                await bioAuth.setEnabled(true);
                setLockEnabled(true);
                alert('Biometric lock enabled!');
            } else {
                alert('Registration failed. Make sure your device supports biometrics.');
            }
        } else {
            await bioAuth.setEnabled(false);
            setLockEnabled(false);
        }
    };

    const handleExport = (type: 'CSV' | 'JSON' | 'EXCEL') => {
        if (!customers || !transactions) return;
        if (type === 'CSV') exportToCSV(customers, transactions);
        if (type === 'JSON') exportToJSON(customers, transactions);
        if (type === 'EXCEL') exportToExcel(customers, transactions);
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            if (!activeBook) {
                alert('Please select or create a ledger book first.');
                return;
            }
            await importFromCSV(file, activeBook.id);
            alert('Import successful!');
        } catch (err) {
            console.error(err);
            alert('Import failed.');
        }
    };

    const clearData = async () => {
        if (!confirm('This will delete all local data. Are you sure?')) return;
        await db.customers.clear();
        await db.transactions.clear();
        await db.syncMetadata.clear();
        alert('All data cleared.');
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <SettingsIcon size={32} />
                <h1>App Settings</h1>
            </header>

            <section className={styles.section}>
                <h2><Palette size={20} /> Appearance</h2>
                <div className={styles.card}>
                    <div className={styles.row}>
                        <div className={styles.info}>
                            <h3>Application Theme</h3>
                            <p>Switch between light and dark mode.</p>
                        </div>
                        <button className={styles.themeToggle} onClick={toggleTheme}>
                            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                            <span>{theme === 'light' ? 'Dark' : 'Light'} Mode</span>
                        </button>
                    </div>

                    <div className={styles.row}>
                        <div className={styles.info}>
                            <h3>Primary Brand Color</h3>
                            <p>Customize the main accent color of the app.</p>
                        </div>
                        <div className={styles.colorPickerWrapper}>
                            <input
                                type="color"
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                                className={styles.colorPicker}
                            />
                            <span className={styles.colorHex}>{primaryColor.toUpperCase()}</span>
                        </div>
                    </div>
                </div>
            </section>

            <section className={styles.section}>
                <h2><Database size={20} /> Data Management</h2>
                <div className={styles.card}>
                    <div className={styles.row}>
                        <div className={styles.info}>
                            <h3>Export Backup</h3>
                            <p>Download your data for offline storage.</p>
                        </div>
                        <div className={styles.btnGroup}>
                            <button onClick={() => handleExport('CSV')}>CSV</button>
                            <button onClick={() => handleExport('EXCEL')}>Excel</button>
                            <button onClick={() => handleExport('JSON')}>JSON</button>
                        </div>
                    </div>

                    <div className={styles.row}>
                        <div className={styles.info}>
                            <h3>Import Data</h3>
                            <p>Migrate data from other ledger apps via CSV.</p>
                        </div>
                        <label className={styles.importBtn}>
                            <FileUp size={18} /> Import CSV
                            <input type="file" accept=".csv" onChange={handleImport} hidden />
                        </label>
                    </div>
                </div>
            </section>

            <section className={styles.section}>
                <h2><Shield size={20} /> Security</h2>
                <div className={styles.card}>
                    <div className={styles.row}>
                        <div className={styles.info}>
                            <h3>Biometric App Lock</h3>
                            <p>Require fingerprint or FaceID to open the app.</p>
                            {!isSupported && <p className={styles.warning}>Not supported on this device/browser.</p>}
                        </div>
                        <button
                            className={`${styles.toggleBtn} ${lockEnabled ? styles.active : ''}`}
                            onClick={toggleLock}
                            disabled={!isSupported}
                        >
                            {lockEnabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                        </button>
                    </div>
                </div>
            </section>

            <section className={styles.section}>
                <h2><Shield size={20} /> Danger Zone</h2>
                <div className={styles.card}>
                    <div className={styles.row}>
                        <div className={styles.info}>
                            <h3 className={styles.dangerText}>Clear All Data</h3>
                            <p>Wipes all customers and transactions from this device.</p>
                        </div>
                        <button className={styles.dangerBtn} onClick={clearData}>
                            <Trash2 size={18} /> Clear Data
                        </button>
                    </div>
                </div>
            </section>

            <div className={styles.footer}>
                <p>LedgerManager v1.0.0</p>
                <p>Built with ❤️ for Personal Finance</p>
            </div>
        </div>
    );
}

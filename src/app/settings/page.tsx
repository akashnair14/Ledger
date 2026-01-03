'use client';

import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { FileUp, Trash2, Database, Shield, Building2, Upload, ToggleLeft, ToggleRight, Download } from 'lucide-react';
import { exportToCSV, exportToExcel, exportToJSON } from '@/lib/export/generate';
import { importFromCSV } from '@/lib/import/csv';
import { bioAuth } from '@/lib/auth/biometrics';
import { useBook } from '@/context/BookContext';
import { useState, useEffect } from 'react';
import styles from './SettingsPage.module.css';

type Tab = 'PROFILE' | 'DATA' | 'SECURITY';

export default function SettingsPage() {
    const { activeBook } = useBook();
    const customers = useLiveQuery(() => db.customers.toArray());
    const transactions = useLiveQuery(() => db.transactions.toArray());

    // UI State
    const [activeTab, setActiveTab] = useState<Tab>('PROFILE');

    // Security State
    const [lockEnabled, setLockEnabled] = useState(false);
    const [isSupported, setIsSupported] = useState(false);

    // Branding State
    const [businessName, setBusinessName] = useState('');
    const [businessAddress, setBusinessAddress] = useState('');
    const [businessLogo, setBusinessLogo] = useState('');

    useEffect(() => {
        const initSecurity = async () => {
            setIsSupported(await bioAuth.isSupported());
            setLockEnabled(await bioAuth.isEnabled());
        };
        const initBranding = async () => {
            const name = await db.settings.get('business_name');
            const addr = await db.settings.get('business_address');
            const logo = await db.settings.get('business_logo');
            if (name) setBusinessName(name.value);
            if (addr) setBusinessAddress(addr.value);
            if (logo) setBusinessLogo(logo.value);
        };
        initSecurity();
        initBranding();
    }, []);

    const saveBranding = async (key: string, value: string) => {
        await db.settings.put({ key, value });
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            setBusinessLogo(base64);
            await saveBranding('business_logo', base64);
        };
        reader.readAsDataURL(file);
    };

    const toggleLock = async () => {
        if (!lockEnabled) {
            const success = await bioAuth.register();
            if (success) {
                await bioAuth.setEnabled(true);
                setLockEnabled(true);
                alert('Biometric lock enabled!');
            } else {
                alert('Registration failed. Ensure device support.');
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
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert('Import failed.');
        }
    };

    const clearData = async () => {
        if (!confirm('This will delete ALL local data. This cannot be undone. Are you sure?')) return;
        await db.customers.clear();
        await db.transactions.clear();
        await db.syncMetadata.clear();
        alert('All data cleared.');
        window.location.reload();
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Settings</h1>
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'PROFILE' ? styles.active : ''}`}
                        onClick={() => setActiveTab('PROFILE')}
                    >
                        Business Profile
                    </button>
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'DATA' ? styles.active : ''}`}
                        onClick={() => setActiveTab('DATA')}
                    >
                        Data & Backup
                    </button>
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'SECURITY' ? styles.active : ''}`}
                        onClick={() => setActiveTab('SECURITY')}
                    >
                        Security
                    </button>
                </div>
            </header>

            <main className={styles.contentArea}>
                {activeTab === 'PROFILE' && (
                    <section className={styles.section}>
                        <div className={styles.card}>
                            <div className={styles.brandingGrid}>
                                <div className={styles.logoSection}>
                                    <div className={styles.logoPreview}>
                                        {businessLogo ? (
                                            <img src={businessLogo} alt="Business Logo" />
                                        ) : (
                                            <Building2 size={40} />
                                        )}
                                    </div>
                                    <label className={styles.logoUploadBtn}>
                                        <Upload size={16} /> Upload Logo
                                        <input type="file" accept="image/*" onChange={handleLogoUpload} hidden />
                                    </label>
                                </div>
                                <div className={styles.brandingInputs}>
                                    <div className={styles.inputGroup}>
                                        <label>Business Name</label>
                                        <input
                                            type="text"
                                            value={businessName}
                                            onChange={(e) => {
                                                setBusinessName(e.target.value);
                                                saveBranding('business_name', e.target.value);
                                            }}
                                            placeholder="e.g. Akash Enterprises"
                                        />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label>Business Address</label>
                                        <textarea
                                            value={businessAddress}
                                            onChange={(e) => {
                                                setBusinessAddress(e.target.value);
                                                saveBranding('business_address', e.target.value);
                                            }}
                                            placeholder="e.g. 123 Main St, City"
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {activeTab === 'DATA' && (
                    <section className={styles.section}>
                        <div className={styles.card}>
                            <div className={styles.row}>
                                <div className={styles.info}>
                                    <h3>Export Backup</h3>
                                    <p>Download all your data securely.</p>
                                </div>
                                <div className={styles.btnGroup}>
                                    <button className={styles.importBtn} onClick={() => handleExport('CSV')}>
                                        <Download size={16} /> CSV
                                    </button>
                                    <button className={styles.importBtn} onClick={() => handleExport('EXCEL')}>
                                        <Download size={16} /> Excel
                                    </button>
                                    <button className={styles.importBtn} onClick={() => handleExport('JSON')}>
                                        <Database size={16} /> JSON
                                    </button>
                                </div>
                            </div>

                            <div className={styles.row}>
                                <div className={styles.info}>
                                    <h3>Import Data</h3>
                                    <p>Restore from a previous CSV backup.</p>
                                </div>
                                <label className={styles.importBtn}>
                                    <FileUp size={16} /> Import CSV
                                    <input type="file" accept=".csv" onChange={handleImport} hidden />
                                </label>
                            </div>

                            <div className={styles.row}>
                                <div className={styles.info}>
                                    <h3 style={{ color: 'var(--danger)' }}>Reset Application</h3>
                                    <p>Erase all data and start fresh.</p>
                                </div>
                                <button className={styles.dangerBtn} onClick={clearData}>
                                    <Trash2 size={16} /> Clear Everything
                                </button>
                            </div>
                        </div>
                    </section>
                )}

                {activeTab === 'SECURITY' && (
                    <section className={styles.section}>
                        <div className={styles.card}>
                            <div className={styles.row}>
                                <div className={styles.info}>
                                    <h3>Biometric Lock</h3>
                                    <p>Secure app access with Fingerprint/FaceID.</p>
                                    {!isSupported && <p style={{ color: 'var(--warning)', fontSize: '0.75rem', marginTop: 4 }}>Device not supported.</p>}
                                </div>
                                <button
                                    className={`${styles.toggleBtn} ${lockEnabled ? styles.active : ''}`}
                                    onClick={toggleLock}
                                    disabled={!isSupported}
                                >
                                    {lockEnabled ? <ToggleRight size={24} color="white" /> : <ToggleLeft size={24} color="var(--text-dim)" />}
                                </button>
                            </div>
                        </div>
                    </section>
                )}
            </main>

            <div className={styles.footer}>
                <p>LedgerManager v1.1.0 (Pro)</p>
            </div>
        </div>
    );
}

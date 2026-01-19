'use client';

import { db } from '@/lib/db';
import { useCustomers, useTransactions } from '@/hooks/useSupabase';
import { FileUp, Trash2, Database, Shield, Building2, Upload, ToggleLeft, ToggleRight, Download, RefreshCw, LogOut } from 'lucide-react';
import { exportToCSV, exportToExcel, exportToJSON } from '@/lib/export/generate';
import { importFromCSV } from '@/lib/import/csv';
import { bioAuth } from '@/lib/auth/biometrics';
import { useBook } from '@/context/BookContext';
import { useToast } from '@/context/ToastContext';
import { useSettings, saveSetting } from '@/hooks/useSupabase';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';
import styles from './SettingsPage.module.css';

type Tab = 'PROFILE' | 'DATA' | 'SECURITY';

export default function SettingsPage() {
    const { showToast } = useToast();
    const { activeBook } = useBook();
    const { customers, isLoading: customersLoading } = useCustomers();
    const { transactions, isLoading: txnsLoading } = useTransactions();

    // UI State
    const [activeTab, setActiveTab] = useState<Tab>('PROFILE');

    // Security State
    const [lockEnabled, setLockEnabled] = useState(false);
    const [isSupported, setIsSupported] = useState(false);

    // Branding State
    const { settings: cloudSettings, isLoading: settingsLoading } = useSettings();
    const [businessName, setBusinessName] = useState('');
    const [businessAddress, setBusinessAddress] = useState('');
    const [businessLogo, setBusinessLogo] = useState('');
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const initSecurity = async () => {
            setIsSupported(await bioAuth.isSupported());
            setLockEnabled(await bioAuth.isEnabled());
        };
        const getUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        initSecurity();
        getUser();
    }, []);

    useEffect(() => {
        if (!settingsLoading && cloudSettings) {
            if (cloudSettings.business_name) setBusinessName(cloudSettings.business_name);
            if (cloudSettings.business_address) setBusinessAddress(cloudSettings.business_address);
            if (cloudSettings.business_logo) setBusinessLogo(cloudSettings.business_logo);
        }
    }, [settingsLoading, cloudSettings]);

    const saveBrandingLocal = async (key: string, value: string) => {
        await db.settings.put({ key, value });
    };

    const saveBrandingCloud = async (key: string, value: string) => {
        try {
            await saveSetting(key, value);
        } catch (err) {
            console.error('Failed to sync setting to cloud:', err);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            setBusinessLogo(base64);
            await saveBrandingLocal('business_logo', base64);
            await saveBrandingCloud('business_logo', base64);
            showToast('Logo updated and synced!');
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
        if (!customers || !transactions) {
            alert('Data is still loading or unavailable.');
            return;
        }
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
            showToast('Import successful!');
            setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
            console.error(err);
            showToast('Import failed', 'error');
        }
    };

    const clearData = async () => {
        if (!confirm('This will delete ALL local data. Cloud data in Supabase will NOT be affected. Continue?')) return;
        await db.customers.clear();
        await db.transactions.clear();
        await db.syncMetadata.clear();
        showToast('Local cache cleared');
        setTimeout(() => window.location.reload(), 1500);
    };

    const handleSignOut = async () => {
        if (!confirm('Are you sure you want to log out? This will also clear local cache for security.')) return;

        showToast('Signing out and clearing data...');

        try {
            const { createClient } = await import('@/lib/supabase/client');
            const supabase = createClient();

            // 1. Sign out from Supabase
            await supabase.auth.signOut({ scope: 'local' }); // Ensure local session is killed
            await supabase.auth.signOut(); // Global signout

            // 2. Clear local database
            await Promise.all([
                db.customers.clear(),
                db.transactions.clear(),
                db.books.clear(),
                db.attachments.clear(),
                db.syncMetadata.clear(),
                db.settings.clear()
            ]);

            // 3. Clear storage (CRITICAL for PWA Persistence Fix)
            localStorage.removeItem('sb-auth-token'); // Explicitly remove auth token
            sessionStorage.removeItem('app_unlocked'); // Lock the app
            localStorage.clear(); // Clear everything else
            sessionStorage.clear();

            // 4. Redirect to Server Logout (Clears Cookies)
            window.location.href = '/auth/signout';
        } catch (err) {
            console.error('Logout error:', err);
            // Even if error, force clear token
            localStorage.removeItem('sb-auth-token');
            window.location.href = '/auth/signout';
        }
    };

    const isDataLoading = customersLoading || txnsLoading;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleRow}>
                    <h1>Settings</h1>
                    <button className={styles.logoutBtn} onClick={handleSignOut}>
                        <LogOut size={18} />
                        <span>Log Out</span>
                    </button>
                </div>
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
                            <div className={styles.cardHeader}>
                                <Database size={18} />
                                <h2>Account Information</h2>
                            </div>
                            <div className={styles.accountInfo}>
                                <div className={styles.infoRow}>
                                    <span>Logged in as:</span>
                                    <strong>{user?.email || 'Loading...'}</strong>
                                </div>
                                <div className={styles.infoRow}>
                                    <span>Provider:</span>
                                    <span className={styles.providerBadge}>
                                        {user?.app_metadata?.provider || 'Email'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <Building2 size={18} />
                                <h2>Business Branding</h2>
                            </div>
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
                                            onChange={(e) => setBusinessName(e.target.value)}
                                            onBlur={() => {
                                                saveBrandingLocal('business_name', businessName);
                                                saveBrandingCloud('business_name', businessName);
                                                showToast('Business name updated!');
                                            }}
                                            placeholder="e.g. Akash Enterprises"
                                        />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label>Business Address</label>
                                        <textarea
                                            value={businessAddress}
                                            onChange={(e) => setBusinessAddress(e.target.value)}
                                            onBlur={() => {
                                                saveBrandingLocal('business_address', businessAddress);
                                                saveBrandingCloud('business_address', businessAddress);
                                                showToast('Address updated!');
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
                                    <h3>Export Backup (Supabase)</h3>
                                    <p>Download all your cloud data securely.</p>
                                </div>
                                <div className={styles.btnGroup}>
                                    <button className={styles.importBtn} onClick={() => handleExport('CSV')} disabled={isDataLoading}>
                                        {isDataLoading ? <RefreshCw className="spin" size={16} /> : <Download size={16} />} CSV
                                    </button>
                                    <button className={styles.importBtn} onClick={() => handleExport('EXCEL')} disabled={isDataLoading}>
                                        {isDataLoading ? <RefreshCw className="spin" size={16} /> : <Download size={16} />} Excel
                                    </button>
                                    <button className={styles.importBtn} onClick={() => handleExport('JSON')} disabled={isDataLoading}>
                                        {isDataLoading ? <RefreshCw className="spin" size={16} /> : <Database size={16} />} JSON
                                    </button>
                                </div>
                            </div>

                            <div className={styles.row}>
                                <div className={styles.info}>
                                    <h3>Import Data</h3>
                                    <p>Restore to local cache from a CSV backup.</p>
                                </div>
                                <label className={styles.importBtn}>
                                    <FileUp size={16} /> Import CSV
                                    <input type="file" accept=".csv" onChange={handleImport} hidden />
                                </label>
                            </div>

                            <div className={styles.row}>
                                <div className={styles.info}>
                                    <h3 style={{ color: 'var(--danger)' }}>Reset Local Storage</h3>
                                    <p>Erase local cache. Cloud data will remain safe.</p>
                                </div>
                                <button className={styles.dangerBtn} onClick={clearData}>
                                    <Trash2 size={16} /> Clear Cache
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
                <p>LedgerManager v1.2.0 (Supabase Optimized)</p>
            </div>
        </div>
    );
}

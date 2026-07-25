'use client';

import { db, Customer, Transaction } from '@/lib/db';

import { useCustomers, useTransactions } from '@/hooks/useSupabase';
import { FileUp, Trash2, Database, Building2, Upload, ToggleLeft, ToggleRight, Download, RefreshCw, LogOut } from 'lucide-react';
import { exportToCSV, exportToExcel, BackupVariant } from '@/lib/export/generate';

import { importFromCSV, importFromExcel } from '@/lib/import/csv';


import { bioAuth } from '@/lib/auth/biometrics';
import { useBook } from '@/context/BookContext';
import { useToast } from '@/context/ToastContext';
import { useSettings, saveSetting } from '@/hooks/useSupabase';
import { createClient, resetClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import styles from './SettingsPage.module.css';

type Tab = 'PROFILE' | 'DATA' | 'SECURITY' | 'PREFERENCES';

export default function SettingsPage() {
    const { showToast } = useToast();
    const { activeBook, books } = useBook();
    const { customers, isLoading: customersLoading } = useCustomers();
    const { transactions, isLoading: txnsLoading } = useTransactions();

    // UI State
    const [activeTab, setActiveTab] = useState<Tab>('PROFILE');
    const [selectedExportBookId, setSelectedExportBookId] = useState<string>('ACTIVE');
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);

    // Security State

    const [lockEnabled, setLockEnabled] = useState(false);
    const [isSupported, setIsSupported] = useState(false);

    // Branding State
    const { settings: cloudSettings, isLoading: settingsLoading } = useSettings();
    const [businessName, setBusinessName] = useState('');
    const [businessAddress, setBusinessAddress] = useState('');
    const [businessLogo, setBusinessLogo] = useState('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const initSecurity = async () => {
            try {
                setIsSupported(await bioAuth.isSupported());
                setLockEnabled(await bioAuth.isEnabled());
            } catch (e) { console.error('Security init error:', e); }
        };
        const fetchUser = async () => {
            const supabase = createClient();
            try {
                // Try to get session first (fast, local)
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    setUser(session.user);
                }

                // Then verify with getUser (network call)
                // We don't block on this if we already have the session user
                const { data: { user } } = await supabase.auth.getUser();
                if (user) setUser(user);
                else if (!session?.user) setUser(undefined); // Explicitly no user
            } catch (err) {
                console.error('Fetch user error:', err);
                setUser(undefined);
            }
        };
        initSecurity();
        fetchUser();
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

    const showPaymentModeCredit = cloudSettings.pref_show_payment_mode_credit !== 'false';
    const showPaymentModeDebit = cloudSettings.pref_show_payment_mode_debit !== 'false';
    const showEntryDateCredit = cloudSettings.pref_show_entry_date_credit !== 'false';
    const showEntryDateDebit = cloudSettings.pref_show_entry_date_debit !== 'false';
    const showInvoiceNoCredit = cloudSettings.pref_show_invoice_no_credit !== 'false';
    const showInvoiceNoDebit = cloudSettings.pref_show_invoice_no_debit !== 'false';
    const showNoteCredit = cloudSettings.pref_show_note_credit !== 'false';
    const showNoteDebit = cloudSettings.pref_show_note_debit !== 'false';
    const showAttachmentCredit = cloudSettings.pref_show_attachment_credit !== 'false';
    const showAttachmentDebit = cloudSettings.pref_show_attachment_debit !== 'false';

    const togglePref = async (key: string, currentValue: boolean) => {
        const newValue = (!currentValue).toString();
        await saveBrandingLocal(key, newValue);
        await saveBrandingCloud(key, newValue);
        showToast('Preference updated!');
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
                showToast('Biometric lock enabled!');
            } else {
                showToast('Registration failed. Ensure device support.', 'error');
            }
        } else {
            await bioAuth.setEnabled(false);
            setLockEnabled(false);
        }
    };

    const handleExport = (type: 'CSV' | 'EXCEL', variant: BackupVariant = 'FULL') => {
        if (!customers || !transactions) {
            showToast('Data is still loading or unavailable.', 'error');
            return;
        }

        const bookId = selectedExportBookId === 'ACTIVE' ? activeBook?.id : selectedExportBookId;

        if (selectedExportBookId === 'ACTIVE' && !activeBook) {
            showToast('No active ledger selected.', 'error');
            return;
        }

        // Filter data based on selection
        const activeBookIds = new Set(books.map(b => b.id));
        let filteredCustomers = (customers as Customer[]).filter(c => c.isDeleted === 0 && activeBookIds.has(c.bookId));
        let filteredTransactions = (transactions as Transaction[]).filter(t => t.isDeleted === 0 && activeBookIds.has(t.bookId));

        if (bookId !== 'ALL') {
            const targetId = bookId === 'ACTIVE' ? activeBook?.id : bookId;
            filteredCustomers = filteredCustomers.filter(c => c.bookId === targetId);
            filteredTransactions = filteredTransactions.filter(t => t.bookId === targetId);
        }


        if (filteredCustomers.length === 0 && filteredTransactions.length === 0) {
            showToast('No data available for the selected ledger.', 'error');
            return;
        }

        const selectedBookName = bookId === 'ALL' ? 'All Ledgers' : (books.find(b => b.id === bookId)?.name || activeBook?.name || 'Ledger');

        if (type === 'CSV') exportToCSV(filteredCustomers, filteredTransactions);
        if (type === 'EXCEL') exportToExcel(filteredCustomers, filteredTransactions, variant);
        showToast(`${variant.replace('_', ' ')} backup started for ${selectedBookName}!`);
    };




    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            if (!activeBook) {
                showToast('Please select or create a ledger book first.', 'error');
                return;
            }

            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                await importFromExcel(file, activeBook.id);
            } else {
                await importFromCSV(file, activeBook.id);
            }



            showToast('Import successful!');
            setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
            console.error(err);
            showToast('Import failed', 'error');
        }
    };


    const clearData = () => {
        setIsClearModalOpen(true);
    };

    const handleConfirmClear = async () => {
        setIsClearModalOpen(false);
        await db.customers.clear();
        await db.transactions.clear();
        await db.syncMetadata.clear();
        showToast('Local cache cleared');
        setTimeout(() => window.location.reload(), 1500);
    };

    const handleSignOut = async () => {
        showToast('Signing out...');

        try {
            const supabase = createClient();

            // 1. Sign out on client (clears LocalStorage and notifies server)
            await supabase.auth.signOut();

            // 2. Clear all storage types
            localStorage.clear();
            sessionStorage.clear();

            // 3. Clear all IndexedDB databases (Critical for PWA)
            try {
                const databases = await window.indexedDB.databases();
                for (const dbInfo of databases) {
                    if (dbInfo.name) {
                        window.indexedDB.deleteDatabase(dbInfo.name);
                    }
                }
            } catch (e) {
                console.error('Failed to clear IndexedDB:', e);
            }

            // 4. Clear Service Worker caches (Critical for PWA auth state)
            try {
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map(name => caches.delete(name)));
                }
            } catch (e) {
                console.error('Failed to clear caches:', e);
            }

            // 5. Reset the singleton Supabase client to destroy stale state
            resetClient();

            // 6. Force a server logout via POST
            await fetch('/auth/signout', { method: 'POST' });
            window.location.href = '/login';
        } catch (err) {
            console.error('Logout error:', err);
            // Fallback: Still try to reset and redirect
            resetClient();
            try {
                await fetch('/auth/signout', { method: 'POST' });
            } catch {}
            window.location.href = '/login';
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
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'PREFERENCES' ? styles.active : ''}`}
                        onClick={() => setActiveTab('PREFERENCES')}
                    >
                        Preferences
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
                                            // eslint-disable-next-line @next/next/no-img-element
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
                            <div className={styles.cardHeader}>
                                <Database size={18} />
                                <h2>Backup & Export</h2>
                            </div>

                            {books.length > 0 ? (
                                <div className={styles.exportControls}>
                                    <div className={styles.inputGroup}>
                                        <label>Select Source Ledger:</label>
                                        <select
                                            value={selectedExportBookId}
                                            onChange={(e) => setSelectedExportBookId(e.target.value)}
                                            className={styles.bookSelect}
                                        >
                                            <option value="ACTIVE">Current: {activeBook?.name || 'None'}</option>
                                            <optgroup label="Other Ledgers">
                                                {books.filter(b => b.id !== activeBook?.id).map(b => (
                                                    <option key={b.id} value={b.id}>{b.name}</option>
                                                ))}
                                            </optgroup>
                                            <option value="ALL">Entire Account (All Ledgers)</option>
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <div className={styles.noBooksMessage}>
                                    <p>Create a ledger book to enable backup options.</p>
                                </div>
                            )}

                            <div className={`${styles.backupGrid} ${books.length === 0 ? styles.disabled : ''}`}>
                                <div className={styles.backupItem}>

                                    <div className={styles.info}>
                                        <h3>Full Ledger Backup</h3>
                                        <p>Comprehensive backup of all customers, suppliers, and transactions.</p>
                                    </div>
                                    <div className={styles.btnGroup}>
                                        <button className={styles.importBtn} onClick={() => handleExport('EXCEL', 'FULL')} disabled={isDataLoading}>
                                            <Download size={16} /> Export Excel (Full)
                                        </button>
                                    </div>
                                </div>

                                <div className={styles.backupItem}>
                                    <div className={styles.info}>
                                        <h3>Customers Only</h3>
                                        <p>Export only your customer list and their respective transactions.</p>
                                    </div>
                                    <div className={styles.btnGroup}>
                                        <button className={styles.importBtn} onClick={() => handleExport('EXCEL', 'CUSTOMERS_ALL')} disabled={isDataLoading}>
                                            With Txns
                                        </button>
                                        <button className={styles.importBtn} onClick={() => handleExport('EXCEL', 'CUSTOMERS_ONLY')} disabled={isDataLoading}>
                                            List Only
                                        </button>
                                    </div>
                                </div>

                                <div className={styles.backupItem}>
                                    <div className={styles.info}>
                                        <h3>Suppliers Only</h3>
                                        <p>Export only your supplier list and their respective transactions.</p>
                                    </div>
                                    <div className={styles.btnGroup}>
                                        <button className={styles.importBtn} onClick={() => handleExport('EXCEL', 'SUPPLIERS_ALL')} disabled={isDataLoading}>
                                            With Txns
                                        </button>
                                        <button className={styles.importBtn} onClick={() => handleExport('EXCEL', 'SUPPLIERS_ONLY')} disabled={isDataLoading}>
                                            List Only
                                        </button>
                                    </div>
                                </div>
                            </div>

                        </div>

                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <Upload size={18} />
                                <h2>Restore & Maintenance</h2>
                            </div>

                            <div className={styles.row}>
                                <div className={styles.info}>
                                    <h3>Import Data</h3>
                                    <p>Restore from an Excel (.xlsx) or CSV backup file.</p>
                                </div>
                                <label className={styles.importBtn}>
                                    <FileUp size={16} /> Select Excel/CSV
                                    <input type="file" accept=".csv,.xlsx,.xls" onChange={handleImport} hidden />
                                </label>

                            </div>

                            <div className={styles.row}>
                                <div className={styles.info}>
                                    <h3 style={{ color: 'var(--danger)' }}>Reset Local Cache</h3>
                                    <p>Safety erase local data. Cloud data remains safe.</p>
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

                {activeTab === 'PREFERENCES' && (
                    <section className={styles.section}>
                        {/* CREDIT ENTRIES CARD */}
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <Building2 size={18} />
                                <h2>Credit Entries (Give / Purchase)</h2>
                            </div>
                            <p style={{ padding: '0 16px', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '8px' }}>
                                Optional fields visible when recording credit or purchase entries.
                            </p>
                            <div style={{ marginTop: '16px' }}>
                                <div className={styles.row}>
                                    <div className={styles.info}>
                                        <h3>Payment Mode</h3>
                                        <p>Select payment modes (e.g. Cash, UPI) for credit entries.</p>
                                    </div>
                                    <button
                                        className={`${styles.toggleBtn} ${showPaymentModeCredit ? styles.active : ''}`}
                                        onClick={() => togglePref('pref_show_payment_mode_credit', showPaymentModeCredit)}
                                    >
                                        {showPaymentModeCredit ? <ToggleRight size={24} color="white" /> : <ToggleLeft size={24} color="var(--text-dim)" />}
                                    </button>
                                </div>
                                <div className={styles.row}>
                                    <div className={styles.info}>
                                        <h3>Entry Date</h3>
                                        <p>Select custom entry date for credit entries.</p>
                                    </div>
                                    <button
                                        className={`${styles.toggleBtn} ${showEntryDateCredit ? styles.active : ''}`}
                                        onClick={() => togglePref('pref_show_entry_date_credit', showEntryDateCredit)}
                                    >
                                        {showEntryDateCredit ? <ToggleRight size={24} color="white" /> : <ToggleLeft size={24} color="var(--text-dim)" />}
                                    </button>
                                </div>
                                <div className={styles.row}>
                                    <div className={styles.info}>
                                        <h3>Invoice / Reference #</h3>
                                        <p>Add reference numbers for credit entries.</p>
                                    </div>
                                    <button
                                        className={`${styles.toggleBtn} ${showInvoiceNoCredit ? styles.active : ''}`}
                                        onClick={() => togglePref('pref_show_invoice_no_credit', showInvoiceNoCredit)}
                                    >
                                        {showInvoiceNoCredit ? <ToggleRight size={24} color="white" /> : <ToggleLeft size={24} color="var(--text-dim)" />}
                                    </button>
                                </div>
                                <div className={styles.row}>
                                    <div className={styles.info}>
                                        <h3>Notes</h3>
                                        <p>Add description notes for credit entries.</p>
                                    </div>
                                    <button
                                        className={`${styles.toggleBtn} ${showNoteCredit ? styles.active : ''}`}
                                        onClick={() => togglePref('pref_show_note_credit', showNoteCredit)}
                                    >
                                        {showNoteCredit ? <ToggleRight size={24} color="white" /> : <ToggleLeft size={24} color="var(--text-dim)" />}
                                    </button>
                                </div>
                                <div className={styles.row}>
                                    <div className={styles.info}>
                                        <h3>Attachments & OCR Scan</h3>
                                        <p>Attach documents or scan receipts for credit entries.</p>
                                    </div>
                                    <button
                                        className={`${styles.toggleBtn} ${showAttachmentCredit ? styles.active : ''}`}
                                        onClick={() => togglePref('pref_show_attachment_credit', showAttachmentCredit)}
                                    >
                                        {showAttachmentCredit ? <ToggleRight size={24} color="white" /> : <ToggleLeft size={24} color="var(--text-dim)" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* DEBIT ENTRIES CARD */}
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <Building2 size={18} />
                                <h2>Debit Entries (Receive / Payment)</h2>
                            </div>
                            <p style={{ padding: '0 16px', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '8px' }}>
                                Optional fields visible when recording payments or debit entries.
                            </p>
                            <div style={{ marginTop: '16px' }}>
                                <div className={styles.row}>
                                    <div className={styles.info}>
                                        <h3>Payment Mode</h3>
                                        <p>Select payment modes (e.g. Cash, UPI) for debit entries.</p>
                                    </div>
                                    <button
                                        className={`${styles.toggleBtn} ${showPaymentModeDebit ? styles.active : ''}`}
                                        onClick={() => togglePref('pref_show_payment_mode_debit', showPaymentModeDebit)}
                                    >
                                        {showPaymentModeDebit ? <ToggleRight size={24} color="white" /> : <ToggleLeft size={24} color="var(--text-dim)" />}
                                    </button>
                                </div>
                                <div className={styles.row}>
                                    <div className={styles.info}>
                                        <h3>Entry Date</h3>
                                        <p>Select custom entry date for debit entries.</p>
                                    </div>
                                    <button
                                        className={`${styles.toggleBtn} ${showEntryDateDebit ? styles.active : ''}`}
                                        onClick={() => togglePref('pref_show_entry_date_debit', showEntryDateDebit)}
                                    >
                                        {showEntryDateDebit ? <ToggleRight size={24} color="white" /> : <ToggleLeft size={24} color="var(--text-dim)" />}
                                    </button>
                                </div>
                                <div className={styles.row}>
                                    <div className={styles.info}>
                                        <h3>Invoice / Reference #</h3>
                                        <p>Add reference numbers for debit entries.</p>
                                    </div>
                                    <button
                                        className={`${styles.toggleBtn} ${showInvoiceNoDebit ? styles.active : ''}`}
                                        onClick={() => togglePref('pref_show_invoice_no_debit', showInvoiceNoDebit)}
                                    >
                                        {showInvoiceNoDebit ? <ToggleRight size={24} color="white" /> : <ToggleLeft size={24} color="var(--text-dim)" />}
                                    </button>
                                </div>
                                <div className={styles.row}>
                                    <div className={styles.info}>
                                        <h3>Notes</h3>
                                        <p>Add description notes for debit entries.</p>
                                    </div>
                                    <button
                                        className={`${styles.toggleBtn} ${showNoteDebit ? styles.active : ''}`}
                                        onClick={() => togglePref('pref_show_note_debit', showNoteDebit)}
                                    >
                                        {showNoteDebit ? <ToggleRight size={24} color="white" /> : <ToggleLeft size={24} color="var(--text-dim)" />}
                                    </button>
                                </div>
                                <div className={styles.row}>
                                    <div className={styles.info}>
                                        <h3>Attachments & OCR Scan</h3>
                                        <p>Attach documents or scan receipts for debit entries.</p>
                                    </div>
                                    <button
                                        className={`${styles.toggleBtn} ${showAttachmentDebit ? styles.active : ''}`}
                                        onClick={() => togglePref('pref_show_attachment_debit', showAttachmentDebit)}
                                    >
                                        {showAttachmentDebit ? <ToggleRight size={24} color="white" /> : <ToggleLeft size={24} color="var(--text-dim)" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                )}
            </main>

            <div className={styles.footer}>
                <p>LedgerManager v1.2.0 (Supabase Optimized)</p>
            </div>

            <Modal
                isOpen={isClearModalOpen}
                onClose={() => setIsClearModalOpen(false)}
                title="Reset Local Cache"
            >
                <div style={{ padding: '0.5rem', color: 'var(--text-main)' }}>
                    <p style={{ marginBottom: '1.5rem', fontSize: '0.95rem', lineHeight: '1.5' }}>
                        This will delete ALL local data. Cloud data in Supabase will NOT be affected. Continue?
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button 
                            className={styles.secondaryBtn} 
                            onClick={() => setIsClearModalOpen(false)}
                            style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                        <button 
                            className={styles.dangerBtn} 
                            onClick={handleConfirmClear}
                            style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                        >
                            Confirm Erase
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

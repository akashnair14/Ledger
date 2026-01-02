'use client';

import { useState } from 'react';
import { syncEngine } from '@/lib/sync/engine';
import { CloudSync, Lock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import styles from './SyncPage.module.css';

export default function SyncPage() {
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
    const [error, setError] = useState('');
    const [lastSync, setLastSync] = useState<string | null>(null);

    // In a real app, Client ID should be in .env
    const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';

    const handleSync = async () => {
        if (!password) {
            setError('Encryption password is required for sync.');
            return;
        }
        if (CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') {
            setError('Google Client ID not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID.');
            return;
        }

        try {
            setStatus('syncing');
            setError('');
            await syncEngine.setPassword(password);
            const res = await syncEngine.sync(CLIENT_ID);
            setLastSync(new Date(res.lastSync).toLocaleString());
            setStatus('success');
        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setError(err.message || 'Sync failed. Please check your connection and Client ID.');
        }
    };

    const handlePull = async () => {
        if (!password) {
            setError('Password required to decrypt data.');
            return;
        }
        try {
            setStatus('syncing');
            setError('');
            await syncEngine.setPassword(password);
            await syncEngine.pull(CLIENT_ID);
            setStatus('success');
        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setError(err.message || 'Restoring from cloud failed.');
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.hero}>
                <div className={styles.iconCircle}><CloudSync size={48} /></div>
                <h1>Cloud Sync</h1>
                <p>Sync your ledger data securely across devices using Google Drive. Your data is encrypted locally before upload.</p>
            </div>

            <div className={styles.card}>
                <div className={styles.inputGroup}>
                    <label><Lock size={16} /> Encryption Password</label>
                    <input
                        type="password"
                        placeholder="nEnter a strong password..."
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <p className={styles.note}>This password is used to encrypt your files. You MUST remember it to restore data on other devices.</p>
                </div>

                {status === 'error' && (
                    <div className={styles.errorBox}>
                        <AlertCircle size={20} />
                        <span>{error}</span>
                    </div>
                )}

                {status === 'success' && (
                    <div className={styles.successBox}>
                        <CheckCircle size={20} />
                        <span>Sync Successful! {lastSync && `Last sync: ${lastSync}`}</span>
                    </div>
                )}

                <div className={styles.actions}>
                    <button
                        className={styles.syncBtn}
                        onClick={handleSync}
                        disabled={status === 'syncing'}
                    >
                        {status === 'syncing' ? <RefreshCw className={styles.spin} /> : <CloudSync size={20} />}
                        Sync Now
                    </button>
                    <button
                        className={styles.pullBtn}
                        onClick={handlePull}
                        disabled={status === 'syncing'}
                    >
                        Restore from Cloud
                    </button>
                </div>
            </div>

            <div className={styles.securityNote}>
                <h3>🔒 Security Information</h3>
                <ul>
                    <li>Data is encrypted using 256-bit AES-GCM.</li>
                    <li>Neither Google nor we can read your financial data.</li>
                    <li>Files are stored in your private Google Drive.</li>
                </ul>
            </div>
        </div>
    );
}

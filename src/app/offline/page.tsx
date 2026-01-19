'use client';

import React from 'react';
import Link from 'next/link';
import { WifiOff, Home, RefreshCw } from 'lucide-react';
import styles from '../landing.module.css'; // Reusing landing styles for consistency

export default function OfflinePage() {
    return (
        <div className={styles.container} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
            <div style={{
                background: 'rgba(255,255,255,0.05)',
                padding: '3rem',
                borderRadius: '24px',
                textAlign: 'center',
                border: '1px solid var(--border)',
                maxWidth: '400px'
            }}>
                <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    width: '80px',
                    height: '80px',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem'
                }}>
                    <WifiOff size={40} />
                </div>

                <h1 style={{ fontSize: '1.75rem', marginBottom: '1rem', fontFamily: 'var(--font-fraunces)' }}>You are Offline</h1>
                <p style={{ color: 'var(--text-dim)', marginBottom: '2rem', lineHeight: '1.6' }}>
                    It seems you don't have an internet connection. Check your signal and try again.
                </p>

                <button
                    onClick={() => window.location.reload()}
                    className={styles.primaryBtn}
                    style={{ width: '100%', justifyContent: 'center', marginBottom: '1rem' }}
                >
                    <RefreshCw size={18} /> Retry Connection
                </button>

                <Link href="/dashboard" className={styles.secondaryBtn} style={{ width: '100%', justifyContent: 'center' }}>
                    <Home size={18} /> Go to Dashboard
                </Link>
            </div>
        </div>
    );
}

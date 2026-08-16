'use client';

import React, { useState, useMemo } from 'react';
import { Camera, Plus, Search, Filter, FileText, CheckCircle2, Clock, ArrowRightLeft, User, Eye, Sparkles } from 'lucide-react';
import { useKachaBills, useCustomers } from '@/hooks/useSupabase';
import { useBook } from '@/context/BookContext';
import { useToast } from '@/context/ToastContext';
import { KachaBill, Customer } from '@/lib/db';
import { CaptureBillModal } from '@/components/features/CaptureBillModal';
import { KachaBillViewerModal } from '@/components/features/KachaBillViewerModal';
import styles from './KachaBills.module.css';

export default function KachaBillsPage() {
    const { activeBook } = useBook();
    const { showToast } = useToast();
    const bookId = activeBook?.id || 'default-book';

    const { kachaBills, isLoading } = useKachaBills(bookId);
    const { customers } = useCustomers();

    // UI state
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'SETTLED' | 'CONVERTED'>('ALL');
    const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
    const [editingBill, setEditingBill] = useState<KachaBill | null>(null);
    const [selectedBillForView, setSelectedBillForView] = useState<KachaBill | null>(null);

    // Filter bills
    const filteredBills = useMemo(() => {
        if (!kachaBills) return [];

        return kachaBills.filter((bill: KachaBill) => {
            if (bill.isDeleted !== 0) return false;

            // Status filter
            if (statusFilter !== 'ALL' && bill.status !== statusFilter) return false;

            // Search Query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const noteMatch = bill.note && bill.note.toLowerCase().includes(q);
                const titleMatch = bill.title && bill.title.toLowerCase().includes(q);
                const amountMatch = bill.amount && String(bill.amount).includes(q);

                let customerMatch = false;
                if (bill.customerId && customers) {
                    const cust = customers.find((c: Customer) => c.id === bill.customerId);
                    customerMatch = !!cust && cust.name.toLowerCase().includes(q);
                }

                if (!noteMatch && !titleMatch && !amountMatch && !customerMatch) {
                    return false;
                }
            }

            return true;
        });
    }, [kachaBills, statusFilter, searchQuery, customers]);

    // Statistics
    const stats = useMemo(() => {
        if (!kachaBills) return { total: 0, pendingCount: 0, pendingAmount: 0, convertedCount: 0 };

        const nonDeleted = kachaBills.filter((b: KachaBill) => b.isDeleted === 0);
        const pending = nonDeleted.filter((b: KachaBill) => b.status === 'PENDING');
        const converted = nonDeleted.filter((b: KachaBill) => b.status === 'CONVERTED' || b.status === 'SETTLED');

        const pendingSum = pending.reduce((acc: number, curr: KachaBill) => acc + (curr.amount || 0), 0);

        return {
            total: nonDeleted.length,
            pendingCount: pending.length,
            pendingAmount: pendingSum,
            convertedCount: converted.length
        };
    }, [kachaBills]);

    const getCustomerName = (customerId?: string) => {
        if (!customerId || !customers) return null;
        const cust = customers.find((c: Customer) => c.id === customerId);
        return cust ? cust.name : null;
    };

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.titleSection}>
                    <h1>
                        <Camera size={28} color="var(--primary)" />
                        <span>Kacha Bills Vault</span>
                    </h1>
                    <p className={styles.subtitle}>
                        Capture rough slips, handwritten bills & estimates with notes before making formal entries.
                    </p>
                </div>
                <button
                    type="button"
                    className={styles.captureBtn}
                    onClick={() => {
                        setEditingBill(null);
                        setIsCaptureModalOpen(true);
                    }}
                >
                    <Plus size={20} />
                    <span>Capture Bill</span>
                </button>
            </div>

            {/* Stats Cards */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.statIconAll}`}>
                        <FileText size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Total Captured</span>
                        <span className={styles.statValue}>{stats.total} Bills</span>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.statIconPending}`}>
                        <Clock size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Pending Estimates</span>
                        <span className={styles.statValue}>
                            {stats.pendingCount} {stats.pendingAmount > 0 && `(₹${stats.pendingAmount.toLocaleString()})`}
                        </span>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.statIconConverted}`}>
                        <CheckCircle2 size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Settled / Converted</span>
                        <span className={styles.statValue}>{stats.convertedCount}</span>
                    </div>
                </div>
            </div>

            {/* Controls Bar */}
            <div className={styles.controlsBar}>
                <div className={styles.searchBox}>
                    <Search size={18} className={styles.searchIcon} />
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Search bills by note, amount, party..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className={styles.filterTabs}>
                    <button
                        type="button"
                        className={`${styles.tabBtn} ${statusFilter === 'ALL' ? styles.tabBtnActive : ''}`}
                        onClick={() => setStatusFilter('ALL')}
                    >
                        All ({stats.total})
                    </button>
                    <button
                        type="button"
                        className={`${styles.tabBtn} ${statusFilter === 'PENDING' ? styles.tabBtnActive : ''}`}
                        onClick={() => setStatusFilter('PENDING')}
                    >
                        Pending ({stats.pendingCount})
                    </button>
                    <button
                        type="button"
                        className={`${styles.tabBtn} ${statusFilter === 'SETTLED' ? styles.tabBtnActive : ''}`}
                        onClick={() => setStatusFilter('SETTLED')}
                    >
                        Settled
                    </button>
                    <button
                        type="button"
                        className={`${styles.tabBtn} ${statusFilter === 'CONVERTED' ? styles.tabBtnActive : ''}`}
                        onClick={() => setStatusFilter('CONVERTED')}
                    >
                        Converted
                    </button>
                </div>
            </div>

            {/* Bills Grid */}
            {filteredBills.length > 0 ? (
                <div className={styles.billsGrid}>
                    {filteredBills.map((bill: KachaBill) => {
                        const partyName = getCustomerName(bill.customerId);
                        return (
                            <div
                                key={bill.id}
                                className={styles.billCard}
                                onClick={() => setSelectedBillForView(bill)}
                            >
                                <div className={styles.thumbnailContainer}>
                                    <img src={bill.imageUrl} alt="Bill slip" className={styles.thumbnail} />
                                    <span
                                        className={`${styles.statusBadge} ${
                                            bill.status === 'PENDING'
                                                ? styles.badgePending
                                                : bill.status === 'SETTLED'
                                                ? styles.badgeSettled
                                                : styles.badgeConverted
                                        }`}
                                    >
                                        {bill.status}
                                    </span>
                                </div>

                                <div className={styles.cardBody}>
                                    <div className={styles.amountRow}>
                                        <span className={styles.amount}>
                                            {bill.amount !== undefined && bill.amount !== null
                                                ? `₹${bill.amount.toLocaleString()}`
                                                : bill.title || 'Kacha Bill'}
                                        </span>
                                        <span className={styles.billDate}>
                                            {new Date(bill.billDate).toLocaleDateString(undefined, {
                                                day: 'numeric',
                                                month: 'short'
                                            })}
                                        </span>
                                    </div>

                                    {partyName && (
                                        <div className={styles.partyTag}>
                                            <User size={12} />
                                            <span>{partyName}</span>
                                        </div>
                                    )}

                                    {bill.note && (
                                        <p className={styles.cardNote}>{bill.note}</p>
                                    )}
                                </div>

                                <div className={styles.cardFooter}>
                                    <span className={styles.cardActionLink}>
                                        <Eye size={14} />
                                        <span>View Details</span>
                                    </span>
                                    {bill.status !== 'CONVERTED' && (
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            Click to convert →
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                        <Camera size={32} />
                    </div>
                    <h3>No Kacha Bills Found</h3>
                    <p>
                        {searchQuery || statusFilter !== 'ALL'
                            ? 'No bills match your current search or filter criteria.'
                            : 'Snap quick photos of rough bills, paper slips, or estimates to keep your records clear.'}
                    </p>
                    <button
                        type="button"
                        className={styles.captureBtn}
                        onClick={() => {
                            setEditingBill(null);
                            setIsCaptureModalOpen(true);
                        }}
                    >
                        <Plus size={18} />
                        <span>Capture First Bill</span>
                    </button>
                </div>
            )}

            {/* Capture / Edit Modal */}
            <CaptureBillModal
                isOpen={isCaptureModalOpen}
                onClose={() => {
                    setIsCaptureModalOpen(false);
                    setEditingBill(null);
                }}
                bookId={bookId}
                editingBill={editingBill}
                showToast={showToast}
            />

            {/* View / Convert Modal */}
            <KachaBillViewerModal
                isOpen={!!selectedBillForView}
                onClose={() => setSelectedBillForView(null)}
                bill={selectedBillForView}
                bookId={bookId}
                onEdit={(bill) => {
                    setEditingBill(bill);
                    setIsCaptureModalOpen(true);
                }}
                showToast={showToast}
            />
        </div>
    );
}

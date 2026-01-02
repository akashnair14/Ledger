'use client';

import { db, PaymentMode } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useBook } from '@/context/BookContext';
import {
    ReceiptText,
    ArrowUpRight,
    ArrowDownLeft,
    Search,
    Paperclip,
    Tag,
    Filter,
    Calendar,
    ChevronDown,
    X
} from 'lucide-react';
import { useState } from 'react';
import styles from './TransactionsPage.module.css';
import Link from 'next/link';

export default function TransactionsPage() {
    const { activeBook } = useBook();
    const [searchQuery, setSearchQuery] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Filter States
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'CREDIT' | 'PAYMENT'>('ALL');
    const [modeFilter, setModeFilter] = useState<'ALL' | PaymentMode>('ALL');

    const data = useLiveQuery(async () => {
        if (!activeBook) return [];
        const transactions = await db.transactions
            .where('bookId').equals(activeBook.id)
            .and(t => t.isDeleted === 0)
            .reverse()
            .sortBy('date');

        const customers = await db.customers.where('bookId').equals(activeBook.id).toArray();

        return transactions.map(t => ({
            ...t,
            customerName: customers.find(c => c.id === t.customerId)?.name || 'Deleted Customer'
        }));
    }, [activeBook]);

    const filtered = data?.filter(t => {
        // Search Match
        const q = searchQuery.toLowerCase();
        const searchMatch = !searchQuery ||
            t.customerName.toLowerCase().includes(q) ||
            (t.note && t.note.toLowerCase().includes(q)) ||
            (t.invoiceNumber && t.invoiceNumber.toLowerCase().includes(q)) ||
            (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)));

        if (!searchMatch) return false;

        // Type Match
        if (typeFilter !== 'ALL' && t.type !== typeFilter) return false;

        // Mode Match
        if (modeFilter !== 'ALL' && t.paymentMode !== modeFilter) return false;

        // Date Match
        if (startDate) {
            if (t.date < new Date(startDate).getTime()) return false;
        }
        if (endDate) {
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            if (t.date > endOfDay.getTime()) return false;
        }

        return true;
    });

    const resetFilters = () => {
        setStartDate('');
        setEndDate('');
        setTypeFilter('ALL');
        setModeFilter('ALL');
        setSearchQuery('');
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <h1>All Transactions</h1>
                    <p className={styles.count}>{filtered?.length || 0} Entries Displayed</p>
                </div>
                <button
                    className={`${styles.filterToggle} ${isFilterOpen ? styles.active : ''}`}
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                >
                    <Filter size={18} />
                    <span>Filters</span>
                </button>
            </header>

            {isFilterOpen && (
                <div className={styles.filterPanel}>
                    <div className={styles.filterGrid}>
                        <div className={styles.filterGroup}>
                            <label>Date From</label>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        </div>
                        <div className={styles.filterGroup}>
                            <label>Date To</label>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </div>
                        <div className={styles.filterGroup}>
                            <label>Entry Type</label>
                            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)}>
                                <option value="ALL">All Transactions</option>
                                <option value="CREDIT">Only Credit (Given)</option>
                                <option value="PAYMENT">Only Payment (Received)</option>
                            </select>
                        </div>
                        <div className={styles.filterGroup}>
                            <label>Payment Mode</label>
                            <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value as any)}>
                                <option value="ALL">All Modes</option>
                                <option value="CASH">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="BANK_TRANSFER">Bank Transfer</option>
                                <option value="CHEQUE">Cheque</option>
                            </select>
                        </div>
                    </div>
                    <div className={styles.filterActions}>
                        <button className={styles.resetBtn} onClick={resetFilters}>Reset All</button>
                    </div>
                </div>
            )}

            <div className={styles.searchBar}>
                <Search size={20} className={styles.searchIcon} />
                <input
                    type="text"
                    placeholder="Search by customer, invoice #, or note..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className={styles.list}>
                {!filtered ? (
                    <p className={styles.loading}>Accessing ledger records...</p>
                ) : filtered.length === 0 ? (
                    <div className={styles.empty}>
                        <ReceiptText size={48} />
                        <h3>No matching transactions</h3>
                        <p>Try adjusting your search or filters.</p>
                        <button onClick={resetFilters} className={styles.textBtn}>Clear All Filters</button>
                    </div>
                ) : (
                    filtered.map((t, index) => (
                        <Link
                            href={`/customers/${t.customerId}`}
                            key={t.id}
                            className={`${styles.card} staggered-reveal`}
                            style={{ '--i': index } as React.CSSProperties}
                        >
                            <div className={t.type === 'CREDIT' ? styles.iconCredit : styles.iconPayment}>
                                {t.type === 'CREDIT' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                            </div>
                            <div className={styles.info}>
                                <div className={styles.top}>
                                    <h3>{t.customerName}</h3>
                                    <span className={t.type === 'CREDIT' ? styles.amountCredit : styles.amountPayment}>
                                        ₹{t.amount.toLocaleString()}
                                    </span>
                                </div>
                                <div className={styles.bottom}>
                                    <div className={styles.noteArea}>
                                        <p className={styles.txnNote}>
                                            {t.note || (t.type === 'CREDIT' ? 'Credit Given' : 'Payment Received')}
                                            {t.invoiceNumber && <span className={styles.invTag}>#{t.invoiceNumber}</span>}
                                        </p>
                                        <div className={styles.metaRow}>
                                            <span>{new Date(t.date).toLocaleDateString()}</span>
                                            <span className={styles.modeBadge}>{t.paymentMode === 'OTHER' && (t as any).customPaymentMode ? (t as any).customPaymentMode : t.paymentMode}</span>
                                            {t.hasAttachment && <Paperclip size={12} />}
                                        </div>
                                    </div>
                                    {t.tags && t.tags.length > 0 && (
                                        <div className={styles.tagStrip}>
                                            {t.tags.slice(0, 2).map(tag => (
                                                <span key={tag}>#{tag}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}

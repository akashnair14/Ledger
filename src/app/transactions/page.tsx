'use client';

import { PaymentMode, Transaction, Customer } from '@/lib/db';
import { useCustomers, useTransactions } from '@/hooks/useSupabase';
import { useBook } from '@/context/BookContext';
import {
    ReceiptText,
    ArrowUpRight,
    ArrowDownLeft,
    Search,
    Paperclip,
    Filter,
    RefreshCw,
    Download,
    Eye,
    Trash2,
    FileSpreadsheet,
    Share2,
    Plus,
    X,
    ChevronRight
} from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import styles from './TransactionsPage.module.css';
import Link from 'next/link';
import { useBooks } from '@/hooks/useSupabase';

const AVATAR_COLORS = ['#f05c38', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4'];

export default function TransactionsPage() {
    const { activeBook } = useBook();
    const [searchQuery, setSearchQuery] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [sortBy, setSortBy] = useState<'DATE_DESC' | 'DATE_ASC' | 'AMOUNT_DESC' | 'AMOUNT_ASC'>('DATE_DESC');
    const [quickFilter, setQuickFilter] = useState<'ALL' | 'GIVEN' | 'RECEIVED' | 'CASH' | 'UPI' | 'BANK'>('ALL');
    
    // Filter States
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'CREDIT' | 'PAYMENT'>('ALL');
    const [modeFilter, setModeFilter] = useState<'ALL' | PaymentMode>('ALL');

    const searchInputRef = useRef<HTMLInputElement>(null);

    const { books } = useBooks();
    const { customers, isLoading: loadingCustomers } = useCustomers();
    const { transactions, isLoading: loadingTxns } = useTransactions();

    // Hotkey listener for Ctrl+K search focus
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const filtered = useMemo(() => {
        if (!transactions || !customers || !books) return [];
        const activeBookIds = new Set(books.map((b: any) => b.id));

        let result = transactions
            .filter((t: Transaction) => {
                if (t.isDeleted !== 0) return false;

                // Ensure the transaction belongs to a non-deleted book
                if (!activeBookIds.has(t.bookId)) return false;

                // Book Filter
                if (activeBook && t.bookId !== activeBook.id) return false;

                // Search Match
                const customer = customers.find((c: Customer) => c.id === t.customerId);
                const customerName = customer?.name || 'Deleted Customer';

                const q = searchQuery.toLowerCase();
                const searchMatch = !searchQuery ||
                    customerName.toLowerCase().includes(q) ||
                    (t.note && t.note.toLowerCase().includes(q)) ||
                    (t.invoiceNumber && t.invoiceNumber.toLowerCase().includes(q)) ||
                    (t.tags && t.tags.some((tag: string) => tag.toLowerCase().includes(q)));

                if (!searchMatch) return false;

                // Quick Filter Logic
                if (quickFilter === 'GIVEN' && t.type !== 'CREDIT') return false;
                if (quickFilter === 'RECEIVED' && t.type !== 'PAYMENT') return false;
                if (quickFilter === 'CASH' && t.paymentMode !== 'CASH') return false;
                if (quickFilter === 'UPI' && t.paymentMode !== 'UPI') return false;
                if (quickFilter === 'BANK' && t.paymentMode !== 'BANK_TRANSFER') return false;

                // Form Filter Panel Match
                if (typeFilter !== 'ALL' && t.type !== typeFilter) return false;
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
            })
            .map((t: Transaction) => ({
                ...t,
                customerName: customers.find((c: Customer) => c.id === t.customerId)?.name || 'Deleted Customer'
            }));

        // Sort execution
        result.sort((a: any, b: any) => {
            if (sortBy === 'DATE_DESC') return b.date - a.date;
            if (sortBy === 'DATE_ASC') return a.date - b.date;
            if (sortBy === 'AMOUNT_DESC') return b.amount - a.amount;
            if (sortBy === 'AMOUNT_ASC') return a.amount - b.amount;
            return 0;
        });

        return result;
    }, [transactions, customers, activeBook, searchQuery, typeFilter, modeFilter, startDate, endDate, sortBy, quickFilter, books]);

    // Financial KPI Totals Calculations
    const kpis = useMemo(() => {
        let totalGiven = 0;
        let totalReceived = 0;
        filtered.forEach((t: any) => {
            if (t.type === 'CREDIT') {
                totalGiven += t.amount;
            } else {
                totalReceived += t.amount;
            }
        });
        return {
            totalGiven,
            totalReceived,
            netBalance: totalGiven - totalReceived,
            count: filtered.length
        };
    }, [filtered]);

    // Grouping by Date Timeline logic
    const groupedTransactions = useMemo(() => {
        const groups: Record<string, any[]> = {};
        const todayStr = new Date().toDateString();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        filtered.forEach((t: any) => {
            const date = new Date(t.date);
            const dateStr = date.toDateString();
            
            let label = 'Older';
            if (dateStr === todayStr) {
                label = 'Today';
            } else if (dateStr === yesterdayStr) {
                label = 'Yesterday';
            } else {
                const diffTime = Math.abs(new Date().getTime() - date.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays <= 7) {
                    label = 'This Week';
                } else if (diffDays <= 30) {
                    label = 'This Month';
                }
            }

            if (!groups[label]) groups[label] = [];
            groups[label].push(t);
        });

        return groups;
    }, [filtered]);

    const resetFilters = () => {
        setStartDate('');
        setEndDate('');
        setTypeFilter('ALL');
        setModeFilter('ALL');
        setSearchQuery('');
        setQuickFilter('ALL');
        setSortBy('DATE_DESC');
    };

    const handleExportCSV = () => {
        const headers = ['Date', 'Customer', 'Type', 'Amount', 'Mode', 'Note', 'Invoice'];
        const rows = filtered.map((t: any) => [
            new Date(t.date).toLocaleDateString(),
            t.customerName,
            t.type,
            t.amount,
            t.paymentMode,
            t.note || '',
            t.invoiceNumber || ''
        ]);
        
        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Ledger_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getAvatarColor = (name: string) => {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    };

    const formatDateShort = (timestamp: number) => {
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    const isLoading = loadingCustomers || loadingTxns;

    return (
        <div className={styles.container}>
            {/* Page Header */}
            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <h1>All Transactions</h1>
                    <div className={styles.headerMeta}>
                        <span>Track every payment, receipt and adjustment in one place</span>
                        <span>•</span>
                        <span>{filtered.length} Entries</span>
                    </div>
                </div>
                <div className={styles.headerActions}>
                    <Link href="/dashboard" className={styles.addBtn} title="Select customer to create a transaction entry">
                        <Plus size={16} />
                        <span>Add Transaction</span>
                    </Link>
                </div>
            </header>

            {/* KPI Summary Cards */}
            <section className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                    <div className={styles.cardHeader}>
                        <span>Total Given</span>
                        <div className={styles.summaryIcon} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>Given</div>
                    </div>
                    <div className={styles.summaryVal}>₹{kpis.totalGiven.toLocaleString('en-IN')}</div>
                    <span className={styles.summarySub}>Outgoing customer credit dues</span>
                </div>
                <div className={styles.summaryCard}>
                    <div className={styles.cardHeader}>
                        <span>Total Received</span>
                        <div className={styles.summaryIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>Recv</div>
                    </div>
                    <div className={styles.summaryVal}>₹{kpis.totalReceived.toLocaleString('en-IN')}</div>
                    <span className={styles.summarySub}>Incoming merchant payments</span>
                </div>
                <div className={styles.summaryCard}>
                    <div className={styles.cardHeader}>
                        <span>Net Balance</span>
                        <div className={styles.summaryIcon} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>Bal</div>
                    </div>
                    <div className={styles.summaryVal} style={{ color: kpis.netBalance >= 0 ? '#10b981' : '#ef4444' }}>
                        {kpis.netBalance >= 0 ? '+' : ''}₹{kpis.netBalance.toLocaleString('en-IN')}
                    </div>
                    <span className={styles.summarySub}>Net receivable ledger dues</span>
                </div>
                <div className={styles.summaryCard}>
                    <div className={styles.cardHeader}>
                        <span>Transactions</span>
                        <div className={styles.summaryIcon} style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' }}>Logs</div>
                    </div>
                    <div className={styles.summaryVal}>{kpis.count}</div>
                    <span className={styles.summarySub}>Compiled ledger database records</span>
                </div>
            </section>

            {/* Search & Filter Toolbar */}
            <section className={styles.toolbar}>
                <div className={styles.searchWrapper}>
                    <Search size={18} className={styles.searchIcon} />
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search by customer, note, or invoice... (Ctrl+K)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={styles.searchInput}
                        aria-label="Search transactions"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '50px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
                            <X size={16} />
                        </button>
                    )}
                    <span className={styles.keyboardShortcut}>Ctrl+K</span>
                </div>

                <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value as any)} 
                    className={styles.sortSelect}
                    aria-label="Sort transactions"
                >
                    <option value="DATE_DESC">Newest Date</option>
                    <option value="DATE_ASC">Oldest Date</option>
                    <option value="AMOUNT_DESC">Highest Amount</option>
                    <option value="AMOUNT_ASC">Lowest Amount</option>
                </select>

                <button
                    className={`${styles.filterToggleBtn} ${isFilterOpen ? styles.active : ''}`}
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    aria-label="Toggle Advanced Filters"
                >
                    <Filter size={16} />
                    <span>Filters</span>
                </button>

                <button 
                    onClick={handleExportCSV} 
                    className={styles.exportBtn}
                    title="Export filtered transactions as CSV spreadsheet"
                >
                    <FileSpreadsheet size={16} />
                    <span>Export</span>
                </button>
            </section>

            {/* Filter Toggle Panel */}
            {isFilterOpen && (
                <div className={styles.filterPanel}>
                    <div className={styles.filterGrid}>
                        <div className={styles.filterGroup}>
                            <label>Date From</label>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} aria-label="Start date filter" />
                        </div>
                        <div className={styles.filterGroup}>
                            <label>Date To</label>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} aria-label="End date filter" />
                        </div>
                        <div className={styles.filterGroup}>
                            <label>Entry Type</label>
                            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} aria-label="Type filter selector">
                                <option value="ALL">All Entries</option>
                                <option value="CREDIT">Given (Credit)</option>
                                <option value="PAYMENT">Received (Payment)</option>
                            </select>
                        </div>
                        <div className={styles.filterGroup}>
                            <label>Payment Mode</label>
                            <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value as any)} aria-label="Payment Mode filter selector">
                                <option value="ALL">All Modes</option>
                                <option value="CASH">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="BANK_TRANSFER">Bank Transfer</option>
                                <option value="CHEQUE">Cheque</option>
                            </select>
                        </div>
                    </div>
                    <div className={styles.filterActions}>
                        <button className={styles.resetBtn} onClick={resetFilters}>Reset Advanced Filters</button>
                    </div>
                </div>
            )}

            {/* Quick Filters */}
            <section className={styles.chipsContainer}>
                <button className={`${styles.chip} ${quickFilter === 'ALL' ? styles.chipActive : ''}`} onClick={() => setQuickFilter('ALL')}>All</button>
                <button className={`${styles.chip} ${quickFilter === 'GIVEN' ? styles.chipActive : ''}`} onClick={() => setQuickFilter('GIVEN')}>Given</button>
                <button className={`${styles.chip} ${quickFilter === 'RECEIVED' ? styles.chipActive : ''}`} onClick={() => setQuickFilter('RECEIVED')}>Received</button>
                <button className={`${styles.chip} ${quickFilter === 'CASH' ? styles.chipActive : ''}`} onClick={() => setQuickFilter('CASH')}>Cash</button>
                <button className={`${styles.chip} ${quickFilter === 'UPI' ? styles.chipActive : ''}`} onClick={() => setQuickFilter('UPI')}>UPI</button>
                <button className={`${styles.chip} ${quickFilter === 'BANK' ? styles.chipActive : ''}`} onClick={() => setQuickFilter('BANK')}>Bank</button>
            </section>

            {/* Main Timelined Transactions List */}
            <div className={styles.list}>
                {isLoading ? (
                    <div className={styles.loadingArea}>
                        <div className={styles.skeletonRow} />
                        <div className={styles.skeletonRow} />
                        <div className={styles.skeletonRow} />
                        <div className={styles.skeletonRow} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className={styles.empty}>
                        <ReceiptText size={48} />
                        <h3>No transactions yet.</h3>
                        <p>No transactions match your search filter criteria. Try updating filters or select a customer to start tracking.</p>
                        <button onClick={resetFilters} className={styles.resetBtn}>Clear All Filters</button>
                    </div>
                ) : (
                    Object.keys(groupedTransactions).map(groupName => {
                        const txns = groupedTransactions[groupName];
                        if (txns.length === 0) return null;
                        
                        return (
                            <div key={groupName} className={styles.timelineGroup}>
                                <div className={styles.timelineHeader}>{groupName}</div>
                                <div className={styles.list} style={{ gap: '6px', marginBottom: '1.5rem' }}>
                                    {txns.map((t: any, index: number) => {
                                        const initials = getInitials(t.customerName);
                                        const avatarBg = getAvatarColor(t.customerName);
                                        
                                        return (
                                            <div key={t.id} style={{ position: 'relative' }}>
                                                <Link
                                                    href={`/customers/${t.customerId}`}
                                                    className={styles.card}
                                                >
                                                    {/* Initials Avatar */}
                                                    <div 
                                                        className={styles.avatar} 
                                                        style={{ backgroundColor: avatarBg }}
                                                    >
                                                        {initials}
                                                    </div>

                                                    <div className={styles.info}>
                                                        <div className={styles.topRow}>
                                                            <span className={styles.customerName}>{t.customerName}</span>
                                                            <span className={`${styles.typeBadge} ${t.type === 'CREDIT' ? styles.badgeGiven : styles.badgeReceived}`}>
                                                                {t.type === 'CREDIT' ? 'Given' : 'Received'}
                                                            </span>
                                                            <span className={styles.modeBadge}>{t.paymentMode}</span>
                                                        </div>

                                                        {t.note && (
                                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                                <p className={styles.noteText}>{t.note}</p>
                                                                {t.invoiceNumber && (
                                                                    <span className={styles.invoiceBadge}>#{t.invoiceNumber}</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className={styles.dateArea}>
                                                        <span className={styles.dateDisplay}>{formatDateShort(t.date)}</span>
                                                        <span className={styles.timeDisplay}>
                                                            {new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>

                                                    <div className={styles.amountArea}>
                                                        <span className={`${styles.amount} ${t.type === 'CREDIT' ? styles.amountCredit : styles.amountPayment}`}>
                                                            {t.type === 'CREDIT' ? '-' : '+'} ₹{t.amount.toLocaleString('en-IN')}
                                                        </span>
                                                    </div>

                                                    <ChevronRight size={16} className={styles.chevronIcon} />
                                                </Link>

                                                {/* Hover Action Overlay */}
                                                <div className={styles.quickActions}>
                                                    <Link href={`/customers/${t.customerId}`} className={styles.actionBtn} title="View Customer profile">
                                                        <Eye size={14} />
                                                    </Link>
                                                    <button 
                                                        onClick={() => alert(`Attachment file status: ${t.hasAttachment ? 'Available' : 'No attachment'}`)} 
                                                        className={styles.actionBtn} 
                                                        title="Share Transaction PDF"
                                                    >
                                                        <Share2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

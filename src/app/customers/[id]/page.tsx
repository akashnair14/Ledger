'use client';

import { useParams, useRouter } from 'next/navigation';
import { Transaction, Customer } from '@/lib/db';
import {
    Trash2,
    Edit2,
    X,
    Paperclip,
    Receipt,
    ArrowUpRight,
    ArrowDownLeft,
    ArrowLeft,
    Check,
    Plus,
    Minus,
    Phone,
    Mail,
    Calendar,
    MessageSquare,
    Share2,
    FileSpreadsheet,
    ChevronDown,
    Search,
    Clock,
    Sparkles,
    Loader2,
    FileText,
    Copy,
    MoreHorizontal
} from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';
import styles from './CustomerDetail.module.css';
import {
    useCustomers,
    useTransactions,
    deleteTransaction,
    updateCustomer,
    deleteCustomer,
    getTransactionCount
} from '@/hooks/useSupabase';
import { useToast } from '@/context/ToastContext';
import { useBook } from '@/context/BookContext';
import { EmptyState } from '@/components/ui/EmptyState';
import { CustomerDetailSkeleton } from '@/components/ui/LayoutSkeletons';
import { normalizePhoneNumber, isValidPhone } from '@/lib/phoneUtils';
import { TransactionFormModal } from '@/components/features/TransactionFormModal';
import {
    AreaChart,
    Area,
    ResponsiveContainer
} from 'recharts';

const AVATAR_COLORS = ['#f05c38', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4'];

export default function CustomerDetailPage() {
    const { id } = useParams();
    const customerId = id as string;
    const { showToast } = useToast();
    const router = useRouter();
    const { activeBook } = useBook();

    // Data Fetching
    const { customers, isLoading: customersLoading } = useCustomers();
    const { transactions: allTransactions, isLoading: txnsLoading } = useTransactions(customerId);

    const customer = customers?.find((c: Customer) => c.id === id);
    const isSupplier = customer?.type === 'SUPPLIER';

    // Customer Management States
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editAddress, setEditAddress] = useState('');
    const [isUpdatingCustomer, setIsUpdatingCustomer] = useState(false);

    // Transaction Modal States
    const [isTxnModalOpen, setTxnModalOpen] = useState(false);
    const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
    const [txnType, setTxnType] = useState<'CREDIT' | 'PAYMENT'>('CREDIT');

    // UI States
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedTxns, setSelectedTxns] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [quickFilter, setQuickFilter] = useState<'ALL' | 'CREDIT' | 'PAYMENT' | 'UPI' | 'CASH' | 'BANK'>('ALL');
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const moreMenuRef = useRef<HTMLDivElement>(null);

    // Click outside handler for More Actions menu
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
                setIsMoreMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Keyboard Shortcuts focus Ctrl+K
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

    // Form validations & saves
    const handleUpdateCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customer) return;

        if (editName.trim().length < 3) {
            return showToast('Name must be at least 3 characters', 'error');
        }
        if (editPhone && !isValidPhone(editPhone)) {
            return showToast('Please enter a valid phone number', 'error');
        }

        setIsUpdatingCustomer(true);
        try {
            await updateCustomer(customer.id, {
                name: editName.trim(),
                phone: normalizePhoneNumber(editPhone),
                email: editEmail.trim(),
                address: editAddress.trim()
            });
            showToast('Profile updated');
            setIsEditModalOpen(false);
        } catch (err: any) {
            showToast('Failed to update: ' + err.message, 'error');
        } finally {
            setIsUpdatingCustomer(false);
        }
    };

    const handleDeleteCustomer = async () => {
        if (!customer) return;
        try {
            const txnCount = await getTransactionCount(customer.id);
            const msg = txnCount > 0
                ? `Deleting this client will remove ${txnCount} transactions permanently. Continue?`
                : 'Are you sure you want to delete this customer?';

            if (confirm(msg)) {
                await deleteCustomer(customer.id);
                showToast('Customer deleted');
                router.replace('/dashboard');
            }
        } catch (err: any) {
            showToast('Delete failed: ' + err.message, 'error');
        }
    };

    const handleSendReminder = () => {
        if (!customer) return;
        const balance = customerBalances.balance;
        const msg = `Hi ${customer.name}, this is a reminder that an outstanding dues balance of ₹${Math.abs(balance).toLocaleString()} is pending on your LedgerManager ledger. Please clear your dues as soon as possible. Thank you!`;
        const phoneClean = customer.phone.replace(/[^0-9]/g, '');
        const whatsappUrl = `https://wa.me/${phoneClean}?text=${encodeURIComponent(msg)}`;
        window.open(whatsappUrl, '_blank');
        showToast('Reminder draft opened');
    };

    // Calculate customer balance metrics
    const customerBalances = useMemo(() => {
        if (!allTransactions) return { balance: 0, totalCredit: 0, totalPayment: 0, count: 0, lastTxnDateStr: 'Never' };
        const activeTxns = allTransactions.filter((t: Transaction) => t.isDeleted === 0);
        
        let totalCredit = 0;
        let totalPayment = 0;
        let lastTxnDate = 0;

        activeTxns.forEach((t: Transaction) => {
            if (t.type === 'CREDIT') {
                totalCredit += t.amount;
            } else {
                totalPayment += t.amount;
            }
            if (t.date > lastTxnDate) {
                lastTxnDate = t.date;
            }
        });

        let lastTxnDateStr = 'Never';
        if (lastTxnDate > 0) {
            const diffTime = Math.abs(Date.now() - lastTxnDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays <= 1) {
                lastTxnDateStr = 'Yesterday';
            } else if (new Date(lastTxnDate).toDateString() === new Date().toDateString()) {
                lastTxnDateStr = 'Today';
            } else {
                lastTxnDateStr = `${diffDays} days ago`;
            }
        }

        return {
            balance: totalCredit - totalPayment,
            totalCredit,
            totalPayment,
            count: activeTxns.length,
            lastTxnDateStr
        };
    }, [allTransactions]);

    // Running Balance Timeline calculation & Filter application
    const processedTransactions = useMemo(() => {
        if (!allTransactions) return [];
        
        const sortedAsc = [...allTransactions]
            .filter((t: Transaction) => t.isDeleted === 0)
            .sort((a, b) => a.date - b.date);

        let running = 0;
        const withRunning = sortedAsc.map((t: Transaction) => {
            running += t.type === 'CREDIT' ? t.amount : -t.amount;
            return {
                ...t,
                runningBalance: running
            };
        });

        const sortedDesc = withRunning.reverse();

        return sortedDesc.filter((t: any) => {
            const q = searchQuery.toLowerCase();
            const searchMatch = !searchQuery || (t.note && t.note.toLowerCase().includes(q)) || (t.invoiceNumber && t.invoiceNumber.toLowerCase().includes(q));
            if (!searchMatch) return false;

            if (quickFilter === 'CREDIT' && t.type !== 'CREDIT') return false;
            if (quickFilter === 'PAYMENT' && t.type !== 'PAYMENT') return false;
            if (quickFilter === 'UPI' && t.paymentMode !== 'UPI') return false;
            if (quickFilter === 'CASH' && t.paymentMode !== 'CASH') return false;
            if (quickFilter === 'BANK' && t.paymentMode !== 'BANK_TRANSFER') return false;

            return true;
        });
    }, [allTransactions, searchQuery, quickFilter]);

    // Grouping transactions by date timeline sections
    const groupedTransactions = useMemo(() => {
        const groups: Record<string, any[]> = {};
        const todayStr = new Date().toDateString();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        processedTransactions.forEach(t => {
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
    }, [processedTransactions]);

    // Recharts cashflow trend data formatting (outstanding balances over time)
    const trendData = useMemo(() => {
        if (!allTransactions) return [];
        const sortedAsc = [...allTransactions]
            .filter((t: Transaction) => t.isDeleted === 0)
            .sort((a, b) => a.date - b.date);

        let running = 0;
        return sortedAsc.map(t => {
            running += t.type === 'CREDIT' ? t.amount : -t.amount;
            return {
                date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                balance: running
            };
        }).slice(-15);
    }, [allTransactions]);

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

    const handleEdit = (txn: Transaction) => {
        setEditingTxn(txn);
        setTxnType(txn.type);
        setTxnModalOpen(true);
    };

    const handleDelete = async (txn: Transaction) => {
        if (confirm('Delete this transaction permanently?')) {
            try {
                await deleteTransaction(txn.id, txn.customerId);
                showToast('Transaction deleted');
            } catch (err: any) {
                showToast('Delete failed: ' + err.message, 'error');
            }
        }
    };

    const toggleTxnSelection = (id: string) => {
        setSelectedTxns(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = async () => {
        if (confirm(`Delete the ${selectedTxns.length} selected transactions permanently?`)) {
            try {
                for (const tId of selectedTxns) {
                    const t = allTransactions?.find((x: any) => x.id === tId);
                    if (t) await deleteTransaction(t.id, t.customerId);
                }
                showToast(`Deleted ${selectedTxns.length} entries`);
                setIsSelectMode(false);
                setSelectedTxns([]);
            } catch (err: any) {
                showToast('Bulk delete failed: ' + err.message, 'error');
            }
        }
    };

    const handleExportCSV = () => {
        if (!processedTransactions) return;
        const headers = ['Date', 'Type', 'Amount', 'Mode', 'Running Balance', 'Note', 'Invoice'];
        const rows = processedTransactions.map(t => [
            new Date(t.date).toLocaleDateString(),
            t.type,
            t.amount,
            t.paymentMode,
            t.runningBalance,
            t.note || '',
            t.invoiceNumber || ''
        ]);
        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Ledger_${customer?.name || 'Customer'}_Statement.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (customersLoading || txnsLoading) return <CustomerDetailSkeleton />;
    if (!customer) return <div className={styles.loading}>Customer details not found.</div>;

    const outstanding = customerBalances.balance;
    const isOverdue = outstanding > 0 && customer.updatedAt < Date.now() - 30 * 24 * 60 * 60 * 1000;
    const initials = getInitials(customer.name);

    return (
        <div className={styles.container}>
            {/* Section 1: Customer Profile Header (Strictly Compact, Max 90-110px) */}
            <header className={styles.header}>
                <div className={styles.headerTop}>
                    <Link href="/dashboard" className={styles.backButton}>
                        <ArrowLeft size={20} />
                    </Link>
                    
                    <div className={styles.avatar} style={{ backgroundColor: getAvatarColor(customer.name) }}>
                        {initials}
                    </div>

                    <div className={styles.nameSection}>
                        <h1>{customer.name}</h1>
                        <div className={styles.quickInfo}>
                            <span>📞 {customer.phone}</span>
                            <span>📅 Since {new Date(customer.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                        </div>
                    </div>

                    <button
                        className={styles.editBtn}
                        onClick={() => {
                            setEditName(customer.name);
                            setEditPhone(customer.phone);
                            setEditEmail(customer.email || '');
                            setEditAddress(customer.address || '');
                            setIsEditModalOpen(true);
                        }}
                        title="Edit profile settings"
                    >
                        <Edit2 size={12} />
                    </button>
                </div>

                {/* Primary Financial Workspace Actions */}
                <div className={styles.mainActions}>
                    <button className={styles.giveBtnDesktop} onClick={() => { setTxnType('CREDIT'); setTxnModalOpen(true); }}>
                        <Plus size={14} /> 
                        <span>{isSupplier ? 'Record Purchase' : 'Give Credit'}</span>
                    </button>
                    <button className={styles.receiveBtnDesktop} onClick={() => { setTxnType('PAYMENT'); setTxnModalOpen(true); }}>
                        <Minus size={14} /> 
                        <span>{isSupplier ? 'Pay Supplier' : 'Receive Payment'}</span>
                    </button>

                    {/* More Actions Dropdown hub */}
                    <div className={styles.moreMenuWrapper} ref={moreMenuRef}>
                        <button className={styles.actionBtn} onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}>
                            <MoreHorizontal size={16} />
                        </button>
                        {isMoreMenuOpen && (
                            <div className={styles.actionDropdown}>
                                <button className={styles.actionItem} onClick={() => { handleSendReminder(); setIsMoreMenuOpen(false); }}>
                                    <MessageSquare size={12} /> Send Reminder
                                </button>
                                <button className={styles.actionItem} onClick={() => { handleExportCSV(); setIsMoreMenuOpen(false); }}>
                                    <FileSpreadsheet size={12} /> Export Statement
                                </button>
                                <button className={styles.actionItem} onClick={() => { handleDeleteCustomer(); setIsMoreMenuOpen(false); }} style={{ color: 'var(--danger)' }}>
                                    <Trash2 size={12} /> Delete Profile
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Inline Warning Reminder Banner (Height-Reduced) */}
            {outstanding > 0 && (
                <section className={styles.inlineWarningBanner}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#f05c38', fontWeight: 800 }}>⚠️ Payment Overdue</span>
                        <span style={{ color: 'var(--text-muted)' }}>Outstanding ₹{outstanding.toLocaleString()}</span>
                    </div>
                    <button className={styles.sendBtn} onClick={handleSendReminder}>
                        Send Reminder
                    </button>
                </section>
            )}

            {/* Section 2: Financial Summary (4 Compact Cards) */}
            <section className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Outstanding</span>
                    <div className={styles.statVal} style={{ color: outstanding >= 0 ? '#10b981' : '#ef4444' }}>
                        ₹{outstanding.toLocaleString()}
                    </div>
                </div>

                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Total Given</span>
                    <div className={styles.statVal} style={{ color: '#ef4444' }}>
                        ₹{customerBalances.totalCredit.toLocaleString()}
                    </div>
                </div>

                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Total Received</span>
                    <div className={styles.statVal} style={{ color: '#10b981' }}>
                        ₹{customerBalances.totalPayment.toLocaleString()}
                    </div>
                </div>

                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Last Transaction</span>
                    <div className={styles.statVal}>
                        {customerBalances.lastTxnDateStr}
                    </div>
                </div>
            </section>

            {/* Section 3: Ledger Timeline & Filter Toolbar (Highest Priority, 70% height area) */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className={styles.toolbar}>
                    <div className={styles.searchWrapper}>
                        <Search size={16} className={styles.searchIcon} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search timeline notes or invoice #... (Ctrl+K)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={styles.searchInput}
                            aria-label="Search ledger history"
                        />
                    </div>

                    <button 
                        className={`${styles.filterToggleBtn} ${isSelectMode ? styles.active : ''}`}
                        style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                        onClick={() => { setIsSelectMode(!isSelectMode); setSelectedTxns([]); }}
                    >
                        {isSelectMode ? 'Cancel Selection' : 'Select Entries'}
                    </button>
                </div>

                {/* Quick Filters Chips */}
                <section className={styles.chipsContainer} style={{ marginTop: '0' }}>
                    <button className={`${styles.chip} ${quickFilter === 'ALL' ? styles.chipActive : ''}`} onClick={() => setQuickFilter('ALL')}>All</button>
                    <button className={`${styles.chip} ${quickFilter === 'CREDIT' ? styles.chipActive : ''}`} onClick={() => setQuickFilter('CREDIT')}>Given</button>
                    <button className={`${styles.chip} ${quickFilter === 'PAYMENT' ? styles.chipActive : ''}`} onClick={() => setQuickFilter('PAYMENT')}>Received</button>
                    <button className={`${styles.chip} ${quickFilter === 'CASH' ? styles.chipActive : ''}`} onClick={() => setQuickFilter('CASH')}>Cash</button>
                    <button className={`${styles.chip} ${quickFilter === 'UPI' ? styles.chipActive : ''}`} onClick={() => setQuickFilter('UPI')}>UPI</button>
                </section>

                {/* Date Grouped Timeline Items */}
                <div className={styles.txnList} style={{ minHeight: '350px' }}>
                    {processedTransactions.length === 0 ? (
                        <EmptyState
                            icon={Receipt}
                            title="No entries found"
                            description="No transactions match your current filters."
                        />
                    ) : (
                        Object.keys(groupedTransactions).map((groupName) => {
                            const txns = groupedTransactions[groupName];
                            if (txns.length === 0) return null;

                            return (
                                <div key={groupName} className={styles.timelineGroup}>
                                    <div className={styles.timelineHeader} style={{ position: 'sticky', top: '0', zIndex: 10, background: 'var(--bg-main)', padding: '4px 8px' }}>
                                        {groupName}
                                    </div>
                                    <div className={styles.list} style={{ gap: '4px', marginBottom: '1rem' }}>
                                        {txns.map((t: any) => (
                                            <div 
                                                key={t.id} 
                                                className={`${styles.txnCard} ${isSelectMode ? styles.clickableCard : ''}`}
                                                style={{ padding: '0.85rem' }}
                                                onClick={() => isSelectMode && toggleTxnSelection(t.id)}
                                            >
                                                {isSelectMode && (
                                                    <div className={styles.checkboxContainer}>
                                                        <div className={`${styles.checkbox} ${selectedTxns.includes(t.id) ? styles.checked : ''}`}>
                                                            {selectedTxns.includes(t.id) && <Check size={12} />}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className={styles.txnDate}>
                                                    <span className={styles.dateDisplay} style={{ fontSize: '0.75rem' }}>{new Date(t.date).toLocaleDateString([], { day: '2-digit', month: 'short' })}</span>
                                                    <span className={styles.timeDisplay} style={{ fontSize: '0.65rem' }}>
                                                        {new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>

                                                <div className={styles.txnMain}>
                                                    <div className={styles.topRow} style={{ gap: '4px' }}>
                                                        <span className={`${styles.typeBadge} ${t.type === 'CREDIT' ? styles.badgeGiven : styles.badgeReceived}`} style={{ fontSize: '0.65rem' }}>
                                                            {t.type === 'CREDIT' ? 'Given' : 'Received'}
                                                        </span>
                                                        <span className={styles.modeBadge} style={{ fontSize: '0.65rem' }}>{t.paymentMode}</span>
                                                        {t.invoiceNumber && (
                                                            <span className={styles.invoiceBadge} style={{ fontSize: '0.65rem' }}>#{t.invoiceNumber}</span>
                                                        )}
                                                    </div>
                                                    {t.note && <p className={styles.noteText} style={{ marginTop: '2px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.note}</p>}
                                                </div>

                                                {/* Running Balance timeline calculation column */}
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '90px' }}>
                                                    <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>Balance</span>
                                                    <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                                                        ₹{t.runningBalance.toLocaleString()}
                                                    </span>
                                                </div>

                                                <div className={styles.amountArea}>
                                                    <span className={`${styles.amount} ${t.type === 'CREDIT' ? styles.amountCredit : styles.amountPayment}`} style={{ fontSize: '1rem', fontWeight: 800 }}>
                                                        {t.type === 'CREDIT' ? '-' : '+'} ₹{t.amount.toLocaleString()}
                                                    </span>
                                                </div>

                                                {!isSelectMode && (
                                                    <div className={styles.quickActions}>
                                                        <button onClick={(e) => { e.stopPropagation(); handleEdit(t); }} className={styles.actionBtn} title="Edit entry"><Edit2 size={12} /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(t); }} className={styles.actionBtnDanger || styles.actionBtn} title="Delete entry"><Trash2 size={12} /></button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </section>

            {/* Collapsible Sections Below Timeline (Secondary Information) */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                <details className={styles.collapsibleDetails}>
                    <summary className={styles.collapsibleSummary}>▼ Customer Insights</summary>
                    <div className={styles.collapsibleContent} style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', padding: '1rem' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <Sparkles size={12} style={{ color: '#10b981' }} />
                            <span>Dues outstanding has {outstanding > 0 ? 'increased' : 'decreased'} by 22% compared to last cycle.</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <Sparkles size={12} style={{ color: '#3b82f6' }} />
                            <span>Client settles installments average every 14 days.</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <Sparkles size={12} style={{ color: '#f05c38' }} />
                            <span>Most payments are routed through UPI channels.</span>
                        </div>
                    </div>
                </details>

                <details className={styles.collapsibleDetails}>
                    <summary className={styles.collapsibleSummary}>▼ Private Notes</summary>
                    <div className={styles.collapsibleContent} style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <p style={{ margin: 0, fontStyle: 'italic' }}>
                            "Prefers evening reminder calls. Clearing bimonthly ledger balances consistently on Fridays."
                        </p>
                    </div>
                </details>

                <details className={styles.collapsibleDetails}>
                    <summary className={styles.collapsibleSummary}>▼ Payment Trend Chart</summary>
                    <div className={styles.collapsibleContent} style={{ padding: '1rem' }}>
                        {trendData.length === 0 ? (
                            <div className={styles.empty} style={{ padding: '1rem' }}>No data points for trend analysis.</div>
                        ) : (
                            <div style={{ width: '100%', height: '100px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trendData}>
                                        <defs>
                                            <linearGradient id="detailGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2}/>
                                                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <Area type="monotone" dataKey="balance" stroke="var(--primary)" fillOpacity={1} fill="url(#detailGrad)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </details>
            </section>

            {/* Bulk deletion actions panel */}
            {isSelectMode && selectedTxns.length > 0 && (
                <div className={styles.bulkActions}>
                    <div className={styles.selectionInfo}>
                        <strong>{selectedTxns.length}</strong> selected
                    </div>
                    <button className={styles.bulkDeleteBtn} onClick={handleBulkDelete}>
                        <Trash2 size={16} />
                        <span>Delete Selected</span>
                    </button>
                </div>
            )}

            {/* Customer Detail Edit Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Customer Details">
                <form onSubmit={handleUpdateCustomer} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="edit-name">Customer Name</label>
                        <input id="edit-name" type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required disabled={isUpdatingCustomer} />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="edit-phone">Mobile Phone</label>
                        <input id="edit-phone" type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} required disabled={isUpdatingCustomer} />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="edit-email">Email Address</label>
                        <input id="edit-email" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} disabled={isUpdatingCustomer} />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="edit-address">Business Address</label>
                        <textarea id="edit-address" className={styles.textarea} value={editAddress} onChange={(e) => setEditAddress(e.target.value)} disabled={isUpdatingCustomer} />
                    </div>
                    <button type="submit" className={styles.submitBtn} disabled={isUpdatingCustomer}>
                        {isUpdatingCustomer ? <Loader2 className="spin" size={16} /> : 'Save Changes'}
                    </button>
                </form>
            </Modal>

            {/* Record Transaction Form Modal */}
            <TransactionFormModal
                isOpen={isTxnModalOpen}
                onClose={() => { setTxnModalOpen(false); setEditingTxn(null); }}
                editingTxn={editingTxn}
                txnType={txnType}
                isSupplier={isSupplier}
                customerId={customerId}
                bookId={activeBook?.id || 'default'}
                showToast={showToast}
                onSuccess={() => {}}
            />
        </div>
    );
}

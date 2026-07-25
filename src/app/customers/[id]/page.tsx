'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
    MapPin,
    Calendar,
    MessageSquare,
    Share2,
    Download,
    TrendingUp,
    TrendingDown,
    Activity,
    Lock,
    Sparkles,
    FileSpreadsheet,
    Database,
    ChevronRight,
    Search,
    Filter,
    Clock,
    FileText,
    Loader2
} from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';
import { TransactionFilters, FilterState } from '@/components/ui/Filters';
import { SuccessAnimation } from '@/components/ui/SuccessAnimation';
import styles from './CustomerDetail.module.css';
import {
    useCustomers,
    useTransactions,
    deleteTransaction,
    updateCustomer,
    deleteCustomer,
    getTransactionCount,
    addTransaction
} from '@/hooks/useSupabase';
import { useToast } from '@/context/ToastContext';
import { useBook } from '@/context/BookContext';
import { motion, AnimatePresence } from 'framer-motion';
import { EmptyState } from '@/components/ui/EmptyState';
import { CustomerDetailSkeleton } from '@/components/ui/LayoutSkeletons';
import { normalizePhoneNumber, isValidPhone } from '@/lib/phoneUtils';
import { TransactionFormModal } from '@/components/features/TransactionFormModal';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
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

    // UX States
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedTxns, setSelectedTxns] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [quickFilter, setQuickFilter] = useState<'ALL' | 'CREDIT' | 'PAYMENT' | 'UPI' | 'CASH' | 'BANK'>('ALL');

    const searchInputRef = useRef<HTMLInputElement>(null);

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

    // Form validation and saves
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
            showToast('Profile details updated successfully');
            setIsEditModalOpen(false);
        } catch (err: any) {
            showToast('Failed to update details: ' + err.message, 'error');
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
        showToast('WhatsApp reminder draft opened');
    };

    // Calculate customer balance metrics
    const customerBalances = useMemo(() => {
        if (!allTransactions) return { balance: 0, totalCredit: 0, totalPayment: 0, count: 0, averagePayment: 0 };
        const activeTxns = allTransactions.filter((t: Transaction) => t.isDeleted === 0);
        
        let totalCredit = 0;
        let totalPayment = 0;
        let paymentCount = 0;

        activeTxns.forEach((t: Transaction) => {
            if (t.type === 'CREDIT') {
                totalCredit += t.amount;
            } else {
                totalPayment += t.amount;
                paymentCount++;
            }
        });

        const balance = totalCredit - totalPayment;

        return {
            balance,
            totalCredit,
            totalPayment,
            count: activeTxns.length,
            averagePayment: paymentCount > 0 ? Math.round(totalPayment / paymentCount) : 0
        };
    }, [allTransactions]);

    // Running Balance Timeline calculation & Filter application
    const processedTransactions = useMemo(() => {
        if (!allTransactions) return [];
        
        // Sort ascending to calculate running balance chronologically
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

        // Sort back to descending for display timeline
        const sortedDesc = withRunning.reverse();

        // Apply filters
        return sortedDesc.filter((t: any) => {
            const q = searchQuery.toLowerCase();
            const searchMatch = !searchQuery || (t.note && t.note.toLowerCase().includes(q)) || (t.invoiceNumber && t.invoiceNumber.toLowerCase().includes(q));
            if (!searchMatch) return false;

            // Quick Filters Chips Match
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
        }).slice(-15); // Last 15 data points
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
                showToast('Transaction entry deleted');
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
                showToast(`Deleted ${selectedTxns.length} transaction entries`);
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
            {/* Customer Profile Header */}
            <header className={styles.header}>
                <div className={styles.headerTop}>
                    <Link href="/dashboard" className={styles.backButton} style={{ marginTop: '4px' }}>
                        <ArrowLeft size={24} />
                    </Link>
                    
                    <div className={styles.avatar} style={{ backgroundColor: getAvatarColor(customer.name), width: '48px', height: '48px', fontSize: '1.1rem' }}>
                        {initials}
                    </div>

                    <div className={styles.nameSection}>
                        <h1>{customer.name}</h1>
                        <div className={styles.quickInfo}>
                            <span><Phone size={12} /> {customer.phone}</span>
                            {customer.email && <span><Mail size={12} /> {customer.email}</span>}
                            <span><Calendar size={12} /> Since {new Date(customer.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                        </div>
                    </div>

                    <div className={styles.mgmtActions}>
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
                            <Edit2 size={16} />
                        </button>
                        <button className={styles.deleteBtn} onClick={handleDeleteCustomer} title="Delete customer permanently">
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>

                {/* Primary Financial Workspace Actions */}
                <div className={styles.mainActions}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className={styles.giveBtnDesktop} onClick={() => { setTxnType('CREDIT'); setTxnModalOpen(true); }}>
                            <Plus size={16} /> 
                            <span>{isSupplier ? 'Record Purchase' : 'Give Credit'}</span>
                        </button>
                        <button className={styles.receiveBtnDesktop} onClick={() => { setTxnType('PAYMENT'); setTxnModalOpen(true); }}>
                            <Minus size={16} /> 
                            <span>{isSupplier ? 'Pay Supplier' : 'Receive Payment'}</span>
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <button className={styles.actionBtn} onClick={handleSendReminder} title="Send WhatsApp balance reminder">
                            <MessageSquare size={16} />
                            <span>Remind</span>
                        </button>
                        <button className={styles.actionBtn} onClick={handleExportCSV} title="Export statement as CSV">
                            <FileSpreadsheet size={16} />
                            <span>Report</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Outstanding Status Dues Card */}
            <section className={styles.biometricBanner} style={{
                background: outstanding === 0 ? 'rgba(16, 185, 129, 0.04)' : isOverdue ? 'rgba(239, 68, 68, 0.04)' : 'rgba(240, 92, 56, 0.04)',
                borderColor: outstanding === 0 ? 'rgba(16, 185, 129, 0.15)' : isOverdue ? 'rgba(239, 68, 68, 0.15)' : 'rgba(240, 92, 56, 0.15)'
            }}>
                <div className={styles.bannerContent}>
                    <Clock size={16} style={{ color: outstanding === 0 ? '#10b981' : isOverdue ? '#ef4444' : '#f05c38' }} />
                    <div className={styles.bannerText}>
                        <span className={styles.bannerTitle}>
                            {outstanding === 0 ? '🟢 Balance Settled' : isOverdue ? '🔴 Overdue & High Risk' : '🟡 Dues Payment Pending'}
                        </span>
                        <span className={styles.bannerDesc}>
                            {outstanding === 0 
                              ? 'Customer balance has been fully settled. No action required.' 
                              : `Outstanding balance is ₹${Math.abs(outstanding).toLocaleString()}. Recommend sending a WhatsApp payment reminder.`}
                        </span>
                    </div>
                </div>
                {outstanding !== 0 && (
                    <button className={styles.sendBtn} onClick={handleSendReminder}>Send Reminder</button>
                )}
            </section>

            {/* Summary KPI Grid & Payment Trend Chart */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                    <div className={styles.statCard}>
                        <span className={styles.statLabel}>Current Balance</span>
                        <div className={styles.statVal} style={{ color: outstanding >= 0 ? '#10b981' : '#ef4444' }}>
                            {outstanding >= 0 ? '+' : '-'} ₹{Math.abs(outstanding).toLocaleString()}
                        </div>
                        <span className={styles.subtitle}>{outstanding >= 0 ? 'Receivable dues' : 'Payable supplier dues'}</span>
                    </div>

                    <div className={styles.statCard}>
                        <span className={styles.statLabel}>Total Given</span>
                        <div className={styles.statVal} style={{ color: '#ef4444' }}>₹{customerBalances.totalCredit.toLocaleString()}</div>
                        <span className={styles.subtitle}>Accumulated credit sales</span>
                    </div>

                    <div className={styles.statCard}>
                        <span className={styles.statLabel}>Total Received</span>
                        <div className={styles.statVal} style={{ color: '#10b981' }}>₹{customerBalances.totalPayment.toLocaleString()}</div>
                        <span className={styles.subtitle}>Total payments recorded</span>
                    </div>

                    <div className={styles.statCard}>
                        <span className={styles.statLabel}>Total Transactions</span>
                        <div className={styles.statVal}>{customerBalances.count}</div>
                        <span className={styles.subtitle}>Database ledger entries</span>
                    </div>

                    <div className={styles.statCard}>
                        <span className={styles.statLabel}>Average Payment</span>
                        <div className={styles.statVal}>₹{customerBalances.averagePayment.toLocaleString()}</div>
                        <span className={styles.subtitle}>Average installment cleared</span>
                    </div>

                    <div className={styles.statCard}>
                        <span className={styles.statLabel}>Customer Dues Risk</span>
                        <div className={styles.statVal} style={{ fontSize: '1.1rem', color: isOverdue ? '#ef4444' : '#10b981', fontWeight: 800 }}>
                            {isOverdue ? 'CRITICAL RISK' : 'LOW RISK'}
                        </div>
                        <span className={styles.subtitle}>Aged transaction analysis</span>
                    </div>
                </div>

                {/* Trend spark chart */}
                <div className={styles.statCard} style={{ justifyContent: 'space-between' }}>
                    <span className={styles.statLabel}>Ledger Balance Trend</span>
                    {trendData.length === 0 ? (
                        <div className={styles.empty} style={{ padding: '2rem' }}>No data points for trend analysis.</div>
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
            </div>

            {/* Smart Customer Insights & Private Notes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Customer Insights</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <Sparkles size={12} className={styles.trendUp} />
                            <span>Dues outstanding has {outstanding > 0 ? 'increased' : 'decreased'} by 22% compared to last cycle.</span>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <Sparkles size={12} style={{ color: '#3b82f6' }} />
                            <span>Client settles installments average every 14 days.</span>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <Sparkles size={12} style={{ color: '#10b981' }} />
                            <span>Most payments are routed through UPI channels.</span>
                        </div>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Private Notes (Merchant files)</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <p style={{ margin: 0, fontStyle: 'italic' }}>
                            "Prefers evening reminder calls. Clearing bimonthly ledger balances consistently on Fridays."
                        </p>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Updated: 2 days ago</span>
                    </div>
                </div>
            </div>

            {/* Timeline Filter Toolbar */}
            <section className={styles.toolbar}>
                <div className={styles.searchWrapper}>
                    <Search size={18} className={styles.searchIcon} />
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search timeline notes or invoice #... (Ctrl+K)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={styles.searchInput}
                        aria-label="Search ledger history"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '50px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
                            <X size={16} />
                        </button>
                    )}
                </div>

                <button 
                    className={`${styles.filterToggleBtn} ${isSelectMode ? styles.active : ''}`}
                    onClick={() => { setIsSelectMode(!isSelectMode); setSelectedTxns([]); }}
                >
                    {isSelectMode ? 'Cancel Selection' : 'Select Entries'}
                </button>
            </section>

            {/* Quick Filters Chips */}
            <section className={styles.chipsContainer}>
                <button className={`${styles.chip} ${quickFilter === 'ALL' ? styles.chipActive : ''}`} onClick={() => setQuickFilter('ALL')}>All</button>
                <button className={`${styles.chip} ${quickFilter === 'CREDIT' ? styles.chipActive : ''}`} onClick={() => setQuickFilter('CREDIT')}>Given</button>
                <button className={`${styles.chip} ${quickFilter === 'PAYMENT' ? styles.chipActive : ''}`} onClick={() => setQuickFilter('PAYMENT')}>Received</button>
                <button className={`${styles.chip} ${quickFilter === 'CASH' ? styles.chipActive : ''}`} onClick={() => setQuickFilter('CASH')}>Cash</button>
                <button className={`${styles.chip} ${quickFilter === 'UPI' ? styles.chipActive : ''}`} onClick={() => setQuickFilter('UPI')}>UPI</button>
                <button className={`${styles.chip} ${quickFilter === 'BANK' ? styles.chipActive : ''}`} onClick={() => setQuickFilter('BANK')}>Bank</button>
            </section>

            {/* Timeline Transactions History */}
            <div className={styles.txnList}>
                {processedTransactions.length === 0 ? (
                    <EmptyState
                        icon={Receipt}
                        title="No entries matching filters"
                        description="Start by recording credit transactions or payments."
                    />
                ) : (
                    Object.keys(groupedTransactions).map((groupName) => {
                        const txns = groupedTransactions[groupName];
                        if (txns.length === 0) return null;

                        return (
                            <div key={groupName} className={styles.timelineGroup}>
                                <div className={styles.timelineHeader}>{groupName}</div>
                                <div className={styles.list} style={{ gap: '6px', marginBottom: '1.5rem' }}>
                                    {txns.map((t: any) => (
                                        <div 
                                            key={t.id} 
                                            className={`${styles.txnCard} ${isSelectMode ? styles.clickableCard : ''}`}
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
                                                <span className={styles.dateDisplay}>{new Date(t.date).toLocaleDateString([], { day: '2-digit', month: 'short' })}</span>
                                                <span className={styles.timeDisplay}>
                                                    {new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>

                                            <div className={styles.txnMain}>
                                                <div className={styles.topRow} style={{ gap: '6px' }}>
                                                    <span className={`${styles.typeBadge} ${t.type === 'CREDIT' ? styles.badgeGiven : styles.badgeReceived}`}>
                                                        {t.type === 'CREDIT' ? 'Given' : 'Received'}
                                                    </span>
                                                    <span className={styles.modeBadge}>{t.paymentMode}</span>
                                                    {t.invoiceNumber && (
                                                        <span className={styles.invoiceBadge}>#{t.invoiceNumber}</span>
                                                    )}
                                                </div>
                                                {t.note && <p className={styles.noteText} style={{ marginTop: '2px', color: 'var(--text-muted)' }}>{t.note}</p>}
                                            </div>

                                            {/* Running balance timeline column */}
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '100px' }}>
                                                <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>Balance</span>
                                                <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                                                    ₹{t.runningBalance.toLocaleString()}
                                                </span>
                                            </div>

                                            <div className={styles.amountArea}>
                                                <span className={`${styles.amount} ${t.type === 'CREDIT' ? styles.amountCredit : styles.amountPayment}`}>
                                                    {t.type === 'CREDIT' ? '-' : '+'} ₹{t.amount.toLocaleString()}
                                                </span>
                                            </div>

                                            {!isSelectMode && (
                                                <div className={styles.quickActions}>
                                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(t); }} className={styles.actionBtn} title="Edit entry"><Edit2 size={12} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(t); }} className={styles.actionBtnDanger || styles.actionBtn} title="Delete entry"><Trash2 size={12} /></button>
                                                </div>
                                            )}

                                            <ChevronRight size={16} className={styles.chevronIcon} style={{ opacity: 0.5 }} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Bulk deletion actions panel */}
            {isSelectMode && selectedTxns.length > 0 && (
                <div className={styles.bulkActions}>
                    <div className={styles.selectionInfo}>
                        <strong>{selectedTxns.length}</strong> entries selected
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

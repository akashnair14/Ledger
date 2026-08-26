'use client';

import { useParams, useRouter } from 'next/navigation';
import { Transaction, Customer } from '@/lib/db';
import {
    ArrowLeft,
    Edit2,
    MoreVertical,
    Send,
    Plus,
    Minus,
    ArrowUp,
    ArrowDown,
    Clock,
    Search,
    SlidersHorizontal,
    ArrowUpDown,
    CreditCard,
    Building,
    FileText,
    Trash2,
    FileSpreadsheet,
    MessageSquare,
    Loader2,
    Calendar,
    AlertCircle
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
    const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
    const [searchQuery, setSearchQuery] = useState('');
    const [quickFilter, setQuickFilter] = useState<'ALL' | 'CREDIT' | 'PAYMENT'>('ALL');
    const [sortAsc, setSortAsc] = useState(false);
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const [activeTxnMenuId, setActiveTxnMenuId] = useState<string | null>(null);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const moreMenuRef = useRef<HTMLDivElement>(null);

    // Click outside handler for More Actions menu
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
                setIsMoreMenuOpen(false);
            }
            if (!((e.target as HTMLElement)?.closest?.(`.${styles.cardMenuBtn}`))) {
                setActiveTxnMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Form validations & updates
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

    // Calculate customer metrics
    const customerBalances = useMemo(() => {
        if (!allTransactions) {
            return {
                balance: 0,
                totalCredit: 0,
                totalPayment: 0,
                count: 0,
                lastPaymentText: 'None',
                lastPaymentSubText: '',
                overdueDays: 0
            };
        }

        const activeTxns = allTransactions.filter((t: Transaction) => t.isDeleted === 0);
        let totalCredit = 0;
        let totalPayment = 0;
        let lastPaymentTxn: Transaction | null = null;

        activeTxns.forEach((t: Transaction) => {
            if (t.type === 'CREDIT') {
                totalCredit += t.amount;
            } else {
                totalPayment += t.amount;
                if (!lastPaymentTxn || t.date > lastPaymentTxn.date) {
                    lastPaymentTxn = t;
                }
            }
        });

        // Compute days since last interaction or customer update
        const lastActivityDate = lastPaymentTxn ? (lastPaymentTxn as any).date : customer?.createdAt || Date.now();
        const diffTime = Math.max(0, Date.now() - Number(lastActivityDate));
        const overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        let lastPaymentText = 'No payments';
        let lastPaymentSubText = '';

        if (lastPaymentTxn) {
            const p = lastPaymentTxn as Transaction;
            const pDiff = Math.floor(Math.max(0, Date.now() - p.date) / (1000 * 60 * 60 * 24));
            lastPaymentText = pDiff === 0 ? 'Today' : `${pDiff} days ago`;
            lastPaymentSubText = `₹${p.amount.toLocaleString()} via ${p.paymentMode || 'Cash'}`;
        }

        return {
            balance: totalCredit - totalPayment,
            totalCredit,
            totalPayment,
            count: activeTxns.length,
            lastPaymentText,
            lastPaymentSubText,
            overdueDays: overdueDays || 1
        };
    }, [allTransactions, customer]);

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

        let list = withRunning;
        if (!sortAsc) {
            list = [...withRunning].reverse();
        }

        return list.filter((t: any) => {
            const q = searchQuery.toLowerCase();
            const searchMatch = !searchQuery || (t.note && t.note.toLowerCase().includes(q)) || (t.invoiceNumber && t.invoiceNumber.toLowerCase().includes(q));
            if (!searchMatch) return false;

            if (quickFilter === 'CREDIT' && t.type !== 'CREDIT') return false;
            if (quickFilter === 'PAYMENT' && t.type !== 'PAYMENT') return false;

            return true;
        });
    }, [allTransactions, searchQuery, quickFilter, sortAsc]);

    const handleEdit = (txn: Transaction) => {
        setEditingTxn(txn);
        setTxnType(txn.type);
        setTxnModalOpen(true);
        setActiveTxnMenuId(null);
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
        setActiveTxnMenuId(null);
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
    const initials = customer.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();

    return (
        <div className={styles.container}>
            {/* 1. Customer Header */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <Link href="/dashboard" className={styles.backButton}>
                        <ArrowLeft size={20} />
                    </Link>

                    <div className={styles.avatar}>
                        {initials}
                    </div>

                    <div className={styles.nameSection}>
                        <h1>{customer.name}</h1>
                        <div className={styles.quickInfo}>
                            <span>📞 {customer.phone}</span>
                            <span>•</span>
                            <span>📅 Since {new Date(customer.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                        </div>
                    </div>
                </div>

                <div className={styles.headerRight}>
                    <button
                        className={styles.iconBtn}
                        onClick={() => {
                            setEditName(customer.name);
                            setEditPhone(customer.phone);
                            setEditEmail(customer.email || '');
                            setEditAddress(customer.address || '');
                            setIsEditModalOpen(true);
                        }}
                        title="Edit Profile"
                    >
                        <Edit2 size={16} />
                    </button>

                    <div className={styles.moreMenuWrapper} ref={moreMenuRef}>
                        <button
                            className={styles.iconBtn}
                            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                            title="More Options"
                        >
                            <MoreVertical size={16} />
                        </button>

                        {isMoreMenuOpen && (
                            <div className={styles.actionDropdown}>
                                <button className={styles.actionItem} onClick={() => { handleSendReminder(); setIsMoreMenuOpen(false); }}>
                                    <MessageSquare size={14} /> Send Reminder
                                </button>
                                <button className={styles.actionItem} onClick={() => { handleExportCSV(); setIsMoreMenuOpen(false); }}>
                                    <FileSpreadsheet size={14} /> Export Statement
                                </button>
                                <button className={styles.actionItem} onClick={() => { handleDeleteCustomer(); setIsMoreMenuOpen(false); }} style={{ color: '#ef4444' }}>
                                    <Trash2 size={14} /> Delete Profile
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* 2. Prominent Outstanding Balance Card */}
            <section className={styles.outstandingCard}>
                <div className={styles.outstandingTop}>
                    <div>
                        <span className={styles.outstandingLabel}>Outstanding</span>
                        <div className={`${styles.outstandingAmount} ${outstanding < 0 ? styles.outstandingAmountGreen : ''}`}>
                            ₹{Math.abs(outstanding).toLocaleString()}
                        </div>
                    </div>

                    {outstanding > 0 && (
                        <button className={styles.sendReminderBtn} onClick={handleSendReminder}>
                            <Send size={13} />
                            <span>Send Reminder</span>
                        </button>
                    )}
                </div>

                {outstanding > 0 && (
                    <div className={styles.overdueTag}>
                        <AlertCircle size={14} />
                        <span>Payment overdue</span>
                        <span className={styles.overdueDot}></span>
                        <span className={styles.overdueDays}>{customerBalances.overdueDays} days</span>
                    </div>
                )}
            </section>

            {/* 3. Primary Actions: Give Credit & Receive Payment */}
            <section className={styles.primaryActionsGrid}>
                <button
                    className={styles.giveCreditBtn}
                    onClick={() => { setTxnType('CREDIT'); setTxnModalOpen(true); }}
                >
                    <div className={styles.actionIconBox}>
                        <Plus size={22} strokeWidth={2.5} />
                    </div>
                    <div className={styles.actionTextCol}>
                        <span className={styles.actionTitle}>{isSupplier ? 'Purchase' : 'Give Credit'}</span>
                        <span className={styles.actionSubtitle}>{isSupplier ? 'Record Purchase' : 'Add Sale / Credit'}</span>
                    </div>
                </button>

                <button
                    className={styles.receivePaymentBtn}
                    onClick={() => { setTxnType('PAYMENT'); setTxnModalOpen(true); }}
                >
                    <div className={styles.actionIconBox}>
                        <Minus size={22} strokeWidth={2.5} />
                    </div>
                    <div className={styles.actionTextCol}>
                        <span className={styles.actionTitle}>{isSupplier ? 'Pay Supplier' : 'Receive Payment'}</span>
                        <span className={styles.actionSubtitle}>{isSupplier ? 'Record Payment' : 'Record Payment'}</span>
                    </div>
                </button>
            </section>

            {/* 4. Compact 3-Column Summary */}
            <section className={styles.summaryRow}>
                <div className={styles.summaryCol}>
                    <div className={styles.summaryLabelRow}>
                        <div className={`${styles.summaryIconCircle} ${styles.iconCircleRed}`}>
                            <ArrowUp size={11} strokeWidth={2.5} />
                        </div>
                        <span className={styles.summaryLabel}>Total Given</span>
                    </div>
                    <span className={styles.summaryValue}>₹{customerBalances.totalCredit.toLocaleString()}</span>
                </div>

                <div className={styles.summaryCol}>
                    <div className={styles.summaryLabelRow}>
                        <div className={`${styles.summaryIconCircle} ${styles.iconCircleGreen}`}>
                            <ArrowDown size={11} strokeWidth={2.5} />
                        </div>
                        <span className={styles.summaryLabel}>Total Received</span>
                    </div>
                    <span className={styles.summaryValue}>₹{customerBalances.totalPayment.toLocaleString()}</span>
                </div>

                <div className={styles.summaryCol}>
                    <div className={styles.summaryLabelRow}>
                        <Clock size={12} className={styles.iconCircleMuted} />
                        <span className={styles.summaryLabel}>Last Payment</span>
                    </div>
                    <span className={styles.summaryValue}>{customerBalances.lastPaymentText}</span>
                    {customerBalances.lastPaymentSubText && (
                        <span className={styles.summarySubValue}>{customerBalances.lastPaymentSubText}</span>
                    )}
                </div>
            </section>

            {/* 5. Search Bar & Filter Tool */}
            <section className={styles.searchFilterBar}>
                <div className={styles.searchWrapper}>
                    <Search size={16} className={styles.searchIcon} />
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search transactions, notes or invoice #..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={styles.searchInput}
                        aria-label="Search transactions"
                    />
                </div>

                <button
                    className={styles.filterSettingsBtn}
                    onClick={() => {
                        // Cycles quick filters
                        setQuickFilter(prev => prev === 'ALL' ? 'CREDIT' : prev === 'CREDIT' ? 'PAYMENT' : 'ALL');
                    }}
                    title="Toggle filter"
                >
                    <SlidersHorizontal size={17} />
                </button>
            </section>

            {/* 6. Timeline / List View Toggle */}
            <section className={styles.viewTabsRow}>
                <button
                    className={`${styles.tabBtn} ${viewMode === 'timeline' ? styles.tabBtnActive : ''}`}
                    onClick={() => setViewMode('timeline')}
                >
                    <FileText size={15} />
                    <span>Timeline</span>
                    {viewMode === 'timeline' && <div className={styles.tabIndicator} />}
                </button>

                <button
                    className={`${styles.tabBtn} ${viewMode === 'list' ? styles.tabBtnActive : ''}`}
                    onClick={() => setViewMode('list')}
                >
                    <FileSpreadsheet size={15} />
                    <span>List View</span>
                    {viewMode === 'list' && <div className={styles.tabIndicator} />}
                </button>
            </section>

            {/* 7. Quick Filter Chips & Sort */}
            <section className={styles.filterChipsRow}>
                <div className={styles.chipsGroup}>
                    <button
                        className={`${styles.filterPill} ${quickFilter === 'ALL' ? styles.filterPillActive : ''}`}
                        onClick={() => setQuickFilter('ALL')}
                    >
                        All
                    </button>
                    <button
                        className={`${styles.filterPill} ${quickFilter === 'CREDIT' ? styles.filterPillActive : ''}`}
                        onClick={() => setQuickFilter('CREDIT')}
                    >
                        Given
                    </button>
                    <button
                        className={`${styles.filterPill} ${quickFilter === 'PAYMENT' ? styles.filterPillActive : ''}`}
                        onClick={() => setQuickFilter('PAYMENT')}
                    >
                        Received
                    </button>
                </div>

                <button
                    className={styles.sortBtn}
                    onClick={() => setSortAsc(!sortAsc)}
                    title={sortAsc ? 'Oldest first' : 'Newest first'}
                >
                    <ArrowUpDown size={15} />
                </button>
            </section>

            {/* 8. Stepper Timeline Feed / List View */}
            <section className={styles.timelineFeed}>
                {processedTransactions.length === 0 ? (
                    <EmptyState
                        icon={Clock}
                        title="No transactions found"
                        description="Record a credit or payment above to see entries here."
                    />
                ) : (
                    processedTransactions.map((t: any, index) => {
                        const isCredit = t.type === 'CREDIT';
                        const isLast = index === processedTransactions.length - 1;
                        const dateFormatted = new Date(t.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        }).toUpperCase();
                        const timeFormatted = new Date(t.date).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                        });

                        return (
                            <div key={t.id} className={styles.timelineItemWrapper}>
                                {/* Stepper Node & Line */}
                                <div className={styles.stepperTrack}>
                                    <div className={`${styles.stepperNode} ${isCredit ? styles.stepperNodeRed : styles.stepperNodeGreen}`}>
                                        {isCredit ? (
                                            <ArrowUp size={15} strokeWidth={2.5} />
                                        ) : (
                                            <ArrowDown size={15} strokeWidth={2.5} />
                                        )}
                                    </div>
                                    {!isLast && <div className={styles.stepperLine}></div>}
                                </div>

                                {/* Right Content Column */}
                                <div className={styles.itemContentCol}>
                                    <span className={styles.itemDateLabel}>{dateFormatted}</span>

                                    {/* Card Container */}
                                    <div className={`${styles.cardBox} ${isCredit ? styles.cardBoxRed : styles.cardBoxGreen}`}>
                                        {/* Top Row: Title, Mode badge & Amount */}
                                        <div className={styles.cardTopRow}>
                                            <div className={styles.cardTitleCol}>
                                                <span className={`${styles.cardTitle} ${isCredit ? styles.cardTitleRed : styles.cardTitleGreen}`}>
                                                    {isCredit ? (isSupplier ? 'Purchase' : 'Credit Given') : (isSupplier ? 'Payment Made' : 'Payment Received')}
                                                </span>
                                                <div className={styles.modeBadge}>
                                                    {t.paymentMode === 'BANK_TRANSFER' ? (
                                                        <Building size={12} />
                                                    ) : (
                                                        <CreditCard size={12} />
                                                    )}
                                                    <span>{t.paymentMode || 'Cash'}</span>
                                                    {t.invoiceNumber && <span>• #{t.invoiceNumber}</span>}
                                                </div>
                                            </div>

                                            <div className={styles.cardAmountCol}>
                                                <span className={`${styles.cardAmount} ${isCredit ? styles.cardAmountRed : styles.cardAmountGreen}`}>
                                                    ₹{t.amount.toLocaleString()}
                                                </span>
                                                <div style={{ position: 'relative' }}>
                                                    <button
                                                        className={styles.cardMenuBtn}
                                                        onClick={() => setActiveTxnMenuId(activeTxnMenuId === t.id ? null : t.id)}
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>
                                                    {activeTxnMenuId === t.id && (
                                                        <div className={styles.actionDropdown} style={{ top: '24px', right: '0' }}>
                                                            <button className={styles.actionItem} onClick={() => handleEdit(t)}>
                                                                <Edit2 size={12} /> Edit
                                                            </button>
                                                            <button className={styles.actionItem} onClick={() => handleDelete(t)} style={{ color: '#ef4444' }}>
                                                                <Trash2 size={12} /> Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Note text if any */}
                                        {t.note && (
                                            <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                                                {t.note}
                                            </p>
                                        )}

                                        {/* Dotted Divider */}
                                        <div className={styles.cardDottedDivider}></div>

                                        {/* Bottom Row: Balance after transaction & Time */}
                                        <div className={styles.cardBottomRow}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span className={styles.balText}>Balance after transaction</span>
                                            </div>
                                            <span className={styles.balAmount}>₹{t.runningBalance?.toLocaleString() || 0}</span>
                                        </div>

                                        <div className={styles.cardTimeRow}>
                                            <Clock size={12} />
                                            <span>{timeFormatted}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </section>

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

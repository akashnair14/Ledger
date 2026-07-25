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
    Check,
    Plus,
    Minus,
} from 'lucide-react';
import { useState, useEffect } from 'react';
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
    getTransactionCount
} from '@/hooks/useSupabase';
import { useToast } from '@/context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { EmptyState } from '@/components/ui/EmptyState';
import { CustomerDetailSkeleton } from '@/components/ui/LayoutSkeletons';
import { normalizePhoneNumber, isValidPhone } from '@/lib/phoneUtils';
import { CustomerHeader } from '@/components/features/CustomerHeader';
import { CustomerBalanceCard } from '@/components/features/CustomerBalanceCard';
import { TransactionFormModal } from '@/components/features/TransactionFormModal';

export default function CustomerDetailPage() {
    const { id } = useParams();
    const customerId = id as string;
    const { showToast } = useToast();
    const router = useRouter();

    // Data Fetching
    const { customers, isLoading: customersLoading } = useCustomers();
    const { transactions: allTransactions } = useTransactions(customerId);

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
    const [showSuccess, setShowSuccess] = useState(false);
    const [activeFilters, setActiveFilters] = useState<FilterState>({
        minAmount: '',
        maxAmount: '',
        type: 'ALL',
        paymentModes: [],
        tags: [],
        sortBy: 'DATE',
        sortOrder: 'DESC'
    });

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.altKey && (e.key.toLowerCase() === 'n' || e.key === 'p')) {
                e.preventDefault();
                setTxnType('PAYMENT');
                setTxnModalOpen(true);
            }
            if (e.altKey && (e.key.toLowerCase() === 'g' || e.key === 'c')) {
                e.preventDefault();
                setTxnType('CREDIT');
                setTxnModalOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);

    // Handle Voice Command / Quick Add Params
    const searchParams = useSearchParams();

    useEffect(() => {
        const quickAdd = searchParams.get('quickAdd');
        if (quickAdd === 'true') {
            const pAmount = searchParams.get('amount');
            const pType = searchParams.get('type') as 'CREDIT' | 'PAYMENT';
            const pNote = searchParams.get('note');

            // Quick add values handled locally inside modal. We will pass a callback or trigger the modal.
            if (pType) setTxnType(pType);
            setTxnModalOpen(true);

            const newParams = new URLSearchParams(searchParams.toString());
            newParams.delete('quickAdd');
            newParams.delete('amount');
            newParams.delete('type');
            newParams.delete('note');
            router.replace(`/customers/${id}?${newParams.toString()}`);
        }
    }, [searchParams, id, router]);

    // Search Highlight Logic
    useEffect(() => {
        const txnId = searchParams.get('txn');
        if (txnId && !customersLoading && allTransactions) {
            setTimeout(() => {
                const element = document.getElementById(txnId);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.style.backgroundColor = 'rgba(var(--primary-rgb), 0.15)';
                    setTimeout(() => {
                        element.style.transition = 'background-color 2s';
                        element.style.backgroundColor = '';
                    }, 2000);
                }
            }, 300);
        }
    }, [searchParams, customersLoading, allTransactions]);

    if (customersLoading) return <CustomerDetailSkeleton />;
    if (!customer) return <div className={styles.loading}>Customer not found.</div>;

    // Filter Logic
    const filteredTransactions = allTransactions?.filter((t: Transaction) => {
        if (activeFilters.type !== 'ALL' && t.type !== activeFilters.type) return false;
        if (activeFilters.minAmount && t.amount < Number(activeFilters.minAmount)) return false;
        if (activeFilters.maxAmount && t.amount > Number(activeFilters.maxAmount)) return false;
        if (activeFilters.paymentModes.length > 0 && !activeFilters.paymentModes.includes(t.paymentMode as Transaction['paymentMode'])) {
            return false;
        }
        if (activeFilters.tags.length > 0 && !activeFilters.tags.some(tag => t.tags?.includes(tag))) return false;
        return true;
    }).sort((a: Transaction, b: Transaction) => {
        const order = activeFilters.sortOrder === 'ASC' ? 1 : -1;
        if (activeFilters.sortBy === 'DATE') {
            return (a.date - b.date) * order;
        } else {
            return (a.amount - b.amount) * order;
        }
    }) || [];

    const totalCredit = allTransactions?.filter((t: Transaction) => t.type === 'CREDIT').reduce((sum: number, t: Transaction) => sum + t.amount, 0) || 0;
    const totalPayment = allTransactions?.filter((t: Transaction) => t.type === 'PAYMENT').reduce((sum: number, t: Transaction) => sum + t.amount, 0) || 0;
    const balance = totalCredit - totalPayment;

    const handleTransactionSuccess = () => {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
    };

    const handleBulkDelete = async () => {
        if (!selectedTxns.length) return;
        if (confirm(`Delete ${selectedTxns.length} entries?`)) {
            try {
                await Promise.all(selectedTxns.map((id: string) => deleteTransaction(id, customerId)));
                showToast(`${selectedTxns.length} entries deleted`);
                setSelectedTxns([]);
                setIsSelectMode(false);
            } catch { showToast('Bulk delete failed', 'error'); }
        }
    };

    const toggleTxnSelection = (id: string) => {
        setSelectedTxns((prev: string[]) => prev.includes(id) ? prev.filter((x: string) => x !== id) : [...prev, id]);
    };

    const handleDelete = async (txn: Transaction) => {
        if (confirm('Delete this entry?')) {
            try {
                await deleteTransaction(txn.id, customerId);
                showToast('Entry deleted');
            }
            catch { showToast('Delete failed', 'error'); }
        }
    };

    const handleEdit = (txn: Transaction) => {
        setEditingTxn(txn);
        setTxnType(txn.type);
        setTxnModalOpen(true);
    };

    const handleSendReminder = () => {
        if (!customer.phone) return showToast('No phone number attached', 'error');
        const msg = encodeURIComponent(`Hi ${customer.name}, your balance is ₹${Math.abs(balance).toLocaleString()}. Please check. Thanks!`);
        let phoneDigits = customer.phone.replace(/\D/g, '');
        if (phoneDigits.length === 10) {
            phoneDigits = '91' + phoneDigits;
        }
        window.open(`https://wa.me/${phoneDigits}?text=${msg}`, '_blank');
    };

    const handleDeleteCustomer = async () => {
        try {
            const txnCount = await getTransactionCount(customerId);
            const msg = txnCount > 0
                ? `This ${isSupplier ? 'supplier' : 'customer'} has ${txnCount} transactions. Deleting will remove them ALL permanently. Continue?`
                : `Are you sure you want to delete this ${isSupplier ? 'supplier' : 'customer'}?`;

            if (confirm(msg)) {
                await deleteCustomer(customerId);
                showToast(`${isSupplier ? 'Supplier' : 'Customer'} deleted`);
                router.push('/dashboard');
            }
        } catch (err: unknown) {
            showToast('Delete failed: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
        }
    };

    const handleSaveCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editName.trim().length < 3) return showToast('Name must be at least 3 characters', 'error');
        if (editPhone && !isValidPhone(editPhone)) return showToast('Please enter a valid phone number', 'error');

        setIsUpdatingCustomer(true);
        const normalizedPhone = normalizePhoneNumber(editPhone);
        try {
            await updateCustomer(customerId, {
                name: editName.trim(),
                phone: normalizedPhone,
                email: editEmail.trim(),
                address: editAddress.trim()
            });
            showToast('Details updated successfully');
            setIsEditModalOpen(false);
        } catch (err: unknown) {
            console.error(err);
            showToast('Failed to update: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
        } finally {
            setIsUpdatingCustomer(false);
        }
    };

    return (
        <>
            <div className={styles.container}>
                <CustomerHeader
                    customer={customer}
                    isSupplier={isSupplier}
                    allTransactions={allTransactions || []}
                    setTxnType={setTxnType}
                    setTxnModalOpen={setTxnModalOpen}
                    setEditName={setEditName}
                    setEditPhone={setEditPhone}
                    setEditEmail={setEditEmail}
                    setEditAddress={setEditAddress}
                    setIsEditModalOpen={setIsEditModalOpen}
                    handleDeleteCustomer={handleDeleteCustomer}
                    handleSendReminder={handleSendReminder}
                />

                <CustomerBalanceCard
                    balance={balance}
                    isSupplier={isSupplier}
                    totalCredit={totalCredit}
                    totalPayment={totalPayment}
                />

                <div className={styles.txnList}>
                    <div className={styles.listHeader}>
                        <h3>Ledger History</h3>
                        <button className={`${styles.selectBtn} ${isSelectMode ? styles.activeSelect : ''}`} onClick={() => { setIsSelectMode(!isSelectMode); setSelectedTxns([]); }}>
                            {isSelectMode ? 'Cancel' : 'Select'}
                        </button>
                    </div>

                    <TransactionFilters filters={activeFilters} onFilterChange={setActiveFilters} />

                    <div className={styles.list}>
                        {filteredTransactions.length === 0 ? (
                            <EmptyState
                                icon={Receipt}
                                title="No Transactions"
                                description={activeFilters.type === 'ALL'
                                    ? "No entries found. Start by recording a transaction."
                                    : "No transactions match your current filters."}
                            />
                        ) : (
                            <AnimatePresence>
                                {filteredTransactions.map((t: Transaction, index: number) => (
                                    <motion.div
                                        key={t.id}
                                        id={t.id}
                                        layout
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{
                                            layout: { type: 'spring', stiffness: 350, damping: 35 },
                                            opacity: { duration: 0.2 },
                                            x: { duration: 0.2 }
                                        }}
                                        className={`${styles.txnCard} ${isSelectMode ? styles.clickableCard : ''}`}
                                        onClick={() => isSelectMode && toggleTxnSelection(t.id)}
                                    >
                                        {isSelectMode && <div className={`${styles.checkbox} ${selectedTxns.includes(t.id) ? styles.checked : ''}`}>{selectedTxns.includes(t.id) && <Check size={12} />}</div>}
                                        <div className={styles.txnDate}>{new Date(t.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</div>
                                        <div className={styles.txnMain}>
                                            <div className={styles.txnNote}>
                                                {t.type === 'CREDIT'
                                                    ? <ArrowUpRight size={14} className={styles.positive} />
                                                    : <ArrowDownLeft size={14} className={styles.negative} />
                                                }
                                                {t.note || (t.type === 'CREDIT' ? (isSupplier ? 'Purchased' : 'Given') : (isSupplier ? 'Paid' : 'Received'))}
                                            </div>
                                            <div className={styles.txnTags}>
                                                <span className={styles.tagLabel}>{t.paymentMode}</span>
                                                {t.invoiceNumber && <span className={styles.tagLabel}>#{t.invoiceNumber}</span>}
                                                {t.hasAttachment && <Paperclip size={10} />}
                                            </div>
                                        </div>
                                        <div className={`${styles.txnAmount} ${t.type === 'CREDIT' ? styles.positive : styles.negative}`}>₹{t.amount.toLocaleString('en-IN')}</div>
                                        {!isSelectMode && (
                                            <div className={styles.cardActions}>
                                                <button onClick={(e) => { e.stopPropagation(); handleEdit(t); }}><Edit2 size={16} /></button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(t); }}><Trash2 size={16} /></button>
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            </div>

            {isSelectMode && selectedTxns.length > 0 ? (
                <div className={styles.bulkActions}>
                    <span>{selectedTxns.length} Selected</span>
                    <button className={styles.bulkDeleteBtn} onClick={handleBulkDelete}><Trash2 size={18} /> Delete</button>
                </div>
            ) : (
                <div className={styles.bottomActions}>
                    <button className={styles.giveBtn} onClick={() => { setTxnType('CREDIT'); setEditingTxn(null); setTxnModalOpen(true); }}>
                        <Plus size={20} /> {isSupplier ? 'PURCHASE / CREDIT' : 'GIVE CREDIT'}
                    </button>
                    <button className={styles.receiveBtn} onClick={() => { setTxnType('PAYMENT'); setEditingTxn(null); setTxnModalOpen(true); }}>
                        <Minus size={20} /> {isSupplier ? 'PAY BALANCE' : 'RECEIVE PAYMENT'}
                    </button>
                </div>
            )}

            <TransactionFormModal
                isOpen={isTxnModalOpen}
                onClose={() => { setTxnModalOpen(false); setEditingTxn(null); }}
                editingTxn={editingTxn}
                txnType={txnType}
                isSupplier={isSupplier}
                customerId={customerId}
                bookId={customer.bookId || 'default-book'}
                showToast={showToast}
                onSuccess={handleTransactionSuccess}
            />

            {/* Customer Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => !isUpdatingCustomer && setIsEditModalOpen(false)}
                title={`Edit ${isSupplier ? 'Supplier' : 'Customer'} Details`}
            >
                <form onSubmit={handleSaveCustomer} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label>Full Name *</label>
                        <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="e.g. John Doe"
                            required
                            autoFocus
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label>Phone Number (Optional)</label>
                        <input
                            type="tel"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value.replace(/[^\d+ ]/g, ''))}
                            placeholder="e.g. +91 98765 43210"
                            maxLength={20}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Email Address</label>
                        <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            placeholder="e.g. john@example.com"
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label>Address</label>
                        <textarea
                            value={editAddress}
                            onChange={(e) => setEditAddress(e.target.value)}
                            placeholder="Full address..."
                            rows={3}
                        />
                    </div>
                    <button type="submit" className={styles.submitBtn} disabled={isUpdatingCustomer}>
                        {isUpdatingCustomer ? 'Saving...' : 'Update Details'}
                    </button>
                </form>
            </Modal>
            <SuccessAnimation isVisible={showSuccess} onComplete={() => setShowSuccess(false)} />
        </>
    );
}

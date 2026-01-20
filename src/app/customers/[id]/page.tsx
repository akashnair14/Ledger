'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Transaction, PaymentMode } from '@/lib/db';
import {
    ArrowLeft,
    Plus,
    Minus,
    Trash2,
    Edit2,
    Phone,
    MapPin,
    X,
    Paperclip,
    Receipt,
    Calendar,
    ArrowUpRight,
    ArrowDownLeft,
    MessageSquare,
    Check,
    Calculator,
    FileText,
    Upload,
    Loader2,
    ScanLine
} from 'lucide-react';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { TransactionFilters, FilterState } from '@/components/ui/Filters';
import { SuccessAnimation } from '@/components/ui/SuccessAnimation';
import { StatementDownloader } from '@/components/ui/StatementDownloader';
import styles from './CustomerDetail.module.css';
import {
    useCustomers,
    useTransactions,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    updateCustomer,
    deleteCustomer,
    getTransactionCount
} from '@/hooks/useSupabase';
import { useToast } from '@/context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { EmptyState } from '@/components/ui/EmptyState';
import { CustomerDetailSkeleton } from '@/components/ui/LayoutSkeletons';

const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
    { value: 'CASH', label: 'Cash' },
    { value: 'UPI', label: 'UPI/GooglePay/PhonePe' },
    { value: 'NEFT', label: 'NEFT Transfer' },
    { value: 'IMPS', label: 'IMPS Transfer' },
    { value: 'CHEQUE', label: 'Cheque' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'OTHER', label: 'Other' },
];

export default function CustomerDetailPage() {
    const { id } = useParams();
    const customerId = id as string;
    const { showToast } = useToast();
    const router = useRouter();

    // Data Fetching
    const { customers, isLoading: customersLoading } = useCustomers();
    const { transactions: allTransactions } = useTransactions(customerId);

    const customer = customers?.find(c => c.id === id);
    const isSupplier = customer?.type === 'SUPPLIER';

    // Customer Management States
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editAddress, setEditAddress] = useState('');
    const [isUpdatingCustomer, setIsUpdatingCustomer] = useState(false);

    // Transaction Form States
    const [isTxnModalOpen, setTxnModalOpen] = useState(false);
    const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
    const [txnType, setTxnType] = useState<'CREDIT' | 'PAYMENT'>('CREDIT');
    // ... rest of form states ... (kept)
    const [amount, setAmount] = useState('');
    const [evaluatedAmount, setEvaluatedAmount] = useState(0);
    const [note, setNote] = useState('');
    const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
    const [customPaymentMode, setCustomPaymentMode] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [tags, setTags] = useState<string[]>([]);
    const [attachment, setAttachment] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Scanning States
    const [isScanning, setIsScanning] = useState(false);
    const [scanIntent, setScanIntent] = useState(false);

    // UX States
    const [isSaving, setIsSaving] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
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

    // Calculator Helper
    const evaluateExpression = (expr: string): number => {
        try {
            const cleanExpr = expr.replace(/[^0-9+\-*/.()]/g, '');
            if (!cleanExpr) return 0;
            const result = new Function(`return ${cleanExpr}`)();
            return typeof result === 'number' && isFinite(result) ? result : 0;
        } catch {
            return 0;
        }
    };

    useEffect(() => {
        const val = evaluateExpression(amount);
        setEvaluatedAmount(val);
    }, [amount]);

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
            if (e.key === 'Escape' && isTxnModalOpen) {
                resetForm();
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isTxnModalOpen]);

    // Handle Voice Command / Quick Add Params
    const searchParams = useSearchParams();

    useEffect(() => {
        const quickAdd = searchParams.get('quickAdd');
        if (quickAdd === 'true') {
            const pAmount = searchParams.get('amount');
            const pType = searchParams.get('type') as 'CREDIT' | 'PAYMENT';
            const pNote = searchParams.get('note');

            if (pAmount) setAmount(pAmount);
            if (pType) setTxnType(pType);
            if (pNote) setNote(pNote);

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

    const filteredTransactions = allTransactions?.filter(t => {
        if (activeFilters.type !== 'ALL' && t.type !== activeFilters.type) return false;
        if (activeFilters.minAmount && t.amount < Number(activeFilters.minAmount)) return false;
        if (activeFilters.maxAmount && t.amount > Number(activeFilters.maxAmount)) return false;
        if (activeFilters.paymentModes.length > 0 && !activeFilters.paymentModes.includes(t.paymentMode as Transaction['paymentMode'])) {
            return false;
        }
        if (activeFilters.tags.length > 0 && !activeFilters.tags.some(tag => t.tags?.includes(tag))) return false;
        return true;
    }).sort((a, b) => {
        const order = activeFilters.sortOrder === 'ASC' ? 1 : -1;
        if (activeFilters.sortBy === 'DATE') {
            return (a.date - b.date) * order;
        } else {
            return (a.amount - b.amount) * order;
        }
    }) || [];

    const totalCredit = allTransactions?.filter(t => t.type === 'CREDIT').reduce((sum, t) => sum + t.amount, 0) || 0;
    const totalPayment = allTransactions?.filter(t => t.type === 'PAYMENT').reduce((sum, t) => sum + t.amount, 0) || 0;
    const balance = totalCredit - totalPayment;

    const validateForm = async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errors: any = {};
        if (!amount || evaluatedAmount <= 0) errors.amount = 'Valid amount required';
        if (paymentMode === 'OTHER' && !customPaymentMode.trim()) errors.customPaymentMode = 'Specify mode';
        if (new Date(invoiceDate).getTime() > Date.now()) errors.invoiceDate = 'Future date not allowed';
        return Object.keys(errors).length === 0;
    };

    const handlePreSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (await validateForm()) setShowConfirm(true);
    };

    const handleFinalSubmit = async () => {
        setIsSaving(true);
        try {
            const commonData = {
                amount: evaluatedAmount,
                type: txnType,
                paymentMode,
                customPaymentMode: paymentMode === 'OTHER' ? customPaymentMode.trim() : undefined,
                invoiceNumber: invoiceNumber.trim(),
                date: new Date(invoiceDate).getTime(),
                note: note.trim(),
                tags,
                attachmentUrl: editingTxn?.attachmentUrl
            };

            if (editingTxn) {
                await updateTransaction(editingTxn.id, {
                    ...commonData,
                    customerId: customerId,
                }, attachment || undefined);
                showToast('Transaction updated');
            } else {
                await addTransaction({
                    ...commonData,
                    customerId: customerId,
                    bookId: customer.bookId || 'default-book',
                }, attachment || undefined);
                showToast('Entry saved successfully');
            }

            resetForm();
            setShowConfirm(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        } catch (err: unknown) {
            alert('Failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleBulkDelete = async () => {
        if (!selectedTxns.length) return;
        if (confirm(`Delete ${selectedTxns.length} entries?`)) {
            try {
                await Promise.all(selectedTxns.map(id => deleteTransaction(id, customerId)));
                showToast(`${selectedTxns.length} entries deleted`);
                setSelectedTxns([]);
                setIsSelectMode(false);
            } catch { showToast('Bulk delete failed', 'error'); }
        }
    };

    const toggleTxnSelection = (id: string) => {
        setSelectedTxns(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
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

    const resetForm = () => {
        setAmount(''); setEvaluatedAmount(0); setNote(''); setPaymentMode('CASH'); setCustomPaymentMode('');
        setInvoiceNumber(''); setInvoiceDate(new Date().toISOString().split('T')[0]);
        setTags([]); setAttachment(null); setTxnModalOpen(false); setShowConfirm(false);
        setEditingTxn(null);
    };

    const handleEdit = (txn: Transaction) => {
        setEditingTxn(txn);
        setTxnType(txn.type);
        setAmount(txn.amount.toString());
        setEvaluatedAmount(txn.amount);
        setNote(txn.note || '');
        setPaymentMode(txn.paymentMode);
        setCustomPaymentMode(txn.customPaymentMode || '');
        setInvoiceNumber(txn.invoiceNumber || '');
        setInvoiceDate(new Date(txn.date).toISOString().split('T')[0]);
        setTags(txn.tags || []);
        setTxnModalOpen(true);
    };

    const handleSendReminder = () => {
        if (!customer.phone) return alert('No phone');
        const msg = encodeURIComponent(`Hi ${customer.name}, your balance is ₹${Math.abs(balance).toLocaleString()}. Please check. Thanks!`);
        window.open(`https://wa.me/91${customer.phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
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
            alert('Delete failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
    };

    const handleSaveCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editName.trim().length < 3) return alert('Name must be at least 3 characters');

        setIsUpdatingCustomer(true);
        try {
            await updateCustomer(customerId, {
                name: editName.trim(),
                phone: editPhone.trim(),
                email: editEmail.trim(),
                address: editAddress.trim()
            });
            showToast('Details updated successfully');
            setIsEditModalOpen(false);
        } catch (err: unknown) {
            console.error(err);
            alert('Failed to update: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setIsUpdatingCustomer(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAttachment(file);
            if (scanIntent) {
                setIsScanning(true);
                try {
                    const { scanReceipt } = await import('@/lib/ai/ocr');
                    const data = await scanReceipt(file);
                    if (data.amount) setAmount(data.amount.toString());
                    if (data.date) setInvoiceDate(data.date.split('T')[0]);
                    if (data.invoiceNumber) setInvoiceNumber(data.invoiceNumber);
                    showToast('Receipt scanned successfully');
                } catch (err) {
                    console.error(err);
                    showToast('Failed to scan receipt', 'error');
                } finally {
                    setIsScanning(false);
                    setScanIntent(false);
                }
            }
        }
    };

    return (
        <>
            <div className={styles.container}>
                <header className={styles.header}>
                    <div className={styles.headerTop}>
                        <Link href="/dashboard" className={styles.backButton} style={{ marginTop: '4px' }}><ArrowLeft size={24} /></Link>
                        <div className={styles.nameSection}>
                            <h1>{customer.name}</h1>
                            <div className={styles.quickInfo}>
                                <span><Phone size={14} /> {customer.phone}</span>
                                {customer.address && <span><MapPin size={14} /> {customer.address}</span>}
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
                            >
                                <Edit2 size={18} />
                            </button>
                            <button className={styles.deleteBtn} onClick={() => handleDeleteCustomer()}>
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>

                    <div className={styles.mainActions}>
                        <StatementDownloader customerName={customer.name} transactions={allTransactions || []} />
                        <button className={styles.miniReminderBtn} onClick={handleSendReminder}>
                            <MessageSquare size={18} />
                            <span>Remind</span>
                        </button>
                    </div>
                </header>

                <div className={styles.balanceCard}>
                    <div className={styles.balanceInfo}>
                        <span className={styles.balanceLabel}>Current Balance</span>
                        <h2 className={`${styles.balanceValue} ${balance >= 0 ? (isSupplier ? styles.negative : styles.positive) : (isSupplier ? styles.positive : styles.negative)}`}>
                            ₹{Math.abs(balance).toLocaleString('en-IN')}
                        </h2>
                        <span className={styles.balanceSub}>
                            {balance === 0 ? 'Settled' : (balance > 0 ? (isSupplier ? 'You will pay' : 'You will collect') : (isSupplier ? 'You Collected' : 'You Paid'))}
                        </span>
                    </div>
                    <div className={styles.divider} />
                    <div className={styles.balanceStats}>
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>{isSupplier ? 'Purchases' : 'Total Credit'}</span>
                            <span className={`${styles.statValue} ${styles.positive}`}>₹{totalCredit.toLocaleString('en-IN')}</span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>{isSupplier ? 'Payments' : 'Total Payment'}</span>
                            <span className={`${styles.statValue} ${styles.negative}`}>₹{totalPayment.toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>

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
                                {filteredTransactions.map((t, index) => (
                                    <motion.div
                                        key={t.id}
                                        id={t.id}
                                        layout
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ delay: index * 0.03 }}
                                        className={`${styles.txnCard} ${isSelectMode ? styles.clickableCard : ''}`}
                                        onClick={() => isSelectMode && toggleTxnSelection(t.id)}
                                    >
                                        {isSelectMode && <div className={`${styles.checkbox} ${selectedTxns.includes(t.id) ? styles.checked : ''}`}>{selectedTxns.includes(t.id) && <Check size={12} />}</div>}
                                        <div className={styles.txnDate}>{new Date(t.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</div>
                                        <div className={styles.txnMain}>
                                            <div className={styles.txnNote}>
                                                {t.type === 'CREDIT'
                                                    ? <ArrowUpRight size={14} className={styles.negative} />
                                                    : <ArrowDownLeft size={14} className={styles.positive} />
                                                }
                                                {t.note || (t.type === 'CREDIT' ? (isSupplier ? 'Purchased' : 'Given') : (isSupplier ? 'Paid' : 'Received'))}
                                            </div>
                                            <div className={styles.txnTags}>
                                                <span className={styles.tagLabel}>{t.paymentMode}</span>
                                                {t.invoiceNumber && <span className={styles.tagLabel}>#{t.invoiceNumber}</span>}
                                                {t.hasAttachment && <Paperclip size={10} />}
                                            </div>
                                        </div>
                                        <div className={`${styles.txnAmount} ${t.type === 'CREDIT' ? styles.negative : styles.positive}`}>₹{t.amount.toLocaleString('en-IN')}</div>
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
                    <button className={styles.giveBtn} onClick={() => { setTxnType('CREDIT'); setTxnModalOpen(true); }}>
                        <Plus size={20} /> {isSupplier ? 'PURCHASE / CREDIT' : 'GIVE CREDIT'}
                    </button>
                    <button className={styles.receiveBtn} onClick={() => { setTxnType('PAYMENT'); setTxnModalOpen(true); }}>
                        <Minus size={20} /> {isSupplier ? 'PAY BALANCE' : 'RECEIVE PAYMENT'}
                    </button>
                </div>
            )}

            <Modal
                isOpen={isTxnModalOpen}
                onClose={() => !isSaving && resetForm()}
                title={editingTxn ? 'Edit Transaction' : (
                    txnType === 'CREDIT'
                        ? (isSupplier ? 'Record Purchase' : 'Give Credit')
                        : (isSupplier ? 'Record Payment' : 'Receive Payment')
                )}
            >
                {!showConfirm ? (
                    <form onSubmit={handlePreSubmit} className={styles.form}>
                        <div className={styles.inputGroup}>
                            <label><Calculator size={14} /> Amount (Calculatable) *</label>
                            <input
                                type="text"
                                value={amount}
                                onChange={(e) => {
                                    // Only allow numbers and math operators
                                    const val = e.target.value.replace(/[^0-9+\-*/.()]/g, '');
                                    setAmount(val);
                                }}
                                placeholder="e.g. 500+250"
                                required
                                autoFocus
                            />
                            {amount && evaluatedAmount > 0 && (
                                <p className={styles.totalPreview}>Total: ₹{evaluatedAmount.toLocaleString('en-IN')}</p>
                            )}
                        </div>

                        <div className={styles.formGrid}>
                            <div className={styles.inputGroup}>
                                <label><Receipt size={14} /> Payment Mode *</label>
                                <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}>
                                    {PAYMENT_MODES.map(m => (<option key={m.value} value={m.value}>{m.label}</option>))}
                                </select>
                            </div>
                            <div className={styles.inputGroup}>
                                <label><Calendar size={14} /> Entry Date</label>
                                <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
                            </div>
                        </div>

                        <div className={styles.inputGroup}>
                            <label><FileText size={14} /> Invoice / Reference #</label>
                            <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Optional" />
                        </div>

                        <div className={styles.inputGroup}>
                            <label><Edit2 size={14} /> Note</label>
                            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What is this for?" rows={2} />
                        </div>

                        <div className={styles.inputGroup}>
                            <label><Paperclip size={14} /> Attach Document</label>
                            <div className={styles.fileUpload}>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} hidden />
                                <button type="button" className={styles.uploadTrigger} onClick={() => fileInputRef.current?.click()}>
                                    {attachment ? (
                                        <><Check size={16} /> {attachment.name}</>
                                    ) : (
                                        editingTxn?.attachmentUrl ? (
                                            <><Check size={16} /> Existing Attachment</>
                                        ) : (
                                            <><Upload size={16} /> Select File</>
                                        )
                                    )}
                                </button>

                                <button
                                    type="button"
                                    className={`${styles.scanBtn} ${isScanning ? styles.scanning : ''}`}
                                    onClick={() => { setScanIntent(true); fileInputRef.current?.click(); }}
                                    disabled={isScanning}
                                    title="Scan Receipt for Details"
                                >
                                    {isScanning ? <Loader2 size={16} className="spin" /> : <ScanLine size={16} />}
                                    {isScanning ? 'Scanning...' : 'Auto-Scan'}
                                </button>

                                {(attachment || editingTxn?.attachmentUrl) && (
                                    <button type="button" className={styles.clearFile} onClick={() => {
                                        setAttachment(null);
                                        if (editingTxn) setEditingTxn({ ...editingTxn, attachmentUrl: undefined });
                                    }}>
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            {editingTxn?.attachmentUrl && !attachment && (
                                <a href={editingTxn.attachmentUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#3b82f6', marginTop: '0.5rem', display: 'block', textAlign: 'center' }}>
                                    View Current Attachment
                                </a>
                            )}
                        </div>

                        <button type="submit" className={styles.submitBtn}>Review Entry</button>
                    </form>
                ) : (
                    <div className={styles.confirmView}>
                        <div className={styles.confirmCard}>
                            <div className={styles.confirmHeader}>
                                <span className={txnType === 'CREDIT' ? styles.tagCredit : styles.tagPayment}>
                                    {txnType === 'CREDIT'
                                        ? (isSupplier ? 'RECORDING PURCHASE' : 'GIVING CREDIT')
                                        : (isSupplier ? 'RECORDING PAYMENT' : 'RECEIVING PAYMENT')
                                    }
                                </span>
                            </div>
                            <div className={styles.confirmMain}>
                                <h2 className={txnType === 'CREDIT' ? styles.negative : styles.positive}>
                                    ₹{evaluatedAmount.toLocaleString('en-IN')}
                                </h2>
                                <p className={styles.confirmNote}>{note || 'No special note'}</p>
                            </div>
                            <div className={styles.confirmDetails}>
                                <div className={styles.confirmRow}><span>Mode</span><strong>{paymentMode}</strong></div>
                                <div className={styles.confirmRow}><span>Date</span><strong>{new Date(invoiceDate).toLocaleDateString()}</strong></div>
                                {invoiceNumber && <div className={styles.confirmRow}><span>Invoice</span><strong>#{invoiceNumber}</strong></div>}
                                {attachment && <div className={styles.confirmRow}><span>Attachment</span><strong>{attachment.name}</strong></div>}
                            </div>
                        </div>
                        <div className={styles.modalActions}>
                            <button className={styles.cancelBtn} onClick={() => setShowConfirm(false)}>Edit</button>
                            <button className={styles.submitBtn} onClick={handleFinalSubmit} disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Confirm Entry'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
            <SuccessAnimation isVisible={showSuccess} onComplete={() => setShowSuccess(false)} />

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
                        <label>Phone Number</label>
                        <input
                            type="tel"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="e.g. 9876543210"
                            maxLength={10}
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
        </>
    );
}

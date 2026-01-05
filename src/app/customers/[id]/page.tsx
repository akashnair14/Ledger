'use client';

import { useParams, useRouter } from 'next/navigation';
import { Transaction, PaymentMode, Customer } from '@/lib/db';
import {
    ArrowLeft,
    Plus,
    Minus,
    Trash2,
    Edit2,
    Phone,
    MapPin,
    Camera,
    Tag,
    X,
    Paperclip,
    Receipt,
    Wallet,
    Calendar,
    ArrowUpRight,
    ArrowDownLeft,
    MessageSquare,
    Download,
    Check,
    Calculator,
    FileText,
    Upload
} from 'lucide-react';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { TransactionFilters, FilterState } from '@/components/ui/Filters';
import { SuccessAnimation } from '@/components/ui/SuccessAnimation';
import { StatementDownloader } from '@/components/ui/StatementDownloader';
import styles from './CustomerDetail.module.css';
import { useCustomers, useTransactions, addTransaction, deleteTransaction } from '@/hooks/useSupabase';
import { useToast } from '@/context/ToastContext';
import { generateVoucher } from '@/lib/export/generate';

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

    // Data Fetching
    const { customers, isLoading: customersLoading } = useCustomers();
    const { transactions: allTransactions } = useTransactions(customerId);

    const customer = customers?.find(c => c.id === customerId);

    // Transaction Form States
    const [isTxnModalOpen, setTxnModalOpen] = useState(false);
    const [txnType, setTxnType] = useState<'CREDIT' | 'PAYMENT'>('CREDIT');
    const [amount, setAmount] = useState('');
    const [evaluatedAmount, setEvaluatedAmount] = useState(0);
    const [note, setNote] = useState('');
    const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
    const [customPaymentMode, setCustomPaymentMode] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            // Safe evaluation for simple math: +, -, *, /
            // Remove everything except numbers and operators
            const cleanExpr = expr.replace(/[^0-9+\-*/.]/g, '');
            if (!cleanExpr) return 0;
            const result = new Function(`return ${cleanExpr}`)();
            return typeof result === 'number' && isFinite(result) ? result : 0;
        } catch {
            return 0;
        }
    };

    // Auto-evaluate amount as user types
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

    if (customersLoading) return <div className={styles.loading}>Loading customer...</div>;
    if (!customer) return <div className={styles.loading}>Customer not found.</div>;

    // Filter Logic
    const availableTags = Array.from(new Set(allTransactions?.flatMap(t => t.tags || []) || []));

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
            await addTransaction({
                customerId: customerId,
                bookId: customer.bookId || 'default-book',
                amount: evaluatedAmount,
                type: txnType,
                paymentMode,
                customPaymentMode: paymentMode === 'OTHER' ? customPaymentMode.trim() : undefined,
                invoiceNumber: invoiceNumber.trim(),
                date: new Date(invoiceDate).getTime(),
                note: note.trim(),
                tags
            });
            resetForm();
            setShowConfirm(false);
            showToast('Entry saved successfully');
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
            } catch (err: unknown) { showToast('Bulk delete failed', 'error'); }
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
            catch (err: unknown) { showToast('Delete failed', 'error'); }
        }
    };

    const resetForm = () => {
        setAmount(''); setNote(''); setPaymentMode('CASH'); setCustomPaymentMode('');
        setInvoiceNumber(''); setInvoiceDate(new Date().toISOString().split('T')[0]);
        setTags([]); setAttachment(null); setTxnModalOpen(false); setShowConfirm(false);
    };

    const handleSendReminder = () => {
        if (!customer.phone) return alert('No phone');
        const msg = encodeURIComponent(`Hi ${customer.name}, your balance is ₹${Math.abs(balance).toLocaleString()}. Please check. Thanks!`);
        window.open(`https://wa.me/91${customer.phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setAttachment(file);
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/" className={styles.backButton}><ArrowLeft size={24} /></Link>
                <div className={styles.customerSummary}>
                    <h1>{customer.name}</h1>
                    <div className={styles.quickInfo}>
                        <span><Phone size={14} /> {customer.phone}</span>
                        {customer.address && <span><MapPin size={14} /> {customer.address}</span>}
                    </div>
                </div>
                <div className={styles.headerActions}>
                    <StatementDownloader customerName={customer.name} transactions={allTransactions || []} />
                    <button className={styles.reminderBtn} onClick={handleSendReminder}><MessageSquare size={18} /><span>Remind</span></button>
                </div>
            </header>

            <div className={styles.balanceCard}>
                <div className={styles.balanceInfo}>
                    <span className={styles.balanceLabel}>Current Balance</span>
                    <h2 className={balance >= 0 ? styles.negative : styles.positive}>
                        ₹{Math.abs(balance).toLocaleString()}<small>{balance >= 0 ? ' (Net Debt)' : ' (Net Credit)'}</small>
                    </h2>
                </div>
                <div className={styles.balanceStats}>
                    <div className={styles.stat}><span className={styles.statLabel}>Total Given</span><span className={`${styles.statValue} ${styles.negative}`}>₹{totalCredit.toLocaleString()}</span></div>
                    <div className={styles.stat}><span className={styles.statLabel}>Total Received</span><span className={`${styles.statValue} ${styles.positive}`}>₹{totalPayment.toLocaleString()}</span></div>
                </div>
            </div>

            <div className={styles.txnList}>
                <div className={styles.listHeader}>
                    <h3>Ledger History</h3>
                    <button className={`${styles.selectBtn} ${isSelectMode ? styles.activeSelect : ''}`} onClick={() => { setIsSelectMode(!isSelectMode); setSelectedTxns([]); }}>
                        {isSelectMode ? 'Cancel' : 'Select'}
                    </button>
                </div>

                <TransactionFilters filters={activeFilters} onFilterChange={setActiveFilters} availableTags={availableTags} />

                <div className={styles.list}>
                    {filteredTransactions.map((t) => (
                        <div key={t.id} className={`${styles.txnCard} ${isSelectMode ? styles.clickableCard : ''}`} onClick={() => isSelectMode && toggleTxnSelection(t.id)}>
                            {isSelectMode && <div className={`${styles.checkbox} ${selectedTxns.includes(t.id) ? styles.checked : ''}`}>{selectedTxns.includes(t.id) && <Check size={12} />}</div>}
                            <div className={styles.txnDate}>{new Date(t.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</div>
                            <div className={styles.txnMain}>
                                <div className={styles.txnNote}>{t.type === 'CREDIT' ? <ArrowUpRight size={14} className={styles.negative} /> : <ArrowDownLeft size={14} className={styles.positive} />}{t.note || (t.type === 'CREDIT' ? 'Given' : 'Received')}</div>
                                <div className={styles.txnTags}>
                                    <span className={styles.tagLabel}>{t.paymentMode}</span>
                                    {t.invoiceNumber && <span className={styles.tagLabel}>#{t.invoiceNumber}</span>}
                                    {t.hasAttachment && <Paperclip size={10} />}
                                </div>
                            </div>
                            <div className={`${styles.txnAmount} ${t.type === 'CREDIT' ? styles.negative : styles.positive}`}>₹{t.amount.toLocaleString()}</div>
                            {!isSelectMode && (
                                <div className={styles.cardActions}>
                                    <button onClick={(e) => { e.stopPropagation(); generateVoucher(customer, t, balance); }}><Download size={14} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(t); }}><Trash2 size={14} /></button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {isSelectMode && selectedTxns.length > 0 ? (
                <div className={styles.bulkActions}>
                    <span>{selectedTxns.length} Selected</span>
                    <button className={styles.bulkDeleteBtn} onClick={handleBulkDelete}><Trash2 size={18} /> Delete</button>
                </div>
            ) : (
                <div className={styles.bottomActions}>
                    <button className={styles.giveBtn} onClick={() => { setTxnType('CREDIT'); setTxnModalOpen(true); }}><Plus size={20} /> GIVE CREDIT</button>
                    <button className={styles.receiveBtn} onClick={() => { setTxnType('PAYMENT'); setTxnModalOpen(true); }}><Minus size={20} /> RECEIVE PAYMENT</button>
                </div>
            )}

            <Modal isOpen={isTxnModalOpen} onClose={() => !isSaving && setTxnModalOpen(false)} title={txnType === 'CREDIT' ? 'Give Credit' : 'Receive Payment'}>
                {!showConfirm ? (
                    <form onSubmit={handlePreSubmit} className={styles.form}>
                        <div className={styles.inputGroup}>
                            <label><Calculator size={14} /> Amount (Calculatable) *</label>
                            <input
                                type="text"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="e.g. 500+250"
                                required
                                autoFocus
                            />
                            {amount && evaluatedAmount > 0 && (
                                <p className={styles.totalPreview}>Total: ₹{evaluatedAmount.toLocaleString()}</p>
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
                                    {attachment ? <><Check size={16} /> {attachment.name}</> : <><Upload size={16} /> Select File</>}
                                </button>
                                {attachment && <button type="button" className={styles.clearFile} onClick={() => setAttachment(null)}><X size={14} /></button>}
                            </div>
                        </div>

                        <button type="submit" className={styles.submitBtn}>Review Entry</button>
                    </form>
                ) : (
                    <div className={styles.confirmView}>
                        <div className={styles.confirmCard}>
                            <div className={styles.confirmHeader}>
                                <span className={txnType === 'CREDIT' ? styles.tagCredit : styles.tagPayment}>
                                    {txnType === 'CREDIT' ? 'GIVING CREDIT' : 'RECEIVING PAYMENT'}
                                </span>
                            </div>
                            <div className={styles.confirmMain}>
                                <h2 className={txnType === 'CREDIT' ? styles.negative : styles.positive}>
                                    ₹{evaluatedAmount.toLocaleString()}
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
        </div>
    );
}

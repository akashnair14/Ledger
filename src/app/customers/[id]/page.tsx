'use client';

import { useParams, useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, generateId, now, Transaction, PaymentMode } from '@/lib/db';
import { useBook } from '@/context/BookContext';
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
    RefreshCw,
    MessageSquare,
    LinkIcon,
    Download,
    Check
} from 'lucide-react';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import styles from './CustomerDetail.module.css';

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
    const router = useRouter();
    const { activeBook } = useBook();

    // Transaction Form States
    const [isTxnModalOpen, setTxnModalOpen] = useState(false);
    const [txnType, setTxnType] = useState<'CREDIT' | 'PAYMENT'>('CREDIT');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
    const [customPaymentMode, setCustomPaymentMode] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [chequeNumber, setChequeNumber] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // UX States
    const [isSaving, setIsSaving] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [isVibrating, setIsVibrating] = useState(false);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedTxns, setSelectedTxns] = useState<string[]>([]);
    const [swipedId, setSwipedId] = useState<string | null>(null);
    const touchStart = useRef<number | null>(null);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.altKey && e.key.toLowerCase() === 'n') {
                e.preventDefault();
                setTxnType('PAYMENT');
                setTxnModalOpen(true);
            }
            if (e.altKey && e.key.toLowerCase() === 'g') {
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

    const customer = useLiveQuery(() => db.customers.where('id').equals(id as string).first(), [id]);
    const transactions = useLiveQuery(
        () => db.transactions
            .where('customerId').equals(id as string)
            .and(t => t.isDeleted === 0)
            .reverse()
            .sortBy('date'),
        [id]
    );

    if (!customer) return <div className={styles.loading}>Loading customer...</div>;

    const totalCredit = (transactions as Transaction[])?.filter(t => t.type === 'CREDIT').reduce((sum, t) => sum + t.amount, 0) || 0;
    const totalPayment = (transactions as Transaction[])?.filter(t => t.type === 'PAYMENT').reduce((sum, t) => sum + t.amount, 0) || 0;
    const balance = totalCredit - totalPayment;

    const validateForm = async () => {
        const errors: Record<string, string> = {};
        const amt = Number(amount);

        if (!amount || isNaN(amt) || amt <= 0) {
            errors.amount = 'Please enter a valid amount greater than 0';
        }

        if (paymentMode === 'OTHER' && !customPaymentMode.trim()) {
            errors.customPaymentMode = 'Please specify the payment type';
        }

        const invDateObj = new Date(invoiceDate);
        if (invDateObj.getTime() > Date.now()) {
            errors.invoiceDate = 'Invoice date cannot be in the future';
        }

        if (invoiceNumber.trim()) {
            const dup = await db.transactions
                .where({ customerId: id, isDeleted: 0, invoiceNumber: invoiceNumber.trim() })
                .first();
            if (dup) {
                errors.invoiceNumber = `Invoice #${invoiceNumber} already exists for this customer`;
            }
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handlePreSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const isValid = await validateForm();
        if (isValid) {
            setShowConfirm(true);
        }
    };

    const handleFinalSubmit = async () => {
        setIsSaving(true);
        try {
            const txnId = generateId();
            const hasAttachment = !!attachment;

            await db.transactions.add({
                id: txnId,
                customerId: id as string,
                bookId: activeBook!.id,
                amount: Number(amount),
                type: txnType,
                paymentMode,
                customPaymentMode: paymentMode === 'OTHER' ? customPaymentMode.trim() : undefined,
                invoiceNumber: invoiceNumber.trim(),
                invoiceDate: new Date(invoiceDate).getTime(),
                chequeNumber: chequeNumber.trim(),
                note: note.trim(),
                tags,
                hasAttachment,
                date: now(),
                createdAt: now(),
                updatedAt: now(),
                isDeleted: 0,
                deviceId: 'local',
                imported: false
            });

            // Haptic Feedback
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(50);
            }

            if (attachment) {
                await db.attachments.add({
                    id: generateId(),
                    txnId,
                    blob: attachment,
                    mimeType: attachment.type,
                    fileName: attachment.name,
                    createdAt: now(),
                    updatedAt: now()
                });
            }

            resetForm();
            setShowConfirm(false);
        } catch (err) {
            console.error(err);
            alert('Failed to save transaction. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleBulkDelete = async () => {
        if (!selectedTxns.length) return;
        if (confirm(`Delete ${selectedTxns.length} transactions?`)) {
            await Promise.all(selectedTxns.map(id => db.transactions.update(id, { isDeleted: 1, updatedAt: now() })));
            setSelectedTxns([]);
            setIsSelectMode(false);
        }
    };

    const toggleTxnSelection = (id: string) => {
        if (selectedTxns.includes(id)) {
            setSelectedTxns(selectedTxns.filter(t => t !== id));
        } else {
            setSelectedTxns([...selectedTxns, id]);
        }
    };

    const handleTouchStart = (e: React.TouchEvent, id: string) => {
        touchStart.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent, id: string) => {
        if (touchStart.current === null) return;
        const delta = touchStart.current - e.touches[0].clientX;
        if (delta > 50) setSwipedId(id);
        else if (delta < -50) setSwipedId(null);
    };

    const handleDelete = async (txn: Transaction) => {
        if (confirm('Delete this transaction?')) {
            await db.transactions.update(txn.id, { isDeleted: 1, updatedAt: now() });
            setSwipedId(null);
        }
    };

    const resetForm = () => {
        setAmount('');
        setNote('');
        setPaymentMode('CASH');
        setCustomPaymentMode('');
        setInvoiceNumber('');
        setInvoiceDate(new Date().toISOString().split('T')[0]);
        setChequeNumber('');
        setTags([]);
        setAttachment(null);
        setFieldErrors({});
        setTxnModalOpen(false);
        setShowConfirm(false);
    };

    const handleAddTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            if (!tags.includes(tagInput.trim())) {
                setTags([...tags, tagInput.trim()]);
            }
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setAttachment(e.target.files[0]);
        }
    };

    const handleSendReminder = () => {
        if (!customer.phone) {
            alert('No phone number found for this customer');
            return;
        }

        const cleanPhone = customer.phone.replace(/\D/g, '');
        const message = encodeURIComponent(`Hi ${customer.name}, your current balance on LedgerManager is ₹${Math.abs(balance).toLocaleString()}${balance >= 0 ? ' (Payable)' : ' (Credit)'}. Please check your ledger. Thank you!`);
        const whatsappUrl = `https://wa.me/91${cleanPhone}?text=${message}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleGenerateVoucher = (t: Transaction) => {
        const doc = new jsPDF();

        // Brand Header
        doc.setFontSize(22);
        doc.setTextColor(59, 130, 246); // Primary Color
        doc.text('LedgerManager', 20, 20);

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text('Professional Transaction Voucher', 20, 26);

        // Divider
        doc.setDrawColor(226, 232, 240);
        doc.line(20, 32, 190, 32);

        // Transaction Info
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text(`Voucher ID: ${t.id.slice(0, 8).toUpperCase()}`, 20, 45);
        doc.text(`Date: ${new Date(t.date).toLocaleString('en-IN')}`, 20, 52);

        // Customer Info
        doc.setFontSize(10);
        doc.text('Customer Details:', 140, 45);
        doc.setFontSize(12);
        doc.text(customer.name, 140, 52);
        doc.setFontSize(10);
        doc.text(customer.phone, 140, 58);

        // Transaction Table
        autoTable(doc, {
            startY: 70,
            head: [['Description', 'Type', 'Mode', 'Amount']],
            body: [[
                t.note || (t.type === 'CREDIT' ? 'Credit Given' : 'Payment Received'),
                t.type === 'CREDIT' ? 'DEBIT' : 'CREDIT',
                t.paymentMode === 'OTHER' ? (t.customPaymentMode || 'Other') : t.paymentMode,
                `INR ${t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
            ]],
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] }
        });

        // Final Summary
        const finalY = (doc as any).lastAutoTable.finalY + 20;
        doc.setFontSize(14);
        doc.text('Net Balance Status:', 20, finalY);
        doc.text(`${balance >= 0 ? 'DUE' : 'REFUNDABLE'}: INR ${Math.abs(balance).toLocaleString('en-IN')}`, 20, finalY + 10);

        // Footer
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text('Generated via LedgerManager PWA - Secured & Reliable', 105, 285, { align: 'center' });

        doc.save(`Voucher_${t.id.slice(0, 8)}.pdf`);
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/" className={styles.backButton}>
                    <ArrowLeft size={24} />
                </Link>
                <div className={styles.customerSummary}>
                    <h1>{customer.name}</h1>
                    <div className={styles.quickInfo}>
                        <span><Phone size={14} /> {customer.phone}</span>
                        {customer.email && <span>{customer.email}</span>}
                        {customer.address && <span><MapPin size={14} /> {customer.address}</span>}
                    </div>
                </div>
                {customer.phone && (
                    <div className={styles.headerActions}>
                        <button
                            className={styles.reminderBtn}
                            onClick={handleSendReminder}
                            title="Send WhatsApp Reminder"
                        >
                            <MessageSquare size={18} />
                            <span>Remind</span>
                        </button>
                    </div>
                )}
            </header>

            <div className={styles.balanceCard}>
                <div className={styles.balanceInfo}>
                    <span className={styles.balanceLabel}>Current Balance</span>
                    <h2 className={balance >= 0 ? styles.negative : styles.positive}>
                        ₹{Math.abs(balance).toLocaleString()}
                        <small>{balance >= 0 ? ' (Net Debt)' : ' (Net Credit)'}</small>
                    </h2>
                    <p className={styles.balanceSub}>
                        {balance >= 0 ? 'You will get this amount' : 'You will give this amount'}
                    </p>
                </div>
                <div className={styles.divider} />
                <div className={styles.balanceStatsArea}>
                    <div className={styles.balanceStats}>
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>Total Given</span>
                            <span className={`${styles.statValue} ${styles.negative}`}>₹{totalCredit.toLocaleString()}</span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statLabel}>Total Received</span>
                            <span className={`${styles.statValue} ${styles.positive}`}>₹{totalPayment.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.txnList}>
                <div className={styles.listHeader}>
                    <h3>Ledger History</h3>
                    <button
                        className={`${styles.selectBtn} ${isSelectMode ? styles.activeSelect : ''}`}
                        onClick={() => { setIsSelectMode(!isSelectMode); setSelectedTxns([]); }}
                    >
                        {isSelectMode ? 'Cancel Selection' : 'Select Multiple'}
                    </button>
                </div>
                <div className={styles.ledgerHeader}>
                    {isSelectMode && <span style={{ width: 40 }}></span>}
                    <span>Date</span>
                    <span>Details</span>
                    <span style={{ textAlign: 'right' }}>Amount</span>
                </div>
                {!transactions || transactions.length === 0 ? (
                    <p className={styles.emptyText}>No transactions found in this ledger.</p>
                ) : (
                    transactions.map((t, index) => (
                        <div
                            key={t.id}
                            className={`${styles.txnCardContainer} ${swipedId === t.id ? styles.swiped : ''}`}
                        >
                            <div
                                className={`${styles.txnCard} ${isSelectMode ? styles.clickableCard : ''} staggered-reveal`}
                                style={{ '--i': index } as React.CSSProperties}
                                onClick={() => isSelectMode && toggleTxnSelection(t.id)}
                                onTouchStart={(e) => handleTouchStart(e, t.id)}
                                onTouchMove={(e) => handleTouchMove(e, t.id)}
                            >
                                {isSelectMode && (
                                    <div className={styles.checkboxContainer}>
                                        <div className={`${styles.checkbox} ${selectedTxns.includes(t.id) ? styles.checked : ''}`}>
                                            {selectedTxns.includes(t.id) && <Check size={12} />}
                                        </div>
                                    </div>
                                )}
                                <div className={styles.txnDate}>
                                    {new Date(t.date).toLocaleDateString()}
                                </div>
                                <div className={styles.txnMain}>
                                    <div className={styles.txnNote}>
                                        {t.type === 'CREDIT' ? <ArrowUpRight size={14} className={styles.negative} /> : <ArrowDownLeft size={14} className={styles.positive} />}
                                        {t.note || (t.type === 'CREDIT' ? 'Credit Given' : 'Payment Received')}
                                    </div>
                                    <div className={styles.txnTags}>
                                        <span className={styles.tagLabel}>{t.paymentMode === 'OTHER' && t.customPaymentMode ? t.customPaymentMode : t.paymentMode}</span>
                                        {t.invoiceNumber && <span className={styles.tagLabel}>INV: {t.invoiceNumber}</span>}
                                        {t.tags?.map(tag => (
                                            <span key={tag} className={styles.tagLabel}>#{tag}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className={`${styles.txnAmount} ${t.type === 'CREDIT' ? styles.negative : styles.positive}`}>
                                    ₹{t.amount.toLocaleString()}
                                    {t.hasAttachment && <Paperclip size={10} style={{ marginLeft: 4 }} />}
                                    <button
                                        className={styles.downloadBtn}
                                        onClick={(e) => { e.stopPropagation(); handleGenerateVoucher(t); }}
                                        title="Download PDF Voucher"
                                    >
                                        <Download size={14} />
                                    </button>
                                </div>
                            </div>
                            <div className={styles.swipeActions}>
                                <button className={styles.deleteSwipeBtn} onClick={() => handleDelete(t)}>
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {isSelectMode && selectedTxns.length > 0 ? (
                <div className={styles.bulkActions}>
                    <div className={styles.selectionInfo}>
                        <strong>{selectedTxns.length}</strong> Selected
                    </div>
                    <button className={styles.bulkDeleteBtn} onClick={handleBulkDelete}>
                        <Trash2 size={18} /> Delete Selected
                    </button>
                </div>
            ) : (
                <div className={styles.bottomActions}>
                    <button
                        className={styles.giveBtn}
                        onClick={() => { setTxnType('CREDIT'); setTxnModalOpen(true); }}
                    >
                        <Plus size={20} /> GIVE CREDIT (DEBIT)
                    </button>
                    <button
                        className={styles.receiveBtn}
                        onClick={() => { setTxnType('PAYMENT'); setTxnModalOpen(true); }}
                    >
                        <Minus size={20} /> RECEIVE PAYMENT
                    </button>
                </div>
            )}

            <Modal
                isOpen={isTxnModalOpen}
                onClose={() => !isSaving && setTxnModalOpen(false)}
                title={txnType === 'CREDIT' ? 'Give Credit (Debit)' : 'Receive Payment (Credit)'}
            >
                {!showConfirm ? (
                    <form onSubmit={handlePreSubmit} className={styles.form}>
                        <div className={styles.formSection}>
                            <div className={styles.sectionHeader}>
                                <Wallet size={14} />
                                <h4>Transaction Details</h4>
                            </div>
                            <div className={styles.formGrid}>
                                <div className={styles.inputGroup}>
                                    <label htmlFor="amount">Amount (₹) <span className={styles.requiredMarker}>*</span></label>
                                    <input
                                        id="amount"
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        min="0.01"
                                        step="0.01"
                                        required
                                        autoFocus
                                        inputMode="decimal"
                                        aria-required="true"
                                        aria-invalid={!!fieldErrors.amount}
                                        className={`${styles.amountInput} ${fieldErrors.amount ? 'invalid-input' : ''}`}
                                    />
                                    {fieldErrors.amount && <span className="error-text" role="alert">{fieldErrors.amount}</span>}
                                </div>
                                <div className={styles.inputGroup}>
                                    <label htmlFor="paymentMode">Payment Mode <span className={styles.requiredMarker}>*</span></label>
                                    <select
                                        id="paymentMode"
                                        value={paymentMode}
                                        onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                                        className={styles.select}
                                        required
                                        aria-required="true"
                                    >
                                        {PAYMENT_MODES.map(mode => (
                                            <option key={mode.value} value={mode.value}>{mode.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {paymentMode === 'OTHER' && (
                                <div className={styles.inputGroup}>
                                    <label htmlFor="customPaymentMode">Specify Payment Type <span className={styles.requiredMarker}>*</span></label>
                                    <input
                                        id="customPaymentMode"
                                        type="text"
                                        value={customPaymentMode}
                                        onChange={(e) => setCustomPaymentMode(e.target.value)}
                                        placeholder="e.g. Gift Card, Barter, etc."
                                        required
                                        aria-required="true"
                                        aria-invalid={!!fieldErrors.customPaymentMode}
                                        className={fieldErrors.customPaymentMode ? 'invalid-input' : ''}
                                    />
                                    {fieldErrors.customPaymentMode && <span className="error-text" role="alert">{fieldErrors.customPaymentMode}</span>}
                                </div>
                            )}
                        </div>

                        <div className={styles.formSection}>
                            <div className={styles.sectionHeader}>
                                <Receipt size={14} />
                                <h4>Invoice & Reference</h4>
                            </div>
                            <div className={styles.formGrid}>
                                <div className={styles.inputGroup}>
                                    <label htmlFor="invoiceNumber">Invoice Number</label>
                                    <div className={styles.inputWithIcon}>
                                        <Receipt size={14} />
                                        <input
                                            id="invoiceNumber"
                                            type="text"
                                            value={invoiceNumber}
                                            onChange={(e) => setInvoiceNumber(e.target.value)}
                                            placeholder="e.g. INV-001"
                                            aria-invalid={!!fieldErrors.invoiceNumber}
                                            className={fieldErrors.invoiceNumber ? 'invalid-input' : ''}
                                        />
                                    </div>
                                    {fieldErrors.invoiceNumber && <span className="error-text" role="alert">{fieldErrors.invoiceNumber}</span>}
                                </div>
                                <div className={styles.inputGroup}>
                                    <label htmlFor="invoiceDate">Entry Date</label>
                                    <div className={styles.inputWithIcon}>
                                        <Calendar size={14} />
                                        <input
                                            id="invoiceDate"
                                            type="date"
                                            value={invoiceDate}
                                            onChange={(e) => setInvoiceDate(e.target.value)}
                                            max={new Date().toISOString().split('T')[0]}
                                            aria-invalid={!!fieldErrors.invoiceDate}
                                            className={fieldErrors.invoiceDate ? 'invalid-input' : ''}
                                        />
                                    </div>
                                    {fieldErrors.invoiceDate && <span className="error-text" role="alert">{fieldErrors.invoiceDate}</span>}
                                </div>
                            </div>
                            {paymentMode === 'CHEQUE' && (
                                <div className={styles.inputGroup}>
                                    <label htmlFor="chequeNumber">Cheque Number</label>
                                    <input
                                        id="chequeNumber"
                                        type="text"
                                        value={chequeNumber}
                                        onChange={(e) => setChequeNumber(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="Enter 6-digit cheque number"
                                        inputMode="numeric"
                                    />
                                </div>
                            )}
                        </div>

                        <div className={styles.formSection}>
                            <div className={styles.sectionHeader}>
                                <Tag size={14} />
                                <h4>Additional Info</h4>
                            </div>
                            <div className={styles.inputGroup}>
                                <label htmlFor="note">Notes / Remarks</label>
                                <textarea
                                    id="note"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Add a reference note..."
                                    className={styles.textarea}
                                    rows={3}
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label htmlFor="tags">Tags (Categorize)</label>
                                <input
                                    id="tags"
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={handleAddTag}
                                    placeholder="Enter tag and press Enter"
                                />
                                {tags.length > 0 && (
                                    <div className={styles.tagList}>
                                        {tags.map(tag => (
                                            <span key={tag} className={styles.tagBadge}>
                                                {tag} <X size={12} onClick={() => removeTag(tag)} />
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={styles.modalActions}>
                            <button type="button" className={styles.cancelBtn} onClick={() => setTxnModalOpen(false)}>Discard</button>
                            <button type="submit" className={styles.submitBtn}>
                                Review & Confirm
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className={styles.confirmView}>
                        <div className={styles.confirmCard}>
                            <div className={styles.confirmRow}>
                                <span>Record Type</span>
                                <strong className={txnType === 'CREDIT' ? styles.negative : styles.positive}>
                                    {txnType === 'CREDIT' ? 'GIVE CREDIT (DEBIT)' : 'RECEIVE PAYMENT (CREDIT)'}
                                </strong>
                            </div>
                            <div className={styles.confirmRow}>
                                <span>Amount Payable</span>
                                <strong style={{ fontSize: '1.5rem' }}>₹{Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                            </div>
                            <div className={styles.confirmRow}>
                                <span>Payment Mode</span>
                                <strong>{paymentMode === 'OTHER' ? customPaymentMode : paymentMode.replace('_', ' ')}</strong>
                            </div>
                            {invoiceNumber && (
                                <div className={styles.confirmRow}>
                                    <span>Voucher/Invoice</span>
                                    <strong>#{invoiceNumber}</strong>
                                </div>
                            )}
                            <div className={styles.confirmRow}>
                                <span>Record Date</span>
                                <strong>{new Date(invoiceDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                            </div>
                        </div>
                        <p className={styles.confirmNote}>
                            By confirming, you are creating an immutable entry in the system. This record will be synced to your secure cloud storage.
                        </p>
                        <div className={styles.modalActions}>
                            <button className={styles.cancelBtn} onClick={() => setShowConfirm(false)} disabled={isSaving}>Edit Details</button>
                            <button className={styles.submitBtn} onClick={handleFinalSubmit} disabled={isSaving}>
                                {isSaving ? <RefreshCw size={18} className="spin" /> : 'Confirm Entry'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

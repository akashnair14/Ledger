'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Calculator, Receipt, Calendar, FileText, Edit2, Paperclip, Upload, Loader2, ScanLine, X, Check } from 'lucide-react';
import { Transaction, PaymentMode } from '@/lib/db';
import { Modal } from '@/components/ui/Modal';
import { addTransaction, updateTransaction, useSettings } from '@/hooks/useSupabase';
import styles from '@/app/customers/[id]/CustomerDetail.module.css';

const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
    { value: 'CASH', label: 'Cash' },
    { value: 'UPI', label: 'UPI/GooglePay/PhonePe' },
    { value: 'NEFT', label: 'NEFT Transfer' },
    { value: 'IMPS', label: 'IMPS Transfer' },
    { value: 'CHEQUE', label: 'Cheque' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'OTHER', label: 'Other' },
];

interface TransactionFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingTxn: Transaction | null;
    txnType: 'CREDIT' | 'PAYMENT';
    isSupplier: boolean;
    customerId: string;
    bookId: string;
    showToast: (msg: string, type?: 'success' | 'error') => void;
    onSuccess: () => void;
}

export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
    isOpen,
    onClose,
    editingTxn,
    txnType,
    isSupplier,
    customerId,
    bookId,
    showToast,
    onSuccess
}) => {
    const { settings } = useSettings();
    const isCredit = txnType === 'CREDIT';

    const showPaymentMode = isCredit
        ? settings?.pref_show_payment_mode_credit !== 'false'
        : settings?.pref_show_payment_mode_debit !== 'false';

    const showEntryDate = isCredit
        ? settings?.pref_show_entry_date_credit !== 'false'
        : settings?.pref_show_entry_date_debit !== 'false';

    const showInvoiceNo = isCredit
        ? settings?.pref_show_invoice_no_credit !== 'false'
        : settings?.pref_show_invoice_no_debit !== 'false';

    const showNote = isCredit
        ? settings?.pref_show_note_credit !== 'false'
        : settings?.pref_show_note_debit !== 'false';

    const showAttachment = isCredit
        ? settings?.pref_show_attachment_credit !== 'false'
        : settings?.pref_show_attachment_debit !== 'false';

    // Form States
    const [amount, setAmount] = useState('');
    const [evaluatedAmount, setEvaluatedAmount] = useState(0);
    const [note, setNote] = useState('');
    const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
    const [customPaymentMode, setCustomPaymentMode] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [tags, setTags] = useState<string[]>([]);
    const [attachment, setAttachment] = useState<File | null>(null);
    const [existingAttachmentUrl, setExistingAttachmentUrl] = useState<string | undefined>(undefined);

    // Scanning / UI States
    const [isScanning, setIsScanning] = useState(false);
    const [scanIntent, setScanIntent] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync form state when editingTxn changes or modal opens
    useEffect(() => {
        if (isOpen) {
            if (editingTxn) {
                setAmount(editingTxn.amount.toString());
                setEvaluatedAmount(editingTxn.amount);
                setNote(editingTxn.note || '');
                setPaymentMode(editingTxn.paymentMode);
                setCustomPaymentMode(editingTxn.customPaymentMode || '');
                setInvoiceNumber(editingTxn.invoiceNumber || '');
                setInvoiceDate(new Date(editingTxn.date).toISOString().split('T')[0]);
                setTags(editingTxn.tags || []);
                setExistingAttachmentUrl(editingTxn.attachmentUrl);
                setAttachment(null);
            } else {
                resetForm();
            }
        }
    }, [isOpen, editingTxn]);

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

    const resetForm = () => {
        setAmount('');
        setEvaluatedAmount(0);
        setNote('');
        setPaymentMode('CASH');
        setCustomPaymentMode('');
        setInvoiceNumber('');
        setInvoiceDate(new Date().toISOString().split('T')[0]);
        setTags([]);
        setAttachment(null);
        setExistingAttachmentUrl(undefined);
        setShowConfirm(false);
    };

    const handlePreSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || evaluatedAmount <= 0) {
            showToast('Valid amount required', 'error');
            return;
        }
        if (paymentMode === 'OTHER' && !customPaymentMode.trim()) {
            showToast('Specify custom payment mode', 'error');
            return;
        }
        if (new Date(invoiceDate).getTime() > Date.now()) {
            showToast('Future date not allowed', 'error');
            return;
        }
        setShowConfirm(true);
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
                attachmentUrl: existingAttachmentUrl
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
                    bookId: bookId || 'default-book',
                }, attachment || undefined);
                showToast('Entry saved successfully');
            }

            resetForm();
            onSuccess();
            onClose();
        } catch (err: unknown) {
            showToast('Failed: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
        } finally {
            setIsSaving(false);
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
        <Modal
            isOpen={isOpen}
            onClose={() => !isSaving && onClose()}
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

                    {(showPaymentMode || showEntryDate) && (
                        <div className={styles.formGrid}>
                            {showPaymentMode && (
                                <div className={styles.inputGroup}>
                                    <label><Receipt size={14} /> Payment Mode *</label>
                                    <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}>
                                        {PAYMENT_MODES.map(m => (<option key={m.value} value={m.value}>{m.label}</option>))}
                                    </select>
                                </div>
                            )}
                            {showEntryDate && (
                                <div className={styles.inputGroup}>
                                    <label><Calendar size={14} /> Entry Date</label>
                                    <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
                                </div>
                            )}
                        </div>
                    )}

                    {showPaymentMode && paymentMode === 'OTHER' && (
                        <div className={styles.inputGroup}>
                            <label>Specify Mode *</label>
                            <input type="text" value={customPaymentMode} onChange={(e) => setCustomPaymentMode(e.target.value)} placeholder="e.g. Card, G-Pay" required />
                        </div>
                    )}

                    {showInvoiceNo && (
                        <div className={styles.inputGroup}>
                            <label><FileText size={14} /> Invoice / Reference #</label>
                            <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Optional" />
                        </div>
                    )}

                    {showNote && (
                        <div className={styles.inputGroup}>
                            <label><Edit2 size={14} /> Note</label>
                            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What is this for?" rows={2} />
                        </div>
                    )}

                    {showAttachment && (
                        <div className={styles.inputGroup}>
                            <label><Paperclip size={14} /> Attach Document</label>
                            <div className={styles.fileUpload}>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} hidden />
                                <button type="button" className={styles.uploadTrigger} onClick={() => fileInputRef.current?.click()}>
                                    {attachment ? (
                                        <><Check size={16} /> {attachment.name}</>
                                    ) : (
                                        existingAttachmentUrl ? (
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

                                {(attachment || existingAttachmentUrl) && (
                                    <button type="button" className={styles.clearFile} onClick={() => {
                                        setAttachment(null);
                                        setExistingAttachmentUrl(undefined);
                                    }}>
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            {existingAttachmentUrl && !attachment && (
                                <a href={existingAttachmentUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#3b82f6', marginTop: '0.5rem', display: 'block', textAlign: 'center' }}>
                                    View Current Attachment
                                </a>
                            )}
                        </div>
                    )}

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
                            <h2 className={txnType === 'CREDIT' ? styles.positive : styles.negative}>
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
    );
};

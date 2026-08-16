'use client';

import React, { useState } from 'react';
import { Download, Edit2, Trash2, ArrowRightLeft, ExternalLink, Calendar, User, DollarSign, Loader2, CheckCircle2, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { KachaBill, Customer, PaymentMode } from '@/lib/db';
import { deleteKachaBill, convertKachaBillToTransaction, useCustomers } from '@/hooks/useSupabase';
import styles from './KachaBillViewerModal.module.css';

const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
    { value: 'CASH', label: 'Cash' },
    { value: 'UPI', label: 'UPI' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'NEFT', label: 'NEFT' },
    { value: 'CHEQUE', label: 'Cheque' },
    { value: 'OTHER', label: 'Other' },
];

interface KachaBillViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    bill: KachaBill | null;
    bookId: string;
    onEdit: (bill: KachaBill) => void;
    showToast: (msg: string, type?: 'success' | 'error') => void;
    onConverted?: () => void;
}

export const KachaBillViewerModal: React.FC<KachaBillViewerModalProps> = ({
    isOpen,
    onClose,
    bill,
    bookId,
    onEdit,
    showToast,
    onConverted
}) => {
    const { customers } = useCustomers();
    const [isConverting, setIsConverting] = useState(false);
    const [showConvertForm, setShowConvertForm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Convert Form State
    const [targetCustomerId, setTargetCustomerId] = useState<string>('');
    const [convertAmount, setConvertAmount] = useState<string>('');
    const [convertType, setConvertType] = useState<'CREDIT' | 'PAYMENT'>('CREDIT');
    const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');

    if (!bill) return null;

    const assignedCustomer = customers?.find((c: Customer) => c.id === bill.customerId);
    const filteredCustomers = customers?.filter((c: Customer) => c.isDeleted === 0 && (c.bookId === bookId || !c.bookId)) || [];

    const handleStartConvert = () => {
        setTargetCustomerId(bill.customerId || (filteredCustomers[0]?.id || ''));
        setConvertAmount(bill.amount !== undefined ? String(bill.amount) : '');
        setShowConvertForm(true);
    };

    const handleConfirmConvert = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetCustomerId) {
            showToast('Please select a customer/supplier', 'error');
            return;
        }

        const parsedAmount = parseFloat(convertAmount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            showToast('Please enter a valid amount', 'error');
            return;
        }

        try {
            setIsConverting(true);
            await convertKachaBillToTransaction(bill.id, {
                customerId: targetCustomerId,
                bookId,
                amount: parsedAmount,
                type: convertType,
                paymentMode,
                note: bill.note || 'Converted from Kacha Bill',
                date: bill.billDate
            });

            showToast('Successfully converted to Transaction!');
            onConverted?.();
            onClose();
        } catch (err: any) {
            console.error('Conversion failed:', err);
            showToast(err.message || 'Failed to convert bill', 'error');
        } finally {
            setIsConverting(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this Kacha Bill?')) return;

        try {
            setIsDeleting(true);
            await deleteKachaBill(bill.id);
            showToast('Kacha Bill deleted');
            onClose();
        } catch (err: any) {
            showToast(err.message || 'Failed to delete bill', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDownload = () => {
        if (!bill.imageUrl) return;
        const link = document.createElement('a');
        link.href = bill.imageUrl;
        link.target = '_blank';
        link.download = `kacha_bill_${bill.id.slice(0, 8)}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={showConvertForm ? 'Convert to Ledger Entry' : 'Kacha Bill Details'}
        >
            <div className={styles.viewerContainer}>
                {/* Photo Viewer */}
                <div className={styles.imageWrapper}>
                    <img src={bill.imageUrl} alt="Kacha Bill" className={styles.billImage} />
                    <div className={styles.imageToolbar}>
                        <button
                            type="button"
                            className={styles.toolBtn}
                            onClick={handleDownload}
                            title="Download / Open Image"
                        >
                            <Download size={16} />
                        </button>
                        <a
                            href={bill.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.toolBtn}
                            title="Open in new tab"
                        >
                            <ExternalLink size={16} />
                        </a>
                    </div>
                </div>

                {!showConvertForm ? (
                    <>
                        {/* Bill Details */}
                        <div className={styles.detailsCard}>
                            {bill.amount !== undefined && (
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Estimated Amount</span>
                                    <span className={styles.detailValue}>₹{bill.amount.toLocaleString()}</span>
                                </div>
                            )}

                            <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>Bill Date</span>
                                <span className={styles.detailValue}>
                                    {new Date(bill.billDate).toLocaleDateString(undefined, {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric'
                                    })}
                                </span>
                            </div>

                            <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>Party</span>
                                <span className={styles.detailValue}>
                                    {assignedCustomer ? assignedCustomer.name : 'Unassigned'}
                                </span>
                            </div>

                            <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>Status</span>
                                <span className={styles.detailValue}>{bill.status}</span>
                            </div>

                            {bill.note && (
                                <div className={styles.noteBlock}>
                                    {bill.note}
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className={styles.actionsGrid}>
                            {bill.status !== 'CONVERTED' ? (
                                <button
                                    type="button"
                                    className={`${styles.actionBtn} ${styles.convertBtn}`}
                                    onClick={handleStartConvert}
                                >
                                    <ArrowRightLeft size={18} />
                                    <span>Convert to Ledger Transaction</span>
                                </button>
                            ) : (
                                <div style={{ gridColumn: 'span 2', textAlign: 'center', color: '#10b981', fontWeight: 600, fontSize: '0.9rem' }}>
                                    ✓ Converted to formal transaction
                                </div>
                            )}

                            <button
                                type="button"
                                className={`${styles.actionBtn} ${styles.editBtn}`}
                                onClick={() => {
                                    onClose();
                                    onEdit(bill);
                                }}
                            >
                                <Edit2 size={16} />
                                <span>Edit Details</span>
                            </button>

                            <button
                                type="button"
                                className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                onClick={handleDelete}
                                disabled={isDeleting}
                            >
                                <Trash2 size={16} />
                                <span>Delete</span>
                            </button>
                        </div>
                    </>
                ) : (
                    /* Conversion Sub-Form */
                    <form onSubmit={handleConfirmConvert} className={styles.convertForm}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Select Party *</label>
                            <select
                                style={{
                                    padding: '0.75rem',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border-color, #e5e7eb)',
                                    background: 'var(--bg-surface)'
                                }}
                                value={targetCustomerId}
                                onChange={(e) => setTargetCustomerId(e.target.value)}
                                required
                            >
                                <option value="">-- Choose Customer/Supplier --</option>
                                {filteredCustomers.map((c: Customer) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} ({c.type === 'SUPPLIER' ? 'Supplier' : 'Customer'})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Transaction Type</label>
                                <select
                                    style={{
                                        padding: '0.75rem',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border-color, #e5e7eb)',
                                        background: 'var(--bg-surface)'
                                    }}
                                    value={convertType}
                                    onChange={(e) => setConvertType(e.target.value as 'CREDIT' | 'PAYMENT')}
                                >
                                    <option value="CREDIT">Gave (Credit / Udhaar)</option>
                                    <option value="PAYMENT">Received / Paid</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Amount (₹) *</label>
                                <input
                                    type="number"
                                    step="any"
                                    style={{
                                        padding: '0.75rem',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border-color, #e5e7eb)',
                                        background: 'var(--bg-surface)'
                                    }}
                                    placeholder="Enter final amount"
                                    value={convertAmount}
                                    onChange={(e) => setConvertAmount(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Payment Mode</label>
                            <select
                                style={{
                                    padding: '0.75rem',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border-color, #e5e7eb)',
                                    background: 'var(--bg-surface)'
                                }}
                                value={paymentMode}
                                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                            >
                                {PAYMENT_MODES.map(m => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                            <button
                                type="button"
                                style={{
                                    flex: 1,
                                    padding: '0.85rem',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border-color, #e5e7eb)',
                                    background: 'var(--bg-surface-2)',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                                onClick={() => setShowConvertForm(false)}
                                disabled={isConverting}
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                style={{
                                    flex: 2,
                                    padding: '0.85rem',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: 'var(--primary, #f05c38)',
                                    color: '#fff',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                                disabled={isConverting}
                            >
                                {isConverting ? (
                                    <>
                                        <Loader2 size={18} className="spin" />
                                        <span>Converting...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={18} />
                                        <span>Confirm & Post Transaction</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </Modal>
    );
};

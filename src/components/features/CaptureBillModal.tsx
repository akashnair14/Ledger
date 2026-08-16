'use client';

import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2, Calendar, DollarSign, User, FileText, CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Customer, KachaBill, KachaBillStatus } from '@/lib/db';
import { addKachaBill, updateKachaBill, useCustomers } from '@/hooks/useSupabase';
import { compressImage } from '@/lib/imageUtils';
import styles from './CaptureBillModal.module.css';

interface CaptureBillModalProps {
    isOpen: boolean;
    onClose: () => void;
    bookId: string;
    editingBill?: KachaBill | null;
    preselectedCustomerId?: string;
    showToast: (msg: string, type?: 'success' | 'error') => void;
    onSuccess?: () => void;
}

export const CaptureBillModal: React.FC<CaptureBillModalProps> = ({
    isOpen,
    onClose,
    bookId,
    editingBill,
    preselectedCustomerId,
    showToast,
    onSuccess
}) => {
    const { customers } = useCustomers();
    const [note, setNote] = useState(editingBill?.note || '');
    const [title, setTitle] = useState(editingBill?.title || '');
    const [amount, setAmount] = useState<string>(editingBill?.amount !== undefined ? String(editingBill.amount) : '');
    const [customerId, setCustomerId] = useState<string>(editingBill?.customerId || preselectedCustomerId || '');
    const [billDate, setBillDate] = useState<string>(
        editingBill?.billDate
            ? new Date(editingBill.billDate).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
    );
    const [status, setStatus] = useState<KachaBillStatus>(editingBill?.status || 'PENDING');

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(editingBill?.imageUrl || null);
    const [isSaving, setIsSaving] = useState(false);
    const [isCompressing, setIsCompressing] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Filter customers by current book
    const filteredCustomers = customers?.filter(
        (c: Customer) => c.isDeleted === 0 && (c.bookId === bookId || !c.bookId)
    ) || [];

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file', 'error');
            return;
        }

        try {
            setIsCompressing(true);
            const optimizedFile = await compressImage(file, 1600, 1600, 0.8);
            setImageFile(optimizedFile);

            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
            const url = URL.createObjectURL(optimizedFile);
            setPreviewUrl(url);
        } catch (compressErr) {
            console.warn('Image compression fallback:', compressErr);
            setImageFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        } finally {
            setIsCompressing(false);
        }
    };

    const handleRemoveImage = () => {
        if (previewUrl && previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
        }
        setImageFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!previewUrl && !imageFile) {
            showToast('Please capture or upload a bill image', 'error');
            return;
        }

        try {
            setIsSaving(true);
            const parsedAmount = amount ? parseFloat(amount) : undefined;
            const parsedDate = billDate ? new Date(billDate).getTime() : Date.now();

            if (editingBill) {
                await updateKachaBill(
                    editingBill.id,
                    {
                        title: title.trim() || undefined,
                        note: note.trim() || undefined,
                        amount: isNaN(parsedAmount as number) ? undefined : parsedAmount,
                        customerId: customerId || undefined,
                        billDate: parsedDate,
                        status
                    },
                    imageFile || undefined
                );
                showToast('Kacha Bill updated successfully!');
            } else {
                await addKachaBill(
                    {
                        bookId,
                        title: title.trim() || undefined,
                        note: note.trim() || undefined,
                        amount: isNaN(parsedAmount as number) ? undefined : parsedAmount,
                        customerId: customerId || undefined,
                        billDate: parsedDate,
                        status
                    },
                    imageFile || undefined
                );
                showToast('Kacha Bill saved successfully!');
            }

            onSuccess?.();
            onClose();
        } catch (err: any) {
            console.error('Failed to save kacha bill:', err);
            showToast(err.message || 'Failed to save bill', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingBill ? 'Edit Kacha Bill' : 'Capture Kacha Bill'}
        >
            <form onSubmit={handleSubmit}>
                {/* Image Capture Section */}
                <div className={styles.captureSection}>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleFileSelect}
                    />

                    {isCompressing ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', gap: '0.5rem', color: 'var(--text-muted)' }}>
                            <Loader2 size={20} className="spin" />
                            <span style={{ fontSize: '0.9rem' }}>Optimizing bill photo...</span>
                        </div>
                    ) : previewUrl ? (
                        <div className={styles.previewContainer}>
                            <img src={previewUrl} alt="Bill Preview" className={styles.previewImage} />
                            <button
                                type="button"
                                className={styles.removeImageBtn}
                                onClick={handleRemoveImage}
                                title="Remove photo"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    ) : (
                        <div className={styles.buttonGrid}>
                            <button
                                type="button"
                                className={styles.captureBtn}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Camera size={20} />
                                <span>Take / Select Photo</span>
                            </button>
                            <button
                                type="button"
                                className={styles.captureBtn}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload size={20} />
                                <span>Upload File</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Notes / Description */}
                <div className={styles.formGroup}>
                    <label>
                        <FileText size={16} />
                        <span>Note / Description</span>
                    </label>
                    <textarea
                        className={styles.textarea}
                        placeholder="e.g. Rough estimate for 10 bags cement from vendor..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                    />
                </div>

                {/* Amount & Date in 2 columns */}
                <div className={styles.rowInputs}>
                    <div className={styles.formGroup}>
                        <label>
                            <DollarSign size={16} />
                            <span>Amount (₹ Optional)</span>
                        </label>
                        <input
                            type="number"
                            step="any"
                            className={styles.input}
                            placeholder="e.g. 4500"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>
                            <Calendar size={16} />
                            <span>Bill Date</span>
                        </label>
                        <input
                            type="date"
                            className={styles.input}
                            value={billDate}
                            onChange={(e) => setBillDate(e.target.value)}
                        />
                    </div>
                </div>

                {/* Customer / Supplier Tag */}
                <div className={styles.formGroup}>
                    <label>
                        <User size={16} />
                        <span>Link to Party (Optional)</span>
                    </label>
                    <select
                        className={styles.select}
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value)}
                    >
                        <option value="">-- No party assigned --</option>
                        {filteredCustomers.map((c: Customer) => (
                            <option key={c.id} value={c.id}>
                                {c.name} ({c.type === 'SUPPLIER' ? 'Supplier' : 'Customer'})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Status Toggle */}
                <div className={styles.formGroup}>
                    <label>Status</label>
                    <div className={styles.statusSelector}>
                        <button
                            type="button"
                            className={`${styles.statusPill} ${status === 'PENDING' ? styles.statusPillPendingActive : ''}`}
                            onClick={() => setStatus('PENDING')}
                        >
                            Pending
                        </button>
                        <button
                            type="button"
                            className={`${styles.statusPill} ${status === 'SETTLED' ? styles.statusPillSettledActive : ''}`}
                            onClick={() => setStatus('SETTLED')}
                        >
                            Settled
                        </button>
                    </div>
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                    <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSaving}>
                        Cancel
                    </button>
                    <button type="submit" className={styles.submitBtn} disabled={isSaving}>
                        {isSaving ? (
                            <>
                                <Loader2 size={18} className="spin" />
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={18} />
                                <span>{editingBill ? 'Update Bill' : 'Save Kacha Bill'}</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

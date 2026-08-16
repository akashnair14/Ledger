'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, X, Loader2, Calendar, DollarSign, User, FileText, CheckCircle2, RotateCw } from 'lucide-react';
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

    // Live In-App Camera Viewfinder State
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const galleryInputRef = useRef<HTMLInputElement>(null);
    const nativeCameraInputRef = useRef<HTMLInputElement>(null);

    // Stop active camera stream
    const stopCameraStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        setIsCameraActive(false);
    }, []);

    // Stop stream on modal close or unmount
    useEffect(() => {
        if (!isOpen) {
            stopCameraStream();
        }
        return () => {
            stopCameraStream();
        };
    }, [isOpen, stopCameraStream]);

    // Start Live Camera
    const startCamera = async (facing: 'environment' | 'user' = 'environment') => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                // Fallback to native system camera input if getUserMedia not supported
                nativeCameraInputRef.current?.click();
                return;
            }

            stopCameraStream();
            setIsCameraActive(true);

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: facing,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            });

            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
        } catch (err: any) {
            console.warn('In-app camera failed, falling back to native file input:', err);
            stopCameraStream();
            nativeCameraInputRef.current?.click();
        }
    };

    // Attach stream when video element renders
    useEffect(() => {
        if (isCameraActive && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play().catch(() => {});
        }
    }, [isCameraActive]);

    // Snap photo from live video feed
    const handleSnapPhoto = async () => {
        if (!videoRef.current) return;
        const video = videoRef.current;

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        stopCameraStream();

        canvas.toBlob(
            async (blob) => {
                if (!blob) return;
                const rawFile = new File([blob], `kacha_bill_${Date.now()}.jpg`, {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                });

                try {
                    setIsCompressing(true);
                    const optimized = await compressImage(rawFile, 1600, 1600, 0.82);
                    setImageFile(optimized);

                    if (previewUrl && previewUrl.startsWith('blob:')) {
                        URL.revokeObjectURL(previewUrl);
                    }
                    const url = URL.createObjectURL(optimized);
                    setPreviewUrl(url);
                } catch {
                    setImageFile(rawFile);
                    const url = URL.createObjectURL(rawFile);
                    setPreviewUrl(url);
                } finally {
                    setIsCompressing(false);
                }
            },
            'image/jpeg',
            0.9
        );
    };

    const handleFlipCamera = () => {
        const nextFacing = cameraFacingMode === 'environment' ? 'user' : 'environment';
        setCameraFacingMode(nextFacing);
        startCamera(nextFacing);
    };

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
        if (galleryInputRef.current) galleryInputRef.current.value = '';
        if (nativeCameraInputRef.current) nativeCameraInputRef.current.value = '';
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
            onClose={() => {
                stopCameraStream();
                onClose();
            }}
            title={editingBill ? 'Edit Kacha Bill' : 'Capture Kacha Bill'}
        >
            <form onSubmit={handleSubmit}>
                {/* Hidden Input Fallbacks */}
                <input
                    ref={nativeCameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                />
                <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                />

                {/* Live Camera Viewfinder or Preview or Action Buttons */}
                <div className={styles.captureSection}>
                    {isCameraActive ? (
                        <div className={styles.cameraViewfinder}>
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className={styles.videoElement}
                            />
                            <div className={styles.cameraOverlayControls}>
                                <button
                                    type="button"
                                    className={styles.cameraUtilityBtn}
                                    onClick={stopCameraStream}
                                    title="Close Camera"
                                >
                                    <X size={20} />
                                </button>

                                <button
                                    type="button"
                                    className={styles.shutterButton}
                                    onClick={handleSnapPhoto}
                                    title="Snap Photo"
                                >
                                    <div className={styles.shutterInner} />
                                </button>

                                <button
                                    type="button"
                                    className={styles.cameraUtilityBtn}
                                    onClick={handleFlipCamera}
                                    title="Flip Camera"
                                >
                                    <RotateCw size={20} />
                                </button>
                            </div>
                        </div>
                    ) : isCompressing ? (
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
                                onClick={() => startCamera('environment')}
                            >
                                <Camera size={20} />
                                <span>Take Photo</span>
                            </button>
                            <button
                                type="button"
                                className={styles.captureBtn}
                                onClick={() => galleryInputRef.current?.click()}
                            >
                                <Upload size={20} />
                                <span>Upload from Gallery</span>
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
                    <button
                        type="button"
                        className={styles.cancelBtn}
                        onClick={() => {
                            stopCameraStream();
                            onClose();
                        }}
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button type="submit" className={styles.submitBtn} disabled={isSaving || isCameraActive}>
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

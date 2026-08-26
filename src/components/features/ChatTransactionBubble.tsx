'use client';

import { Transaction } from '@/lib/db';
import { CheckCheck, Edit2, Trash2, Tag, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import styles from './ChatLedger.module.css';

interface ChatTransactionBubbleProps {
    transaction: Transaction & { runningBalance?: number };
    isSupplier?: boolean;
    onEdit: (txn: Transaction) => void;
    onDelete: (txn: Transaction) => void;
}

export function ChatTransactionBubble({
    transaction: t,
    isSupplier = false,
    onEdit,
    onDelete
}: ChatTransactionBubbleProps) {
    // Determine perspective:
    // PAYMENT (Received payment) -> Outgoing / Right Green Bubble
    // CREDIT (Given credit / Sale) -> Incoming / Left White/Slate Bubble
    const isPayment = t.type === 'PAYMENT';
    const isOutgoing = isPayment; 

    const formattedTime = new Date(t.date).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <div className={`${styles.messageRow} ${isOutgoing ? styles.outgoing : styles.incoming}`}>
            <div className={`${styles.bubble} ${isOutgoing ? styles.bubbleOutgoing : styles.bubbleIncoming}`}>
                {/* Bubble Hover Action Menu */}
                <div className={styles.bubbleActions}>
                    <button
                        className={styles.bubbleBtn}
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(t);
                        }}
                        title="Edit transaction"
                    >
                        <Edit2 size={12} />
                    </button>
                    <button
                        className={styles.bubbleBtn}
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(t);
                        }}
                        title="Delete transaction"
                    >
                        <Trash2 size={12} style={{ color: '#ef4444' }} />
                    </button>
                </div>

                {/* Top info badge */}
                <div className={styles.bubbleHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                            className={`${styles.badgeType} ${
                                t.type === 'CREDIT' ? styles.badgeTypeGiven : styles.badgeTypeReceived
                            }`}
                        >
                            {t.type === 'CREDIT' 
                                ? (isSupplier ? 'Purchase' : 'Credit Given') 
                                : (isSupplier ? 'Paid' : 'Payment Received')}
                        </span>
                        {t.paymentMode && (
                            <span className={styles.modeBadge}>{t.paymentMode}</span>
                        )}
                    </div>

                    {t.runningBalance !== undefined && (
                        <span className={styles.runningBalancePill}>
                            Bal: ₹{t.runningBalance.toLocaleString()}
                        </span>
                    )}
                </div>

                {/* Amount Row */}
                <div className={styles.amountRow}>
                    <span
                        className={`${styles.amount} ${
                            t.type === 'CREDIT' ? styles.amountGiven : styles.amountReceived
                        }`}
                    >
                        {t.type === 'CREDIT' ? '-' : '+'} ₹{t.amount.toLocaleString()}
                    </span>
                </div>

                {/* Note/Description */}
                {t.note && <p className={styles.noteText}>{t.note}</p>}

                {/* Invoice Ref */}
                {t.invoiceNumber && (
                    <div className={styles.invoiceTag}>
                        <Tag size={11} />
                        <span>#{t.invoiceNumber}</span>
                    </div>
                )}

                {/* Footer Time & Double Checkmarks */}
                <div className={styles.bubbleFooter}>
                    <span className={styles.timeText}>{formattedTime}</span>
                    <span className={styles.ticksIcon}>
                        <CheckCheck size={14} />
                    </span>
                </div>
            </div>
        </div>
    );
}

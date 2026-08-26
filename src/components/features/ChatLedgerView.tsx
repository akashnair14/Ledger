'use client';

import { useRef, useEffect, useMemo } from 'react';
import { Transaction } from '@/lib/db';
import { ChatTransactionBubble } from './ChatTransactionBubble';
import { EmptyState } from '@/components/ui/EmptyState';
import { MessageSquare, Plus, Minus, Paperclip, Search, ArrowDown } from 'lucide-react';
import styles from './ChatLedger.module.css';

interface ChatLedgerViewProps {
    transactions: (Transaction & { runningBalance?: number })[];
    isSupplier?: boolean;
    onEdit: (txn: Transaction) => void;
    onDelete: (txn: Transaction) => void;
    onOpenAddModal: (type: 'CREDIT' | 'PAYMENT') => void;
}

export function ChatLedgerView({
    transactions,
    isSupplier = false,
    onEdit,
    onDelete,
    onOpenAddModal
}: ChatLedgerViewProps) {
    const chatFeedRef = useRef<HTMLDivElement>(null);

    // Group transactions chronologically (oldest to newest for chat flow)
    const sortedChronological = useMemo(() => {
        return [...transactions].sort((a, b) => a.date - b.date);
    }, [transactions]);

    // Grouping by Date for sticky chat date headers
    const groupedChatData = useMemo(() => {
        const groups: { dateLabel: string; items: (Transaction & { runningBalance?: number })[] }[] = [];
        let currentGroup: { dateLabel: string; items: (Transaction & { runningBalance?: number })[] } | null = null;

        const todayStr = new Date().toDateString();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        sortedChronological.forEach((t) => {
            const date = new Date(t.date);
            const dateStr = date.toDateString();

            let label = date.toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
                year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
            });

            if (dateStr === todayStr) {
                label = 'Today';
            } else if (dateStr === yesterdayStr) {
                label = 'Yesterday';
            }

            if (!currentGroup || currentGroup.dateLabel !== label) {
                currentGroup = { dateLabel: label, items: [] };
                groups.push(currentGroup);
            }
            currentGroup.items.push(t);
        });

        return groups;
    }, [sortedChronological]);

    // Auto-scroll to bottom of chat when rendered or new entries added
    useEffect(() => {
        if (chatFeedRef.current) {
            chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
        }
    }, [sortedChronological.length]);

    const scrollToBottom = () => {
        if (chatFeedRef.current) {
            chatFeedRef.current.scrollTo({
                top: chatFeedRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className={styles.chatContainer}>
            {/* Scrollable Conversation Feed */}
            <div className={styles.chatFeed} ref={chatFeedRef}>
                {sortedChronological.length === 0 ? (
                    <EmptyState
                        icon={MessageSquare}
                        title="No messages or transactions yet"
                        description="Start the conversation by recording a transaction below."
                    />
                ) : (
                    groupedChatData.map((group, groupIdx) => (
                        <div key={groupIdx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {/* Centered Date Divider */}
                            <div className={styles.dateDivider}>
                                <span className={styles.datePill}>{group.dateLabel}</span>
                            </div>

                            {/* Messages in this Date group */}
                            {group.items.map((txn) => (
                                <ChatTransactionBubble
                                    key={txn.id}
                                    transaction={txn}
                                    isSupplier={isSupplier}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                />
                            ))}
                        </div>
                    ))
                )}
            </div>

            {/* Bottom WhatsApp-Inspired Action Bar */}
            <div className={styles.chatActionBar}>
                <button
                    className={styles.giveButton}
                    onClick={() => onOpenAddModal('CREDIT')}
                    title={isSupplier ? 'Record Purchase' : 'Give Credit'}
                >
                    <Plus size={16} />
                    <span>{isSupplier ? 'You Received (Bill)' : '+ Gave ₹'}</span>
                </button>

                <button
                    className={styles.receiveButton}
                    onClick={() => onOpenAddModal('PAYMENT')}
                    title={isSupplier ? 'Pay Supplier' : 'Receive Payment'}
                >
                    <Minus size={16} />
                    <span>{isSupplier ? 'You Paid' : '+ Got ₹'}</span>
                </button>
            </div>
        </div>
    );
}

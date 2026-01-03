'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Search, User, ReceiptText, Command, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './GlobalSearch.module.css';

export const GlobalSearch = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const results = useLiveQuery(async () => {
        if (!query.trim()) return [];

        const q = query.toLowerCase();
        const customers = await db.customers
            .filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q))
            .limit(5)
            .toArray();

        const transactions = await db.transactions
            .filter(t => t.note?.toLowerCase().includes(q) || t.amount.toString().includes(q))
            .limit(5)
            .toArray();

        return [
            ...customers.map(c => ({ id: c.id, name: c.name, type: 'CUSTOMER', sub: c.phone })),
            ...transactions.map(t => ({ id: t.customerId, name: `₹${t.amount}`, type: 'TRANSACTION', sub: t.note || 'No note', txnId: t.id }))
        ];
    }, [query]);

    const handleOpen = useCallback(() => {
        setIsOpen(true);
        setQuery('');
        setSelectedIndex(0);
        setTimeout(() => inputRef.current?.focus(), 50);
    }, []);

    const handleClose = useCallback(() => {
        setIsOpen(false);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                isOpen ? handleClose() : handleOpen();
            }
            if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleOpen, handleClose]);

    const onSelect = (item: any) => {
        if (item.type === 'CUSTOMER') router.push(`/customers/${item.id}`);
        else router.push(`/customers/${item.id}?txn=${item.txnId}`);
        handleClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className={styles.overlay} onClick={handleClose}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        className={styles.modal}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className={styles.searchHeader}>
                            <Search className={styles.searchIcon} size={20} />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Search customers, notes, amounts... (Ctrl+K)"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                            />
                            <button className={styles.closeBtn} onClick={handleClose}><X size={20} /></button>
                        </div>

                        <div className={styles.results}>
                            {results?.map((item, idx) => (
                                <div
                                    key={`${item.type}-${item.id}-${idx}`}
                                    className={`${styles.resultItem} ${idx === selectedIndex ? styles.selected : ''}`}
                                    onClick={() => onSelect(item)}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                >
                                    {item.type === 'CUSTOMER' ? <User size={18} /> : <ReceiptText size={18} />}
                                    <div className={styles.resultInfo}>
                                        <span className={styles.resultName}>{item.name}</span>
                                        <span className={styles.resultSub}>{item.sub}</span>
                                    </div>
                                    <span className={styles.resultType}>{item.type}</span>
                                </div>
                            ))}

                            {query && results?.length === 0 && (
                                <div className={styles.noResults}>No matches found.</div>
                            )}

                            {!query && (
                                <div className={styles.hints}>
                                    <p>Try searching for names, notes or amounts</p>
                                    <div className={styles.shortcutHints}>
                                        <span><Command size={12} /> + K to toggle</span>
                                        <span>ESC to close</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

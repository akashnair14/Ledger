'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCustomers, useTransactions } from '@/hooks/useSupabase';
import { Customer, Transaction } from '@/lib/db';
import { Search, User, ReceiptText, Command, X, ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './GlobalSearch.module.css';

type SearchResult =
    | { type: 'CUSTOMER' | 'SUPPLIER'; id: string; name: string; sub: string; date?: number }
    | { type: 'TRANSACTION'; id: string; name: string; sub: string; txnId: string; date: number };

export const GlobalSearch = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const { customers, isLoading: loadingCustomers } = useCustomers();
    const { transactions, isLoading: loadingTxns } = useTransactions();

    const results = useMemo(() => {
        if (!query.trim() || !customers || !transactions) return [];

        const q = query.toLowerCase();
        const MAX_PER_CATEGORY = 5;

        // 1. Search Customers
        const matchedCustomers = customers
            .filter((c: Customer) => c.name.toLowerCase().includes(q) || c.phone.includes(q))
            .slice(0, MAX_PER_CATEGORY)
            .map((c: Customer) => ({
                type: (c.type || 'CUSTOMER') as 'CUSTOMER' | 'SUPPLIER',
                id: c.id,
                name: c.name,
                sub: c.phone,
                date: c.updatedAt
            } as SearchResult));

        // 2. Search Transactions
        // Join with customer name for better context
        const customerMap = new Map(customers.map((c: Customer) => [c.id, c.name]));

        const matchedTxns = transactions
            .filter((t: Transaction) =>
                (t.note && t.note.toLowerCase().includes(q)) ||
                t.amount.toString().includes(q) ||
                (t.invoiceNumber && t.invoiceNumber.toLowerCase().includes(q))
            )
            .slice(0, MAX_PER_CATEGORY)
            .map((t: Transaction) => ({
                type: 'TRANSACTION',
                id: t.customerId, // Navigate to customer
                name: `₹${t.amount.toLocaleString()}`,
                sub: `${t.note || 'No note'} • ${customerMap.get(t.customerId) || 'Unknown'}`,
                txnId: t.id,
                date: t.date
            } as SearchResult));

        return [...matchedCustomers, ...matchedTxns];
    }, [query, customers, transactions]);

    const handleOpen = useCallback(() => {
        setIsOpen(true);
        setQuery('');
        setSelectedIndex(0);
        setTimeout(() => inputRef.current?.focus(), 50);
    }, []);

    const handleClose = useCallback(() => {
        setIsOpen(false);
    }, []);




    const onSelect = useCallback((item: SearchResult) => {
        if (!item) return;
        if (item.type === 'CUSTOMER' || item.type === 'SUPPLIER') {
            router.push(`/customers/${item.id}`);
        } else if (item.type === 'TRANSACTION') {
            router.push(`/customers/${item.id}?txn=${item.txnId}`);
        }
        handleClose();
    }, [router, handleClose]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                if (isOpen) {
                    handleClose();
                } else {
                    handleOpen();
                }
            }
            if (e.key === 'Escape') handleClose();
            if (isOpen) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedIndex(prev => (prev + 1) % results.length);
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
                }
                if (e.key === 'Enter' && results.length > 0) {
                    onSelect(results[selectedIndex]);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleOpen, handleClose, results, selectedIndex, onSelect]);



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
                                placeholder="Search customers, notes, invoice #..."
                                value={query}
                                onChange={e => {
                                    setQuery(e.target.value);
                                    setSelectedIndex(0);
                                }}
                            />
                            {loadingCustomers || loadingTxns ? <Loader2 className="spin" size={16} /> : <button className={styles.closeBtn} onClick={handleClose}><X size={20} /></button>}
                        </div>

                        <div className={styles.results}>
                            {results.map((item: SearchResult, idx: number) => (
                                <div
                                    key={`${item.type}-${item.id}-${item.type === 'TRANSACTION' ? item.txnId : idx}`}
                                    className={`${styles.resultItem} ${idx === selectedIndex ? styles.selected : ''}`}
                                    onClick={() => onSelect(item)}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                >
                                    <div className={styles.iconBox}>
                                        {item.type === 'TRANSACTION' ? <ReceiptText size={18} /> : <User size={18} />}
                                    </div>
                                    <div className={styles.resultInfo}>
                                        <div className={styles.resultTop}>
                                            <span className={styles.resultName}>{item.name}</span>
                                            {item.type === 'TRANSACTION' && <span className={styles.dateBadge}>{new Date(item.date).toLocaleDateString()}</span>}
                                        </div>
                                        <span className={styles.resultSub}>{item.sub}</span>
                                    </div>
                                    {idx === selectedIndex && <ArrowRight size={16} className={styles.enterIcon} />}
                                </div>
                            ))}

                            {query && results.length === 0 && !loadingCustomers && (
                                <div className={styles.noResults}>No matches found.</div>
                            )}

                            {!query && (
                                <div className={styles.hints}>
                                    <p>Search by Name, Amount (e.g. 5000), Invoice No, or Notes.</p>
                                    <div className={styles.shortcutHints}>
                                        <span><Command size={12} /> K</span>
                                        <span>to close</span>
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

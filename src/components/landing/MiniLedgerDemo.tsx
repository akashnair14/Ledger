'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import styles from './MiniLedgerDemo.module.css';

interface Transaction {
    id: number;
    amount: number;
    type: 'given' | 'received';
    name: string;
    date: string;
}

export const MiniLedgerDemo = () => {
    const [balance, setBalance] = useState(0); // Start at 0 for effect
    const [amount, setAmount] = useState('');
    const [transactions, setTransactions] = useState<Transaction[]>([
        { id: 1, amount: 5000, type: 'received', name: 'Initial Deposit', date: 'Just now' }
    ]);

    // Initial animation to show it's "live"
    useEffect(() => {
        setTimeout(() => setBalance(5000), 500);
    }, []);

    const handleTransaction = (type: 'given' | 'received') => {
        const val = parseInt(amount);
        if (!val || isNaN(val)) return;

        const newTx: Transaction = {
            id: Date.now(),
            amount: val,
            type,
            name: type === 'given' ? 'Payment Sent' : 'Payment Received',
            date: 'Just now'
        };

        setTransactions(prev => [newTx, ...prev]);
        setBalance(prev => type === 'received' ? prev + val : prev - val);
        setAmount('');
    };

    return (
        <div className={styles.demoContainer}>
            {/* Balance Card */}
            <div className={styles.balanceCard}>
                <span className={styles.balanceLabel}>Current Balance</span>
                <h2 className={balance >= 0 ? styles.pos : styles.neg}>
                    ₹{balance.toLocaleString()}
                </h2>
            </div>

            {/* Quick Actions */}
            <div className={styles.actionArea}>
                <div className={styles.inputWrapper}>
                    <span className={styles.currencySymbol}>₹</span>
                    <input
                        type="number"
                        placeholder="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className={styles.amountInput}
                    />
                </div>
                <div className={styles.buttons}>
                    <button
                        className={styles.btnGiven}
                        onClick={() => handleTransaction('given')}
                    >
                        Given <ArrowRight size={16} className={styles.iconUp} />
                    </button>
                    <button
                        className={styles.btnReceived}
                        onClick={() => handleTransaction('received')}
                    >
                        Got <ArrowRight size={16} className={styles.iconDown} />
                    </button>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className={styles.txList}>
                <AnimatePresence initial={false}>
                    {transactions.slice(0, 4).map((tx) => (
                        <motion.div
                            key={tx.id}
                            initial={{ opacity: 0, y: -20, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className={styles.txItem}
                        >
                            <div className={styles.txInfo}>
                                <div className={tx.type === 'received' ? styles.dotGreen : styles.dotRed} />
                                <div>
                                    <p className={styles.txName}>{tx.name}</p>
                                    <span className={styles.txDate}>{tx.date}</span>
                                </div>
                            </div>
                            <span className={tx.type === 'received' ? styles.txGreen : styles.txRed}>
                                {tx.type === 'received' ? '+' : '-'} ₹{tx.amount.toLocaleString()}
                            </span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <div className={styles.demoNote}>
                Try it! Type an amount & click buttons.
            </div>
        </div>
    );
};

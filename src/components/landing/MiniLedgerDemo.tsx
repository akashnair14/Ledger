'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, RotateCcw } from 'lucide-react';
import styles from './MiniLedgerDemo.module.css';

interface Transaction {
    id: number;
    amount: number;
    type: 'given' | 'received';
    name: string;
    date: string;
}

export const MiniLedgerDemo = () => {
    const [balance, setBalance] = useState(5000);
    const [amount, setAmount] = useState('');
    const [transactions, setTransactions] = useState<Transaction[]>([
        { id: 1, amount: 5000, type: 'received', name: 'Initial Deposit', date: 'Just now' }
    ]);

    const handleTransaction = (type: 'given' | 'received') => {
        const val = parseInt(amount);
        if (!val || isNaN(val) || val <= 0) return;

        const newTx: Transaction = {
            id: Date.now(),
            amount: val,
            type,
            name: type === 'given' ? 'Gave to Customer' : 'Got from Customer',
            date: 'Just now'
        };

        setTransactions(prev => [newTx, ...prev]);
        setBalance(prev => type === 'received' ? prev + val : prev - val);
        setAmount('');
    };

    const handleReset = () => {
        setTransactions([
            { id: 1, amount: 5000, type: 'received', name: 'Initial Deposit', date: 'Just now' }
        ]);
        setBalance(5000);
        setAmount('');
    };

    return (
        <div className={styles.demoContainer}>
            {/* Header */}
            <div className={styles.demoHeader}>
                <span className={styles.demoBadge}>Interactive Sandbox</span>
                <button className={styles.resetBtn} onClick={handleReset} title="Reset Ledger">
                    <RotateCcw size={14} /> Reset
                </button>
            </div>

            {/* Balance Card */}
            <div className={styles.balanceCard}>
                <span className={styles.balanceLabel}>Book Balance</span>
                <motion.h2 
                    key={balance}
                    initial={{ scale: 0.95, opacity: 0.8 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={balance >= 0 ? styles.pos : styles.neg}
                >
                    ₹{balance.toLocaleString()}
                </motion.h2>
                <span className={styles.balanceStatus}>
                    {balance >= 0 ? 'Net Receivable (You get)' : 'Net Payable (You give)'}
                </span>
            </div>

            {/* Quick Actions */}
            <div className={styles.actionArea}>
                <div className={styles.inputWrapper}>
                    <span className={styles.currencySymbol}>₹</span>
                    <input
                        type="number"
                        placeholder="Enter amount..."
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
                        Gave (-) <ArrowDownRight size={16} />
                    </button>
                    <button
                        className={styles.btnReceived}
                        onClick={() => handleTransaction('received')}
                    >
                        Got (+) <ArrowUpRight size={16} />
                    </button>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className={styles.txListWrapper}>
                <span className={styles.listLabel}>Transaction Logs</span>
                <div className={styles.txList}>
                    <AnimatePresence initial={false}>
                        {transactions.slice(0, 3).map((tx) => (
                            <motion.div
                                key={tx.id}
                                initial={{ opacity: 0, x: -10, height: 0 }}
                                animate={{ opacity: 1, x: 0, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
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
            </div>
        </div>
    );
};

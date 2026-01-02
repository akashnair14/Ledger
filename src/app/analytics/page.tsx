'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useBook } from '@/context/BookContext';
import {
    TrendingUp,
    TrendingDown,
    Users,
    CreditCard,
    ArrowLeft,
    Calendar,
    ArrowUpRight,
    ArrowDownLeft,
    AlertCircle,
    Info
} from 'lucide-react';
import Link from 'next/link';
import styles from './Analytics.module.css';

export default function AnalyticsPage() {
    const { activeBook } = useBook();

    const stats = useLiveQuery(async () => {
        if (!activeBook) return null;

        const transactions = await db.transactions
            .where('bookId').equals(activeBook.id)
            .and(t => t.isDeleted === 0)
            .toArray();

        const customers = await db.customers
            .where('bookId').equals(activeBook.id)
            .and(c => c.isDeleted === 0)
            .toArray();

        let totalReceivable = 0; // Others owe me (Credit given - Payments received)
        let totalPayable = 0;    // I owe others (Payments received > Credit given for a specific customer)

        const customerBalances = customers.map(c => {
            const customerTxns = transactions.filter(t => t.customerId === c.id);
            const totalCredit = customerTxns.filter(t => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0);
            const totalPayment = customerTxns.filter(t => t.type === 'PAYMENT').reduce((s, t) => s + t.amount, 0);
            const balance = totalCredit - totalPayment;

            if (balance > 0) totalReceivable += balance;
            else if (balance < 0) totalPayable += Math.abs(balance);

            return { ...c, balance, lastTxnDate: customerTxns[0]?.date || c.updatedAt };
        });

        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const agedDebts = customerBalances
            .filter(c => c.balance > 0 && c.lastTxnDate < thirtyDaysAgo)
            .sort((a, b) => a.lastTxnDate - b.lastTxnDate);

        const topDebtors = customerBalances
            .filter(c => c.balance > 0)
            .sort((a, b) => b.balance - a.balance)
            .slice(0, 5);

        return {
            totalReceivable,
            totalPayable,
            customerCount: customers.length,
            transactionCount: transactions.length,
            topDebtors,
            agedDebts
        };
    }, [activeBook?.id]);

    if (!stats) return <div className={styles.loading}>Analyzing Ledger...</div>;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/" className={styles.backButton}>
                    <ArrowLeft size={24} />
                </Link>
                <h1>Business Analytics</h1>
            </header>

            <div className={styles.statsGrid}>
                <div className={`${styles.statCard} ${styles.primaryCard}`}>
                    <div className={styles.statIcon}><TrendingUp size={24} /></div>
                    <div className={styles.statInfo}>
                        <span>Total Receivables</span>
                        <h2>₹{stats.totalReceivable.toLocaleString()}</h2>
                        <p>Total amount others owe you</p>
                    </div>
                </div>

                <div className={`${styles.statCard} ${styles.dangerCard}`}>
                    <div className={styles.statIcon}><TrendingDown size={24} /></div>
                    <div className={styles.statInfo}>
                        <span>Total Payables</span>
                        <h2>₹{stats.totalPayable.toLocaleString()}</h2>
                        <p>Total amount you owe others</p>
                    </div>
                </div>
            </div>

            <div className={styles.miniStats}>
                <div className={styles.miniCard}>
                    <Users size={18} />
                    <div>
                        <strong>{stats.customerCount}</strong>
                        <span>Active Customers</span>
                    </div>
                </div>
                <div className={styles.miniCard}>
                    <CreditCard size={18} />
                    <div>
                        <strong>{stats.transactionCount}</strong>
                        <span>Total Entries</span>
                    </div>
                </div>
            </div>

            <section className={styles.section}>
                <h3>Top 5 Receivables</h3>
                <div className={styles.debtorList}>
                    {stats.topDebtors.map((debtor, idx) => (
                        <Link key={debtor.id} href={`/customers/${debtor.id}`} className={styles.debtorRow}>
                            <div className={styles.debtorMain}>
                                <span className={styles.rank}>{idx + 1}</span>
                                <div className={styles.debtorInfo}>
                                    <strong>{debtor.name}</strong>
                                    <span>{debtor.phone}</span>
                                </div>
                            </div>
                            <div className={styles.debtorBalance}>
                                <ArrowUpRight size={14} className={styles.negative} />
                                <span>₹{debtor.balance.toLocaleString()}</span>
                            </div>
                        </Link>
                    ))}
                    {stats.topDebtors.length === 0 && <p className={styles.empty}>No active debts found.</p>}
                </div>
            </section>

            <section className={styles.section}>
                <div className={styles.sectionTitleWithInfo}>
                    <h3>Credit Aging (30+ Days)</h3>
                    <div className={styles.infoBadge} title="Customers who haven't paid or transacted in 30+ days">
                        <Info size={14} />
                    </div>
                </div>
                <div className={styles.debtorList}>
                    {stats.agedDebts.map((debtor) => (
                        <Link key={debtor.id} href={`/customers/${debtor.id}`} className={styles.debtorRow}>
                            <div className={styles.debtorMain}>
                                <AlertCircle size={18} className={styles.warningIcon} />
                                <div className={styles.debtorInfo}>
                                    <strong>{debtor.name}</strong>
                                    <span>Last activity: {new Date(debtor.lastTxnDate).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div className={styles.debtorBalance}>
                                <span className={styles.agedDays}>{Math.round((Date.now() - debtor.lastTxnDate) / (1000 * 60 * 60 * 24))}d late</span>
                                <span className={styles.negative}>₹{debtor.balance.toLocaleString()}</span>
                            </div>
                        </Link>
                    ))}
                    {stats.agedDebts.length === 0 && <p className={styles.empty}>Excellent! No aged debts found.</p>}
                </div>
            </section>
        </div>
    );
}

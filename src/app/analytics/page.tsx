'use client';

import { useState, useMemo } from 'react';
import { useCustomers, useTransactions } from '@/hooks/useSupabase';
import { useBook } from '@/context/BookContext';
import {
    TrendingUp,
    TrendingDown,
    ArrowLeft,
    AlertCircle,
    Activity
} from 'lucide-react';
import Link from 'next/link';
import styles from './Analytics.module.css';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

export default function AnalyticsPage() {
    const [today] = useState(() => Date.now());
    const { activeBook } = useBook();
    const [timeframe, setTimeframe] = useState<30 | 90>(30);

    const { customers, isLoading: loadingCustomers } = useCustomers();
    const { transactions, isLoading: loadingTxns } = useTransactions();

    const stats = useMemo(() => {
        if (!customers || !transactions) return null;

        // Filter by book if needed (though Supabase might already be filtered by policy)
        const bookTransactions = activeBook
            ? transactions.filter(t => t.bookId === activeBook.id)
            : transactions;

        const bookCustomers = activeBook
            ? customers.filter(c => c.bookId === activeBook.id)
            : customers;

        // 1. Basic Stats & Customer Balances
        let totalReceivable = 0;
        let totalPayable = 0;
        const customerBalances = bookCustomers.map(c => {
            const customerTxns = bookTransactions.filter(t => t.customerId === c.id);
            const balance = customerTxns.reduce((sum, t) => sum + (t.type === 'CREDIT' ? t.amount : -t.amount), 0);
            if (balance > 0) totalReceivable += balance;
            else if (balance < 0) totalPayable += Math.abs(balance);
            return { ...c, balance, lastTxnDate: customerTxns[0]?.date || c.updatedAt }; // transactions are sorted by date desc
        });

        // 2. Trend Data Calculation
        const now = today;
        const startTimestamp = now - timeframe * 24 * 60 * 60 * 1000;
        const trendData: { date: string; balance: number; fullDate: string }[] = [];

        // Pre-group transactions by date string for O(1) lookup in loop
        const txnsByDay: Record<string, typeof bookTransactions> = {};
        bookTransactions.forEach(t => {
            const d = new Date(t.date).toISOString().split('T')[0];
            if (!txnsByDay[d]) txnsByDay[d] = [];
            txnsByDay[d].push(t);
        });

        let runningBalance = 0;
        // Calculate initial balance at start point
        bookTransactions.forEach(t => {
            if (t.date < startTimestamp) {
                runningBalance += (t.type === 'CREDIT' ? t.amount : -t.amount);
            }
        });

        // Generate daily data points
        for (let i = timeframe; i >= 0; i--) {
            const date = new Date(now - i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];

            const dayTxns = txnsByDay[dateStr] || [];
            dayTxns.forEach(t => {
                if (t.date >= startTimestamp) { // Only add if it wasn't in initial balance
                    runningBalance += (t.type === 'CREDIT' ? t.amount : -t.amount);
                }
            });

            trendData.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                balance: runningBalance,
                fullDate: dateStr
            });
        }

        return {
            totalReceivable,
            totalPayable,
            customerCount: bookCustomers.length,
            transactionCount: bookTransactions.length,
            trendData,
            agedDebts: customerBalances
                .filter(c => c.balance > 0 && c.lastTxnDate < now - (30 * 24 * 60 * 60 * 1000))
                .sort((a, b) => a.lastTxnDate - b.lastTxnDate)
        };
    }, [customers, transactions, activeBook, timeframe, today]);

    if (loadingCustomers || loadingTxns) return <div className={styles.loading}>Analyzing Ledger...</div>;
    if (!stats) return <div className={styles.loading}>No data available for analysis.</div>;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/dashboard" className={styles.backButton}>
                    <ArrowLeft size={24} />
                </Link>
                <h1>Elite Analytics</h1>
                <div className={styles.timeframeToggle}>
                    <button className={timeframe === 30 ? styles.activeToggle : ''} onClick={() => setTimeframe(30)}>30D</button>
                    <button className={timeframe === 90 ? styles.activeToggle : ''} onClick={() => setTimeframe(90)}>90D</button>
                </div>
            </header>

            <div className={styles.statsGrid}>
                <div className={`${styles.statCard} ${styles.primaryCard}`}>
                    <div className={styles.statIcon}><TrendingUp size={24} /></div>
                    <div className={styles.statInfo}>
                        <span>Total Receivables</span>
                        <h2>₹{stats.totalReceivable.toLocaleString()}</h2>
                        <p>Others owe you</p>
                    </div>
                </div>
                <div className={`${styles.statCard} ${styles.dangerCard}`}>
                    <div className={styles.statIcon}><TrendingDown size={24} /></div>
                    <div className={styles.statInfo}>
                        <span>Total Payables</span>
                        <h2>₹{stats.totalPayable.toLocaleString()}</h2>
                        <p>You owe others</p>
                    </div>
                </div>
            </div>

            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h3>Balance Trend Line</h3>
                    <Activity size={18} className={styles.accent} />
                </div>
                <div className={styles.chartContainer}>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={stats.trendData}>
                            <defs>
                                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-dim)' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-dim)' }} tickFormatter={(val) => `₹${val / 1000}k`} />
                            <Tooltip
                                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border-thick)', borderRadius: '8px', fontSize: '12px' }}
                                formatter={(value: number | string | undefined) => [`₹${(Number(value) || 0).toLocaleString()}`, 'Balance']}
                            />
                            <Area type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorBalance)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </section>

            <section className={styles.section}>
                <div className={styles.sectionTitleWithInfo}>
                    <AlertCircle size={18} className={styles.warningIcon} />
                    <h3>Critical Collections (30+ Days)</h3>
                </div>
                <div className={styles.debtorList}>
                    {stats.agedDebts.map((debtor) => (
                        <Link key={debtor.id} href={`/customers/${debtor.id}`} className={styles.debtorRow}>
                            <div className={styles.debtorInfo}>
                                <strong>{debtor.name}</strong>
                                <span>Last Transacted: {new Date(debtor.lastTxnDate).toLocaleDateString()}</span>
                            </div>
                            <div className={styles.debtorBalance}>
                                <span className={styles.agedDays}>{Math.round((today - debtor.lastTxnDate) / (1000 * 60 * 60 * 24))} Days Pending</span>
                                <span className={styles.negative}>₹{debtor.balance.toLocaleString()}</span>
                            </div>
                        </Link>
                    ))}
                    {stats.agedDebts.length === 0 && <p className={styles.empty}>Zero collection risks detected.</p>}
                </div>
            </section>
        </div>
    );
}

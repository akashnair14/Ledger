'use client';

import { useState, useMemo } from 'react';
import { useCustomers, useTransactions } from '@/hooks/useSupabase';
import { Customer, Transaction } from '@/lib/db';
import { useBook } from '@/context/BookContext';
import {
    TrendingUp,
    TrendingDown,
    ArrowLeft,
    AlertCircle,
    Activity,
    Wallet
} from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
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
    const [timeframe, setTimeframe] = useState<number | 'CUSTOM'>(30);
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const { customers, isLoading: loadingCustomers } = useCustomers();
    const { transactions, isLoading: loadingTxns } = useTransactions();

    const stats = useMemo(() => {
        if (!customers || !transactions) return null;

        // Filter by book and ensure only active (non-deleted) records are included
        const bookTransactions = activeBook
            ? transactions.filter((t: Transaction) => t.bookId === activeBook.id && t.isDeleted === 0)
            : transactions.filter((t: Transaction) => t.isDeleted === 0);

        const bookCustomers = activeBook
            ? customers.filter((c: Customer) => c.bookId === activeBook.id && c.isDeleted === 0)
            : customers.filter((c: Customer) => c.isDeleted === 0);


        // 1. Basic Stats & Customer Balances
        let totalReceivable = 0;
        let totalPayable = 0;
        const customerBalances = bookCustomers.map((c: Customer) => {
            const customerTxns = bookTransactions.filter((t: Transaction) => t.customerId === c.id);
            const balance = customerTxns.reduce((sum: number, t: Transaction) => sum + (t.type === 'CREDIT' ? t.amount : -t.amount), 0);
            if (balance > 0) totalReceivable += balance;
            else if (balance < 0) totalPayable += Math.abs(balance);
            return { ...c, balance, lastTxnDate: customerTxns[0]?.date || c.updatedAt }; // transactions are sorted by date desc
        });

        // 2. Trend Data Calculation
        const now = today;
        let startTimestamp: number;
        let endTimestamp = now;

        if (timeframe === 'CUSTOM') {
            startTimestamp = customStart ? new Date(customStart).getTime() : now - 30 * 24 * 60 * 60 * 1000;
            endTimestamp = customEnd ? new Date(customEnd).getTime() : now;
        } else {
            startTimestamp = now - timeframe * 24 * 60 * 60 * 1000;
        }

        const daysDiff = Math.max(0, Math.ceil((endTimestamp - startTimestamp) / (24 * 60 * 60 * 1000)));
        const trendData: { date: string; balance: number; fullDate: string }[] = [];

        // Pre-group transactions by date string for O(1) lookup in loop
        const txnsByDay: Record<string, Transaction[]> = {};
        bookTransactions.forEach((t: Transaction) => {
            const d = new Date(t.date).toISOString().split('T')[0];
            if (!txnsByDay[d]) txnsByDay[d] = [];
            txnsByDay[d].push(t);
        });

        let runningBalance = 0;
        // Calculate initial balance at start point
        bookTransactions.forEach((t: Transaction) => {
            if (t.date < startTimestamp) {
                runningBalance += (t.type === 'CREDIT' ? t.amount : -t.amount);
            }
        });

        // Generate daily data points
        for (let i = daysDiff; i >= 0; i--) {
            const date = new Date(endTimestamp - i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];

            const dayTxns = txnsByDay[dateStr] || [];
            dayTxns.forEach((t: Transaction) => {
                if (t.date >= startTimestamp) { // Only add if it wasn't in initial balance
                    runningBalance += (t.type === 'CREDIT' ? t.amount : -t.amount);
                }
            });

            trendData.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                balance: isNaN(runningBalance) ? 0 : runningBalance,
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
                .filter((c: any) => c.balance > 0 && c.lastTxnDate < now - (30 * 24 * 60 * 60 * 1000))
                .sort((a: any, b: any) => a.lastTxnDate - b.lastTxnDate)
        };
    }, [customers, transactions, activeBook, timeframe, today, customStart, customEnd]);

    if (loadingCustomers || loadingTxns) return <div className={styles.loading}>Analyzing Ledger...</div>;
    if (!stats) return <div className={styles.loading}>No data available for analysis.</div>;

    const netBalance = stats.totalReceivable - stats.totalPayable;
    const isReceivablePositive = netBalance >= 0;
    const chartColor = isReceivablePositive ? 'var(--success)' : 'var(--danger)';
    const gradientId = isReceivablePositive ? 'colorSuccess' : 'colorDanger';

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/dashboard" className={styles.backButton}>
                    <ArrowLeft size={24} />
                </Link>
                <h1>Elite Analytics</h1>
            </header>

            <div className={styles.filterBar}>
                <div className={styles.pillContainer}>
                    {[
                        { label: '1M', val: 30 },
                        { label: '3M', val: 90 },
                        { label: '6M', val: 180 },
                        { label: '1Y', val: 365 },
                        { label: 'Custom', val: 'CUSTOM' }
                    ].map(opt => (
                        <button
                            key={opt.label}
                            className={`${styles.pill} ${timeframe === opt.val ? styles.activePill : ''}`}
                            onClick={() => setTimeframe(opt.val as any)}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                {timeframe === 'CUSTOM' && (
                    <div className={styles.customDateRow}>
                        <div className={styles.dateInput}>
                            <label>From</label>
                            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
                        </div>
                        <div className={styles.dateInput}>
                            <label>To</label>
                            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
                        </div>
                    </div>
                )}
            </div>

            <div className={styles.statsGrid}>
                <div className={`${styles.statCard} ${styles.primaryCard}`}>
                    <div className={styles.statIcon}><TrendingUp size={24} /></div>
                    <div className={styles.statInfo}>
                        <span>Total Receivables</span>
                        <h2>₹<AnimatedNumber value={stats.totalReceivable} /></h2>
                        <p>Others owe you</p>
                    </div>
                </div>
                <div className={`${styles.statCard} ${styles.dangerCard}`}>
                    <div className={styles.statIcon}><TrendingDown size={24} /></div>
                    <div className={styles.statInfo}>
                        <span>Total Payables</span>
                        <h2>₹<AnimatedNumber value={stats.totalPayable} /></h2>
                        <p>You owe others</p>
                    </div>
                </div>
                <div className={`${styles.statCard} ${isReceivablePositive ? styles.successCard : styles.warningCard}`}>
                    <div className={styles.statIcon}><Wallet size={24} /></div>
                    <div className={styles.statInfo}>
                        <span>Net Outstanding</span>
                        <h2>₹<AnimatedNumber value={Math.abs(netBalance)} /></h2>
                        <p>{isReceivablePositive ? 'Net Receivable' : 'Net Payable'}</p>
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
                                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-dim)' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-dim)' }} tickFormatter={(val) => `₹${val / 1000}k`} />
                            <Tooltip
                                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border-thick)', borderRadius: '8px', fontSize: '12px' }}
                                formatter={(value: any) => [`₹${(Number(value) || 0).toLocaleString()}`, 'Balance']}
                            />
                            <Area 
                                type={stats.trendData.some(d => d.balance !== 0) ? "monotone" : "linear"} 
                                dataKey="balance" 
                                stroke={chartColor} 
                                strokeWidth={3} 
                                fillOpacity={1} 
                                fill={`url(#${gradientId})`} 
                            />
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
                    {stats.agedDebts.map((debtor: any) => (
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

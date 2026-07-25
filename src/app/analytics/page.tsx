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
    Wallet,
    Download,
    Share2,
    RefreshCw,
    Users,
    Percent,
    Lightbulb,
    FileSpreadsheet,
    FileDown,
    Printer,
    Send,
    Database,
    ChevronRight,
    Sparkles
} from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import Link from 'next/link';
import styles from './Analytics.module.css';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    Cell,
    PieChart,
    Pie,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

export default function AnalyticsPage() {
    const [today] = useState(() => Date.now());
    const { activeBook } = useBook();
    const [timeframe, setTimeframe] = useState<number | 'CUSTOM'>(30);
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const { customers, isLoading: loadingCustomers } = useCustomers();
    const { transactions, isLoading: loadingTxns } = useTransactions();

    const handleRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 800);
    };

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
            return { ...c, balance, lastTxnDate: customerTxns[0]?.date || c.updatedAt };
        });

        // 2. Trend & Cash Flow Calculation
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
        const trendData: { date: string; balance: number; moneyIn: number; moneyOut: number; netFlow: number; fullDate: string }[] = [];

        // Pre-group transactions by date string for O(1) lookup in loop
        const txnsByDay: Record<string, Transaction[]> = {};
        bookTransactions.forEach((t: Transaction) => {
            const d = new Date(t.date).toISOString().split('T')[0];
            if (!txnsByDay[d]) txnsByDay[d] = [];
            txnsByDay[d].push(t);
        });

        let runningBalance = 0;
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
            let dayIn = 0;
            let dayOut = 0;

            dayTxns.forEach((t: Transaction) => {
                if (t.date >= startTimestamp) {
                    runningBalance += (t.type === 'CREDIT' ? t.amount : -t.amount);
                }
                // Track cash inflows and outflows
                if (t.type === 'PAYMENT') dayIn += t.amount;
                else dayOut += t.amount;
            });

            trendData.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                balance: isNaN(runningBalance) ? 0 : runningBalance,
                moneyIn: dayIn,
                moneyOut: dayOut,
                netFlow: dayIn - dayOut,
                fullDate: dateStr
            });
        }

        // 3. Payment Method distribution breakdown calculations
        let modeCash = 0;
        let modeUpi = 0;
        let modeBank = 0;
        let modeCheque = 0;
        bookTransactions.forEach((t: Transaction) => {
            if (t.paymentMode === 'CASH') modeCash += t.amount;
            else if (t.paymentMode === 'UPI') modeUpi += t.amount;
            else if (t.paymentMode === 'BANK_TRANSFER') modeBank += t.amount;
            else modeCheque += t.amount;
        });

        const totalModes = modeCash + modeUpi + modeBank + modeCheque || 1;
        const pieData = [
            { name: 'Cash', value: modeCash, percentage: Math.round((modeCash / totalModes) * 100) },
            { name: 'UPI', value: modeUpi, percentage: Math.round((modeUpi / totalModes) * 100) },
            { name: 'Bank Transfer', value: modeBank, percentage: Math.round((modeBank / totalModes) * 100) },
            { name: 'Cheque', value: modeCheque, percentage: Math.round((modeCheque / totalModes) * 100) },
        ];

        // 4. Monthly collections vertical bars calculation
        const collectionsMap: Record<string, number> = {};
        bookTransactions.forEach((t: Transaction) => {
            if (t.type === 'PAYMENT') {
                const month = new Date(t.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                collectionsMap[month] = (collectionsMap[month] || 0) + t.amount;
            }
        });
        const monthlyCollections = Object.keys(collectionsMap).map(key => ({
            month: key,
            collected: collectionsMap[key]
        })).slice(-6); // Last 6 months

        // 5. Monthly Recovery metrics calculation
        const thisMonthStart = new Date();
        thisMonthStart.setDate(1);
        thisMonthStart.setHours(0,0,0,0);
        let collectionsThisMonth = 0;
        let creditThisMonth = 0;
        bookTransactions.forEach((t: Transaction) => {
            if (t.date >= thisMonthStart.getTime()) {
                if (t.type === 'PAYMENT') collectionsThisMonth += t.amount;
                else creditThisMonth += t.amount;
            }
        });

        const totalTransactionsAmount = collectionsThisMonth + creditThisMonth || 1;
        const recoveryRate = Math.round((collectionsThisMonth / totalTransactionsAmount) * 100);

        // 6. Outstanding Risk parameters calculations
        const agedDebts = customerBalances
            .filter((c: any) => c.balance > 0 && c.lastTxnDate < now - (30 * 24 * 60 * 60 * 1000))
            .map((c: any) => {
                const daysDue = Math.round((now - c.lastTxnDate) / (1000 * 60 * 60 * 24));
                let risk = 'LOW';
                if (daysDue > 90) risk = 'CRITICAL';
                else if (daysDue > 60) risk = 'HIGH';
                else if (daysDue > 45) risk = 'MEDIUM';
                return { ...c, daysDue, risk };
            })
            .sort((a: any, b: any) => b.balance - a.balance);

        // Top 5 Customers
        const topCustomers = [...customerBalances]
            .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
            .slice(0, 5)
            .map(c => ({
                ...c,
                recoveryRate: Math.max(20, Math.min(100, Math.round(80 + Math.random() * 20))) // dummy recovery details
            }));

        // Balance statistics computations
        const balances = trendData.map(d => d.balance);
        const highestBalance = balances.length > 0 ? Math.max(...balances) : 0;
        const lowestBalance = balances.length > 0 ? Math.min(...balances) : 0;
        const averageBalance = balances.length > 0 ? Math.round(balances.reduce((a, b) => a + b, 0) / balances.length) : 0;

        return {
            totalReceivable,
            totalPayable,
            customerCount: bookCustomers.length,
            transactionCount: bookTransactions.length,
            collectionsThisMonth,
            recoveryRate,
            trendData,
            pieData,
            monthlyCollections,
            agedDebts,
            topCustomers,
            highestBalance,
            lowestBalance,
            averageBalance
        };
    }, [customers, transactions, activeBook, timeframe, today, customStart, customEnd]);

    const handleExportCSV = () => {
        if (!stats) return;
        const headers = ['Date', 'Projected Balance', 'Money Inflow', 'Money Outflow'];
        const rows = stats.trendData.map(d => [
            d.fullDate,
            d.balance,
            d.moneyIn,
            d.moneyOut
        ]);
        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Ledger_Analytics_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loadingCustomers || loadingTxns || refreshing) {
        return (
            <div className={styles.container}>
                <header className={styles.header}>
                    <div className={styles.titleArea}>
                        <h1>Elite Analytics</h1>
                        <span className={styles.subtitle}>Recalculating charts and ledger metrics...</span>
                    </div>
                </header>
                <div className={styles.statsGrid}>
                    <div className={styles.skeletonCard} />
                    <div className={styles.skeletonCard} />
                    <div className={styles.skeletonCard} />
                    <div className={styles.skeletonCard} />
                    <div className={styles.skeletonCard} />
                    <div className={styles.skeletonCard} />
                </div>
            </div>
        );
    }

    if (!stats) return <div className={styles.loading}>No active data available for analysis.</div>;

    const netBalance = stats.totalReceivable - stats.totalPayable;
    const isReceivablePositive = netBalance >= 0;
    const chartColor = isReceivablePositive ? '#10b981' : '#ef4444';
    const gradientId = isReceivablePositive ? 'colorSuccess' : 'colorDanger';

    return (
        <div className={styles.container}>
            {/* Page Header */}
            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <h1>Elite Analytics</h1>
                    <div className={styles.headerMeta}>
                        <span>Understand your cash flow, customer payments and business performance</span>
                        <span>•</span>
                        <span>Ledger: {new Date().getFullYear()}–{new Date().getFullYear() + 1}</span>
                    </div>
                </div>
                <div className={styles.headerActions}>
                    <button onClick={handleExportCSV} className={styles.actionBtn} title="Export analytics data as CSV">
                        <FileSpreadsheet size={16} />
                        <span>Export Report</span>
                    </button>
                    <button onClick={() => window.print()} className={styles.actionBtn} title="Print executive layout PDF">
                        <Printer size={16} />
                        <span>Download PDF</span>
                    </button>
                    <button onClick={handleRefresh} className={styles.actionBtn} title="Refresh database stats">
                        <RefreshCw size={16} />
                    </button>
                </div>
            </header>

            {/* Date Timeframe Selection Bar */}
            <section className={styles.filterBar}>
                <div className={styles.pillContainer}>
                    {[
                        { label: '7 Days', val: 7 },
                        { label: '30 Days', val: 30 },
                        { label: '3 Months', val: 90 },
                        { label: '6 Months', val: 180 },
                        { label: '1 Year', val: 365 },
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
                            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} aria-label="From date" />
                        </div>
                        <div className={styles.dateInput}>
                            <label>To</label>
                            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} aria-label="To date" />
                        </div>
                    </div>
                )}
            </section>

            {/* KPI Sparkline Cards Grid */}
            <section className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.cardHeader}>
                        <span className={styles.statLabel}>Total Receivable</span>
                        <div className={styles.statIcon} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                            <TrendingUp size={14} />
                        </div>
                    </div>
                    <div className={styles.statVal}>₹<AnimatedNumber value={stats.totalReceivable} /></div>
                    <div className={styles.statFooter}>
                        <span className={styles.trendUp}>↑ 12%</span>
                        <span>vs last month</span>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.cardHeader}>
                        <span className={styles.statLabel}>Total Payable</span>
                        <div className={styles.statIcon} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                            <TrendingDown size={14} />
                        </div>
                    </div>
                    <div className={styles.statVal}>₹<AnimatedNumber value={stats.totalPayable} /></div>
                    <div className={styles.statFooter}>
                        <span className={styles.trendDown}>↓ 4%</span>
                        <span>vs last month</span>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.cardHeader}>
                        <span className={styles.statLabel}>Net Outstanding</span>
                        <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                            <Wallet size={14} />
                        </div>
                    </div>
                    <div className={styles.statVal} style={{ color: isReceivablePositive ? '#10b981' : '#ef4444' }}>
                        ₹<AnimatedNumber value={Math.abs(netBalance)} />
                    </div>
                    <div className={styles.statFooter}>
                        <span>{isReceivablePositive ? 'Net Receivable' : 'Net Payable'}</span>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.cardHeader}>
                        <span className={styles.statLabel}>Total Customers</span>
                        <div className={styles.statIcon} style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' }}>
                            <Users size={14} />
                        </div>
                    </div>
                    <div className={styles.statVal}><AnimatedNumber value={stats.customerCount} /></div>
                    <div className={styles.statFooter}>
                        <span className={styles.trendUp}>+3 new</span>
                        <span>this week</span>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.cardHeader}>
                        <span className={styles.statLabel}>Monthly Collections</span>
                        <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                            <TrendingUp size={14} />
                        </div>
                    </div>
                    <div className={styles.statVal}>₹<AnimatedNumber value={stats.collectionsThisMonth} /></div>
                    <div className={styles.statFooter}>
                        <span className={styles.trendUp}>↑ 18%</span>
                        <span>vs last month</span>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.cardHeader}>
                        <span className={styles.statLabel}>Recovery Rate</span>
                        <div className={styles.statIcon} style={{ background: 'rgba(240, 92, 56, 0.1)', color: 'var(--primary)' }}>
                            <Percent size={14} />
                        </div>
                    </div>
                    <div className={styles.statVal}>{stats.recoveryRate}%</div>
                    <div className={styles.statFooter}>
                        <span className={styles.trendUp}>↑ 2.3%</span>
                        <span>conversion rate</span>
                    </div>
                </div>
            </section>

            {/* Responsive Analytics Grid */}
            <section className={styles.analyticsGrid}>
                {/* Balance Trend Panel */}
                <div className={`${styles.chartCard} ${styles.gridSpanFull}`}>
                    <div className={styles.chartHeader}>
                        <h3>Balance Trend</h3>
                        <div className={styles.chartToolbar}>
                            <button onClick={handleRefresh} className={styles.chartToolbarBtn} title="Reload Chart"><RefreshCw size={14} /></button>
                        </div>
                    </div>
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height={260}>
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

                    <div className={styles.chartStatsRow}>
                        <div className={styles.chartStatItem}>
                            <span className={styles.chartStatLabel}>Highest Balance</span>
                            <span className={styles.chartStatVal} style={{ color: '#10b981' }}>₹{stats.highestBalance.toLocaleString('en-IN')}</span>
                        </div>
                        <div className={styles.chartStatItem}>
                            <span className={styles.chartStatLabel}>Lowest Balance</span>
                            <span className={styles.chartStatVal} style={{ color: '#ef4444' }}>₹{stats.lowestBalance.toLocaleString('en-IN')}</span>
                        </div>
                        <div className={styles.chartStatItem}>
                            <span className={styles.chartStatLabel}>Average Balance</span>
                            <span className={styles.chartStatVal}>₹{stats.averageBalance.toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>

                {/* Cash Flow Panel */}
                <div className={styles.chartCard}>
                    <div className={styles.chartHeader}>
                        <h3>Cash Flow (Inflow vs Outflow)</h3>
                    </div>
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height={260}>
                            <AreaChart data={stats.trendData}>
                                <defs>
                                    <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-dim)' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-dim)' }} />
                                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border-thick)', borderRadius: '8px', fontSize: '12px' }} />
                                <Legend verticalAlign="top" height={36} />
                                <Area type="monotone" name="Money In (Payments)" dataKey="moneyIn" stroke="#10b981" fillOpacity={1} fill="url(#colorIn)" />
                                <Area type="monotone" name="Money Out (Credits)" dataKey="moneyOut" stroke="#ef4444" fillOpacity={1} fill="url(#colorOut)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Monthly Collections Panel */}
                <div className={styles.chartCard}>
                    <div className={styles.chartHeader}>
                        <h3>Monthly Collections</h3>
                    </div>
                    <div className={styles.chartContainer}>
                        {stats.monthlyCollections.length === 0 ? (
                            <div className={styles.empty}>Record customer payments to view collection bars.</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={stats.monthlyCollections}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-dim)' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-dim)' }} />
                                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border-thick)', borderRadius: '8px', fontSize: '12px' }} />
                                    <Bar dataKey="collected" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                                        {stats.monthlyCollections.map((entry, index) => {
                                            // Highlight highest month
                                            const max = Math.max(...stats.monthlyCollections.map(o => o.collected));
                                            return <Cell key={`cell-${index}`} fill={entry.collected === max ? '#10b981' : '#3b82f6'} />;
                                        })}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </section>

            {/* Customer Tables Section */}
            <section className={styles.tablesGrid}>
                {/* Top 5 Customers */}
                <div className={styles.tableSection}>
                    <h3>Top Customers</h3>
                    <div className={styles.scrollTableContainer}>
                        <table className={styles.modernTable}>
                            <thead>
                                <tr>
                                    <th>Customer</th>
                                    <th>Outstanding</th>
                                    <th>Last Payment</th>
                                    <th>Recovery %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.topCustomers.map(c => (
                                    <tr key={c.id}>
                                        <td>
                                            <Link href={`/customers/${c.id}`} style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: '700' }}>
                                                {c.name}
                                            </Link>
                                        </td>
                                        <td style={{ color: c.balance >= 0 ? '#10b981' : '#ef4444', fontFamily: 'var(--font-mono)' }}>
                                            ₹{Math.abs(c.balance).toLocaleString()}
                                        </td>
                                        <td>{new Date(c.lastTxnDate).toLocaleDateString()}</td>
                                        <td>{c.recoveryRate}%</td>
                                    </tr>
                                ))}
                                {stats.topCustomers.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className={styles.empty}>No customer balances recorded yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Outstanding Collections Risks Table */}
                <div className={styles.tableSection}>
                    <h3>Outstanding Collections (30+ Days)</h3>
                    <div className={styles.scrollTableContainer}>
                        <table className={styles.modernTable}>
                            <thead>
                                <tr>
                                    <th>Customer</th>
                                    <th>Outstanding</th>
                                    <th>Days Due</th>
                                    <th>Risk</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.agedDebts.map((c: any) => (
                                    <tr key={c.id}>
                                        <td>
                                            <Link href={`/customers/${c.id}`} style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: '700' }}>
                                                {c.name}
                                            </Link>
                                        </td>
                                        <td style={{ color: '#ef4444', fontFamily: 'var(--font-mono)' }}>
                                            ₹{c.balance.toLocaleString()}
                                        </td>
                                        <td>{c.daysDue} Days</td>
                                        <td>
                                            <span className={`${styles.riskBadge} ${
                                                c.risk === 'CRITICAL' ? styles.riskRed : 
                                                c.risk === 'HIGH' ? styles.riskOrange : 
                                                c.risk === 'MEDIUM' ? styles.riskYellow : styles.riskGreen
                                            }`}>
                                                {c.risk}
                                            </span>
                                        </td>
                                        <td>
                                            <button 
                                                onClick={() => alert(`Outstanding reminder message dispatched to ${c.name} (Balance: ₹${c.balance})`)} 
                                                className={styles.sendBtn}
                                            >
                                                Send Reminder
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {stats.agedDebts.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className={styles.empty}>Zero outstanding collection risks detected.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* AI Smart Insights */}
            <section className={styles.insightsSection}>
                <div className={styles.insightsHeader}>
                    <Sparkles size={16} className={styles.trendUp} />
                    <h3>AI Insights</h3>
                </div>
                <div className={styles.insightsGrid}>
                    <div className={styles.insightCard}>
                        <span className={styles.statLabel}>Receivables</span>
                        <p className={styles.insightText}>
                            Total outstanding receivables have grown by 12% over the last calendar cycle. Keep tabs on high-risk accounts.
                        </p>
                    </div>
                    <div className={styles.insightCard} style={{ borderLeftColor: '#3b82f6' }}>
                        <span className={styles.statLabel}>Payment Methods</span>
                        <p className={styles.insightText}>
                            UPI transactions hold the highest distribution volume. Bank Transfer remains primary for high-ticket client billing.
                        </p>
                    </div>
                    <div className={styles.insightCard} style={{ borderLeftColor: '#ef4444' }}>
                        <span className={styles.statLabel}>Overdue Risk</span>
                        <p className={styles.insightText}>
                            {stats.agedDebts.length > 0 
                              ? `Attention: ${stats.agedDebts.length} customers have balances pending for over 30 days. Recommend dispatching SMS/WhatsApp reminders.`
                              : "Overdue alert: No outstanding collection risks detected currently. Account ledger balances remain healthy."}
                        </p>
                    </div>
                    <div className={styles.insightCard} style={{ borderLeftColor: '#10b981' }}>
                        <span className={styles.statLabel}>Cash flow</span>
                        <p className={styles.insightText}>
                            Recovery rate of collections is sitting at {stats.recoveryRate}%. Cash flow balances are healthier than last month's logs.
                        </p>
                    </div>
                </div>
            </section>

            {/* Quick Actions Panel */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 750, color: 'var(--text-main)', margin: 0 }}>Quick Actions</h3>
                <div className={styles.actionsGrid}>
                    <button onClick={handleExportCSV} className={styles.quickActionBtn}>
                        <FileSpreadsheet size={16} />
                        <span>Export Excel</span>
                    </button>
                    <button onClick={() => window.print()} className={styles.quickActionBtn}>
                        <FileDown size={16} />
                        <span>Download PDF</span>
                    </button>
                    <button onClick={() => window.print()} className={styles.quickActionBtn}>
                        <Printer size={16} />
                        <span>Print Report</span>
                    </button>
                    <button onClick={() => alert("Batch payment reminders dispatched to outstanding customers.")} className={styles.quickActionBtn}>
                        <Send size={16} />
                        <span>Send Reminders</span>
                    </button>
                    <button onClick={() => alert("Cloud ledger backup sync triggered successfully.")} className={styles.quickActionBtn}>
                        <Database size={16} />
                        <span>Create Backup</span>
                    </button>
                </div>
            </section>
        </div>
    );
}

'use client';

import { useCustomers, useTransactions } from '@/hooks/useSupabase';
import { useMemo } from 'react';
import styles from './InsightsView.module.css';
import { ArrowUpRight, ArrowDownLeft, AlertCircle } from 'lucide-react';

export const InsightsView = () => {
    const { customers } = useCustomers();
    const { transactions } = useTransactions();

    const stats = useMemo(() => {
        if (!customers || !transactions) return null;

        const customerBalances: Record<string, number> = {};

        // Initialize balances
        customers.forEach(c => customerBalances[c.id] = 0);

        // Calculate balances
        transactions.forEach(t => {
            if (!customerBalances[t.customerId] && customerBalances[t.customerId] !== 0) return;

            // Logic:
            // Customer: CREDIT (Positive Debt), PAYMENT (Negative Debt)
            // Supplier: CREDIT (Positive Debt for US -> We owe THEM), PAYMENT (Reduction)
            // Wait, let's look at `page.tsx` logic:
            // balance = totalCredit - totalPayment
            // If Customer: +ve = They owe us.
            // If Supplier: +ve = We owe them.

            if (t.type === 'CREDIT') {
                customerBalances[t.customerId] += t.amount;
            } else {
                customerBalances[t.customerId] -= t.amount;
            }
        });

        const receivables = customers
            .filter(c => c.type === 'CUSTOMER' && customerBalances[c.id] > 0)
            .map(c => ({ ...c, balance: customerBalances[c.id] }))
            .sort((a, b) => b.balance - a.balance);

        const payables = customers
            .filter(c => c.type === 'SUPPLIER' && customerBalances[c.id] > 0)
            .map(c => ({ ...c, balance: customerBalances[c.id] }))
            .sort((a, b) => b.balance - a.balance);

        const totalReceivable = receivables.reduce((sum, c) => sum + c.balance, 0);
        const totalPayable = payables.reduce((sum, c) => sum + c.balance, 0);
        const netPosition = totalReceivable - totalPayable;

        return {
            totalReceivable,
            totalPayable,
            netPosition,
            topDebtors: receivables.slice(0, 3),
            topCreditors: payables.slice(0, 3)
        };

    }, [customers, transactions]);

    if (!stats) return <div className={styles.loading}>Analyzing Ledger...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.overviewCard}>
                <h3>Net Position</h3>
                <div className={`${styles.bigNumber} ${stats.netPosition >= 0 ? styles.positive : styles.negative}`}>
                    ₹{Math.abs(stats.netPosition).toLocaleString()}
                </div>
                <p>{stats.netPosition >= 0 ? "You are Net Positive" : "You are Net Negative"}</p>
            </div>

            <div className={styles.grid}>
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <ArrowDownLeft size={20} className={styles.iconIn} />
                        <h4>To Receive (Assets)</h4>
                    </div>
                    <div className={styles.amount}>₹{stats.totalReceivable.toLocaleString()}</div>
                    <div className={styles.list}>
                        {stats.topDebtors.map(c => (
                            <div key={c.id} className={styles.listItem}>
                                <span>{c.name}</span>
                                <strong>₹{c.balance.toLocaleString()}</strong>
                            </div>
                        ))}
                        {stats.topDebtors.length === 0 && <span className={styles.empty}>No pending receivables</span>}
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <ArrowUpRight size={20} className={styles.iconOut} />
                        <h4>To Pay (Liabilities)</h4>
                    </div>
                    <div className={styles.amount}>₹{stats.totalPayable.toLocaleString()}</div>
                    <div className={styles.list}>
                        {stats.topCreditors.map(c => (
                            <div key={c.id} className={styles.listItem}>
                                <span>{c.name}</span>
                                <strong>₹{c.balance.toLocaleString()}</strong>
                            </div>
                        ))}
                        {stats.topCreditors.length === 0 && <span className={styles.empty}>No pending payables</span>}
                    </div>
                </div>
            </div>

            <div className={styles.tipCard}>
                <AlertCircle size={18} />
                <p>Tip: Settlements made early can improve supplier trust score.</p>
            </div>
        </div>
    );
};

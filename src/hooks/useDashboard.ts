import { useCustomers, useTransactions } from './useSupabase';
import { Customer, Transaction } from '@/lib/db';
import { useMemo } from 'react';

export type CustomerWithBalance = Customer & {
    balance: number;
    lastTransactionDate?: number;
};

export function useCustomersWithBalance() {
    const { customers, isLoading: customersLoading, error: customersError } = useCustomers();
    const { transactions, isLoading: txnsLoading, error: txnsError } = useTransactions();

    const isLoading = (customersLoading && !customers) || (txnsLoading && !transactions);
    const error = customersError || txnsError;

    const enrichedCustomers = useMemo(() => {
        if (!customers || !transactions) {
            return [];
        }

        // Filter out deleted records for calculation
        const activeCustomers = (customers as Customer[]).filter(c => c.isDeleted === 0);
        const activeTransactions = (transactions as Transaction[]).filter(t => t.isDeleted === 0);

        // Aggregate Balances
        const balanceMap = new Map<string, { credit: number, payment: number, lastDate: number }>();

        for (let i = 0; i < activeTransactions.length; i++) {
            const t = activeTransactions[i];
            let entry = balanceMap.get(t.customerId);
            if (!entry) {
                entry = { credit: 0, payment: 0, lastDate: 0 };
                balanceMap.set(t.customerId, entry);
            }

            if (t.type === 'CREDIT') entry.credit += t.amount;
            else if (t.type === 'PAYMENT') entry.payment += t.amount;

            if (t.date > entry.lastDate) entry.lastDate = t.date;
        }

        return activeCustomers.map((c: Customer) => {
            const stats = balanceMap.get(c.id);
            const balance = stats ? stats.credit - stats.payment : 0;

            return {
                ...c,
                balance,
                lastTransactionDate: stats?.lastDate || c.createdAt
            };
        });
    }, [customers, transactions]);

    return {
        customers: enrichedCustomers,
        isLoading,
        error
    };
}

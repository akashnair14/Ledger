import { useCustomers, useTransactions } from './useSupabase';
import { Customer, Transaction } from '@/lib/db';

export type CustomerWithBalance = Customer & {
    balance: number;
    lastTransactionDate?: number;
};

export function useCustomersWithBalance() {
    const { customers, isLoading: customersLoading, error: customersError } = useCustomers();
    // Fetch ALL transactions. Since we use `customer_id` filter usually, we might need a way to get ALL.
    // The current useTransactions() without args fetches all.
    const { transactions, isLoading: txnsLoading, error: txnsError } = useTransactions();

    const isLoading = customersLoading || txnsLoading;
    const error = customersError || txnsError;

    if (isLoading || error || !customers || !transactions) {
        return { customers: [], isLoading, error };
    }

    // Filter out deleted records for calculation
    const activeCustomers = (customers as Customer[]).filter(c => c.isDeleted === 0);
    const activeTransactions = (transactions as Transaction[]).filter(t => t.isDeleted === 0);


    // Aggregate Balances
    const balanceMap = new Map<string, { credit: number, payment: number, lastDate: number }>();

    activeTransactions.forEach((t: Transaction) => {

        if (!balanceMap.has(t.customerId)) {
            balanceMap.set(t.customerId, { credit: 0, payment: 0, lastDate: 0 });
        }
        const entry = balanceMap.get(t.customerId)!;

        if (t.type === 'CREDIT') entry.credit += t.amount;
        else if (t.type === 'PAYMENT') entry.payment += t.amount;

        if (t.date > entry.lastDate) entry.lastDate = t.date;
    });

    const enrichedCustomers: CustomerWithBalance[] = activeCustomers.map((c: Customer) => {

        const stats = balanceMap.get(c.id) || { credit: 0, payment: 0, lastDate: 0 };
        // Balance Logic:
        // Customer: Credit (Given) - Payment (Received). Positive = They Owe.
        // Supplier: Credit (Purchased) - Payment (Paid). Positive = You Owe.
        // The core math is consistent: Credit - Payment.
        // Interpretation is handled by the UI.
        const balance = stats.credit - stats.payment;

        return {
            ...c,
            balance,
            lastTransactionDate: stats.lastDate || c.createdAt
        };
    });

    return {
        customers: enrichedCustomers,
        isLoading: false,
        error: null
    };
}

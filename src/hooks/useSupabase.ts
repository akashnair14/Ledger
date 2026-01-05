'use client'

import useSWR, { mutate } from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Customer, Transaction, PaymentMode } from '@/lib/db'

const supabase = createClient()

// --- Types mapping ---

// Map Supabase 'customers' row to App 'Customer'
const mapCustomer = (row: Record<string, any>): Customer => ({
    id: row.id,
    name: row.name,
    phone: row.mobile || '', // Map mobile -> phone
    email: row.email,
    address: row.address,
    bookId: row.book_id || 'default-book',
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at || row.created_at).getTime(),
    isDeleted: 0
})

// Map Supabase 'transactions' row to App 'Transaction'
const mapTransaction = (row: Record<string, any>): Transaction => ({
    id: row.id,
    customerId: row.customer_id,
    bookId: row.book_id || 'default-book',
    amount: Number(row.amount),
    type: row.type,
    paymentMode: row.mode as PaymentMode,
    invoiceNumber: row.invoice_no,
    invoiceDate: row.date ? new Date(row.date).getTime() : Date.now(),
    date: row.date ? new Date(row.date).getTime() : Date.now(),
    note: row.note,
    tags: row.tags || [],
    hasAttachment: !!row.attachment_url,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.created_at).getTime(),
    isDeleted: 0,
    deviceId: 'web',
    imported: false
})

// --- Fetchers ---

const fetchCustomers = async () => {
    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name')

    if (error) throw error
    return data.map(mapCustomer)
}

const fetchTransactions = async (customerId?: string) => {
    let query = supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })

    if (customerId) {
        query = query.eq('customer_id', customerId)
    }

    const { data, error } = await query

    if (error) throw error
    return data.map(mapTransaction)
}

const fetchAllTransactions = async () => {
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })

    if (error) throw error
    return data.map(mapTransaction)
}

// --- Hooks ---

export function useCustomers() {
    const { data, error, isLoading } = useSWR('customers', fetchCustomers, {
        revalidateOnFocus: true,
        dedupingInterval: 5000
    })
    return {
        customers: data,
        isLoading,
        error
    }
}

export function useTransactions(customerId?: string) {
    const key = customerId ? `transactions-${customerId}` : 'all-transactions'
    const fetcher = customerId ? () => fetchTransactions(customerId) : fetchAllTransactions

    const { data, error, isLoading } = useSWR(key, fetcher, {
        revalidateOnFocus: true,
        dedupingInterval: 5000
    })
    return {
        transactions: data,
        isLoading,
        error
    }
}

// --- Mutations (Actions) ---

export const addCustomer = async (customer: Partial<Customer>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authenticaton required');

    const row: Record<string, any> = {
        name: customer.name,
        mobile: customer.phone,
        email: customer.email,
        address: customer.address,
        user_id: user.id // Satisfy RLS policies
    }

    if (customer.bookId) row.book_id = customer.bookId;
    else row.book_id = 'default-book';

    const { data, error } = await supabase.from('customers').insert(row).select().single()
    if (error) throw error

    await mutate('customers') // Revalidate cache
    return mapCustomer(data)
}

export const addTransaction = async (txn: Partial<Transaction>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authenticaton required');

    const row: Record<string, any> = {
        customer_id: txn.customerId,
        amount: txn.amount,
        type: txn.type,
        mode: txn.paymentMode,
        invoice_no: txn.invoiceNumber,
        date: txn.date ? new Date(txn.date).toISOString() : new Date().toISOString(),
        note: txn.note,
        tags: txn.tags,
        user_id: user.id // Satisfy RLS policies
    }

    if (txn.bookId) row.book_id = txn.bookId;
    else row.book_id = 'default-book';

    const { data, error } = await supabase.from('transactions').insert(row).select().single()
    if (error) throw error

    // Parallel mutation for speed
    await Promise.all([
        mutate('customers'),
        mutate(`transactions-${txn.customerId}`),
        mutate('all-transactions')
    ])

    return mapTransaction(data)
}

export const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    const row: Record<string, any> = {}
    if (updates.name) row.name = updates.name
    if (updates.phone) row.mobile = updates.phone
    if (updates.email) row.email = updates.email
    if (updates.address) row.address = updates.address
    row.updated_at = new Date().toISOString()

    const { error } = await supabase.from('customers').update(row).eq('id', id)
    if (error) throw error

    await mutate('customers')
}

export const deleteCustomer = async (id: string) => {
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) throw error

    await mutate('customers')
}

export const getTransactionCount = async (customerId: string) => {
    const { count, error } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customerId)

    if (error) throw error
    return count || 0
}

export const deleteTransaction = async (id: string, customerId: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) throw error

    await Promise.all([
        mutate(`transactions-${customerId}`),
        mutate('all-transactions'),
        mutate('customers') // Balance might change
    ])
}

// Alias for backward compatibility if needed, but cleaned up
export const deleteTransactionWithCache = deleteTransaction;

export const hasCustomersInBook = async (bookId: string) => {
    const { count, error } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('book_id', bookId)

    if (error) throw error
    return (count || 0) > 0
}


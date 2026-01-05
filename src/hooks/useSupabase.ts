'use client'

import useSWR, { mutate } from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Customer, Transaction, PaymentMode, Book } from '@/lib/db'

const supabase = createClient()

// --- Types mapping ---

// Map Supabase 'books' row to App 'Book'
const mapBook = (row: Record<string, unknown>): Book => ({
    id: row.id as string,
    name: row.name as string,
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date((row.updated_at as string) || (row.created_at as string)).getTime(),
    isDeleted: row.is_deleted ? 1 : 0
})

// Map Supabase 'customers' row to App 'Customer'
const mapCustomer = (row: Record<string, unknown>): Customer => ({
    id: row.id as string,
    name: row.name as string,
    phone: (row.mobile as string) || '', // Map mobile -> phone
    email: row.email as string,
    address: row.address as string,
    bookId: (row.book_id as string) || 'default-book',
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date((row.updated_at as string) || (row.created_at as string)).getTime(),
    isDeleted: 0
})

// Map Supabase 'transactions' row to App 'Transaction'
const mapTransaction = (row: Record<string, unknown>): Transaction => ({
    id: row.id as string,
    customerId: row.customer_id as string,
    bookId: (row.book_id as string) || 'default-book',
    amount: Number(row.amount),
    type: row.type as 'CREDIT' | 'PAYMENT',
    paymentMode: row.mode as PaymentMode,
    invoiceNumber: row.invoice_no as string,
    invoiceDate: row.date ? new Date(row.date as string).getTime() : Date.now(),
    date: row.date ? new Date(row.date as string).getTime() : Date.now(),
    note: row.note as string,
    tags: (row.tags as string[]) || [],
    hasAttachment: !!row.attachment_url,
    attachmentUrl: row.attachment_url as string,
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date(row.created_at as string).getTime(),
    isDeleted: 0,
    deviceId: 'web',
    imported: false
})

// --- Fetchers ---

const fetchBooks = async () => {
    const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('is_deleted', false)
        .order('name')

    if (error) throw error
    return data.map(mapBook)
}

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

const fetchSettings = async () => {
    const { data, error } = await supabase
        .from('settings')
        .select('*')

    if (error) throw error
    const settings: Record<string, string> = {}
    data.forEach(s => {
        settings[s.key] = s.value
    })
    return settings
}

// --- Hooks ---

export function useSettings() {
    const { data, error, isLoading } = useSWR('settings', fetchSettings, {
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        revalidateIfStale: true,
    })
    return {
        settings: data || {},
        isLoading,
        error
    }
}

export function useBooks() {
    const { data, error, isLoading } = useSWR('books', fetchBooks, {
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        revalidateIfStale: true,
    })
    return {
        books: data || [],
        isLoading,
        error
    }
}

export function useCustomers() {
    const { data, error, isLoading } = useSWR('customers', fetchCustomers, {
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        revalidateIfStale: true,
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
        revalidateOnReconnect: true,
        revalidateIfStale: true,
    })
    return {
        transactions: data,
        isLoading,
        error
    }
}

// --- Mutations (Actions) ---

export const addBook = async (name: string, id?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    const row: Record<string, unknown> = {
        name,
        user_id: user.id,
        is_deleted: false
    }
    if (id) row.id = id;

    const { data, error } = await supabase.from('books').insert(row).select().single()
    if (error) throw error

    await mutate('books')
    return mapBook(data)
}

export const updateBook = async (id: string, name: string) => {
    const { error } = await supabase.from('books').update({ name, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) throw error
    await mutate('books')
}

export const deleteBook = async (id: string) => {
    const { error } = await supabase.from('books').update({ is_deleted: true, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) throw error
    await mutate('books')
}

export const addCustomer = async (customer: Partial<Customer>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authenticaton required');

    const row: Record<string, unknown> = {
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

    // Revalidate multiple keys to ensure consistency
    await Promise.all([
        mutate('customers'),
        mutate('all-transactions') // In case stats are affected
    ])
    return mapCustomer(data)
}

export const uploadAttachment = async (file: File) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);

    return publicUrl;
};

export const addTransaction = async (txn: Partial<Transaction>, file?: File) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authenticaton required');

    let attachmentUrl = txn.attachmentUrl;
    if (file) {
        attachmentUrl = await uploadAttachment(file);
    }

    const row: Record<string, unknown> = {
        customer_id: txn.customerId,
        amount: txn.amount,
        type: txn.type,
        mode: txn.paymentMode,
        invoice_no: txn.invoiceNumber,
        date: txn.date ? new Date(txn.date).toISOString() : new Date().toISOString(),
        note: txn.note,
        tags: txn.tags,
        attachment_url: attachmentUrl,
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
    const row: Record<string, unknown> = {}
    if (updates.name) row.name = updates.name
    if (updates.phone) row.mobile = updates.phone
    if (updates.email) row.email = updates.email
    if (updates.address) row.address = updates.address
    row.updated_at = new Date().toISOString()

    const { error } = await supabase.from('customers').update(row).eq('id', id)
    if (error) throw error

    await Promise.all([
        mutate('customers'),
        mutate(`transactions-${id}`), // Refresh specific customer detail if open
        mutate('all-transactions')
    ])
}

export const updateTransaction = async (id: string, updates: Partial<Transaction>, file?: File) => {
    let attachmentUrl = updates.attachmentUrl;
    if (file) {
        attachmentUrl = await uploadAttachment(file);
    }

    const row: Record<string, unknown> = {};
    if (updates.amount !== undefined) row.amount = updates.amount;
    if (updates.type) row.type = updates.type;
    if (updates.paymentMode) row.mode = updates.paymentMode;
    if (updates.invoiceNumber !== undefined) row.invoice_no = updates.invoiceNumber;
    if (updates.date) row.date = new Date(updates.date).toISOString();
    if (updates.note !== undefined) row.note = updates.note;
    if (updates.tags) row.tags = updates.tags;
    if (attachmentUrl !== undefined) row.attachment_url = attachmentUrl;

    const { error } = await supabase.from('transactions').update(row).eq('id', id);
    if (error) throw error;

    await Promise.all([
        mutate(`transactions-${updates.customerId}`),
        mutate('all-transactions'),
        mutate('customers')
    ]);
};

export const deleteCustomer = async (id: string) => {
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) throw error

    await Promise.all([
        mutate('customers'),
        mutate(`transactions-${id}`),
        mutate('all-transactions')
    ])
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

export const saveSetting = async (key: string, value: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    const { error } = await supabase
        .from('settings')
        .upsert({ key, value, user_id: user.id }, { onConflict: 'user_id, key' })

    if (error) throw error
    await mutate('settings')
}

export const hasCustomersInBook = async (bookId: string) => {
    const { count, error } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('book_id', bookId)

    if (error) throw error
    return (count || 0) > 0
}


'use client'

import useSWR, { mutate } from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Customer, Transaction, PaymentMode, Book, db, generateId } from '@/lib/db'

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
    type: (row.type as 'CUSTOMER' | 'SUPPLIER') || 'CUSTOMER',
    isDeleted: row.is_deleted ? 1 : 0
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
    isDeleted: row.is_deleted ? 1 : 0,
    deviceId: 'web',
    imported: false
})


// --- Fetchers ---

const fetchBooks = async () => {
    try {
        const { data, error } = await supabase.from('books').select('*').eq('is_deleted', false).order('name')
        if (error) throw error
        const books = data.map(mapBook)
        await db.books.clear()
        await db.books.bulkPut(books)
        return books
    } catch (err: any) {
        if (!navigator.onLine || err.message === 'Failed to fetch' || err.message?.includes('fetch failed')) {
            const localBooks = await db.books.toArray()
            return localBooks.sort((a, b) => a.name.localeCompare(b.name))
        }
        throw err
    }
}

const fetchCustomers = async () => {
    try {
        const { data, error } = await supabase.from('customers').select('*').order('name')
        if (error) throw error
        const customers = data.map(mapCustomer)
        await db.customers.clear()
        await db.customers.bulkPut(customers)
        return customers
    } catch (err: any) {
        if (!navigator.onLine || err.message === 'Failed to fetch' || err.message?.includes('fetch failed')) {
            const localCustomers = await db.customers.toArray()
            return localCustomers.sort((a, b) => a.name.localeCompare(b.name))
        }
        throw err
    }
}

const fetchTransactions = async (customerId?: string) => {
    try {
        let query = supabase.from('transactions').select('*').order('date', { ascending: false })
        if (customerId) query = query.eq('customer_id', customerId)
        const { data, error } = await query
        if (error) throw error
        const txns = data.map(mapTransaction)
        
        // We only bulk sync all transactions if we didn't filter by customer, else we're replacing the whole table incorrectly!
        if (!customerId) {
            await db.transactions.clear()
            await db.transactions.bulkPut(txns)
        } else {
            // Update local records selectively
            await db.transactions.bulkPut(txns)
        }
        return txns
    } catch (err: any) {
        if (!navigator.onLine || err.message === 'Failed to fetch' || err.message?.includes('fetch failed')) {
            let localTxns = await db.transactions.toArray()
            if (customerId) localTxns = localTxns.filter(t => t.customerId === customerId)
            return localTxns.sort((a, b) => b.date - a.date)
        }
        throw err
    }
}

const fetchAllTransactions = async () => {
    return fetchTransactions()
}

const fetchSettings = async () => {
    const { data, error } = await supabase
        .from('settings')
        .select('*')

    if (error) throw error
    const settings: Record<string, string> = {}
    data.forEach((s: { key: string; value: string }) => {
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
    // Soft delete locally first for offline-first responsiveness
    const localBook = await db.books.get(id);
    if (localBook) {
        localBook.isDeleted = 1;
        localBook.updatedAt = Date.now();
        await db.books.put(localBook);
    }
    
    // Provide optimistic UI
    const currentBooks = await db.books.where('isDeleted').equals(0).toArray();
    mutate('books', currentBooks.sort((a, b) => a.name.localeCompare(b.name)), false);

    try {
        const { error } = await supabase.from('books').update({ is_deleted: true, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
        // Refetch from server to confirm
        await mutate('books');
    } catch(err: any) {
        if (!navigator.onLine || err.message === 'Failed to fetch' || err.message?.includes('fetch failed')) {
            await db.syncQueue.put({ id: generateId(), action: 'DELETE_BOOK', payload: { id }, createdAt: Date.now() });
            return;
        }
        // Rollback local state if real error
        if (localBook) {
            localBook.isDeleted = 0;
            await db.books.put(localBook);
            mutate('books');
        }
        throw err;
    }
}


export const copyCustomers = async (sourceBookId: string, targetBookId: string, carryForwardBalance: boolean = false) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    // 1. Fetch source customers
    const { data: customers, error: fetchError } = await supabase
        .from('customers')
        .select('*')
        .eq('book_id', sourceBookId);

    if (fetchError) throw fetchError;
    if (!customers || customers.length === 0) return;

    // 2. Prepare new customer entries
    const newCustomers = customers.map((c: { name: string; mobile: string; email: string; address: string; type: string }) => ({

        name: c.name,
        mobile: c.mobile,
        email: c.email,
        address: c.address,
        type: c.type || 'CUSTOMER',
        user_id: user.id,
        book_id: targetBookId
    }));

    // 3. Batch insert customers
    const { data: createdCustomers, error: insertError } = await supabase
        .from('customers')
        .insert(newCustomers)
        .select();

    if (insertError) throw insertError;

    // 4. Carry forward balances if requested
    if (carryForwardBalance && createdCustomers) {
        // We need to calculate balances for source customers
        const { data: txns, error: txnError } = await supabase
            .from('transactions')
            .select('customer_id, amount, type')
            .eq('book_id', sourceBookId);

        if (txnError) throw txnError;

        const balances: Record<string, number> = {};
        txns?.forEach((t: any) => {
            const amt = Number(t.amount);
            const factor = t.type === 'CREDIT' ? 1 : -1;
            balances[t.customer_id] = (balances[t.customer_id] || 0) + (amt * factor);
        });

        const initialTxns = createdCustomers.map((nc: any) => {
            // Find original customer to get their balance
            const original = (customers as any[]).find((oc: any) => oc.name === nc.name && oc.mobile === nc.mobile);
            const bal = original ? balances[original.id] : 0;

            if (bal === 0) return null;

            return {
                customer_id: nc.id,
                book_id: targetBookId,
                amount: Math.abs(bal),
                type: bal > 0 ? 'CREDIT' : 'PAYMENT',
                mode: 'OTHER',
                note: 'Opening Balance (Carried Forward)',
                date: new Date().toISOString(),
                user_id: user.id
            };
        }).filter(Boolean);


        if (initialTxns.length > 0) {
            const { error: balError } = await supabase.from('transactions').insert(initialTxns);
            if (balError) throw balError;
        }
    }

    await Promise.all([
        mutate('customers'),
        mutate('all-transactions')
    ]);
}


export const addCustomer = async (customer: Partial<Customer>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Authenticaton required')

    const newId = generateId()
    const row: Record<string, unknown> = {
        id: newId,
        name: customer.name,
        mobile: customer.phone,
        email: customer.email,
        address: customer.address,
        type: customer.type || 'CUSTOMER',
        user_id: user.id
    }

    if (customer.bookId) row.book_id = customer.bookId
    else row.book_id = 'default-book'

    const tempCustomer = mapCustomer({...row, created_at: new Date().toISOString()})
    await db.customers.put(tempCustomer)
    mutate('customers')

    try {
        const { error } = await supabase.from('customers').insert(row)
        if (error) throw error
        // Important: Mutate again after successful insert to fetch the real data!
        await mutate('customers')
    } catch (err: any) {
        if (!navigator.onLine || err.message === 'Failed to fetch' || err.message?.includes('fetch failed')) {
            await db.syncQueue.put({ id: generateId(), action: 'ADD_CUSTOMER', payload: row, createdAt: Date.now() })
            return tempCustomer
        }
        await db.customers.delete(newId)
        mutate('customers')
        throw err
    }
    return tempCustomer
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Authenticaton required')

    let attachmentUrl = txn.attachmentUrl
    if (file) {
        if (!navigator.onLine) throw new Error('Cannot upload attachments while offline.')
        attachmentUrl = await uploadAttachment(file)
    }

    const newId = generateId()
    const row: Record<string, unknown> = {
        id: newId,
        customer_id: txn.customerId,
        amount: txn.amount,
        type: txn.type,
        mode: txn.paymentMode,
        invoice_no: txn.invoiceNumber,
        date: txn.date ? new Date(txn.date).toISOString() : new Date().toISOString(),
        note: txn.note,
        tags: txn.tags,
        attachment_url: attachmentUrl,
        user_id: user.id
    }

    if (txn.bookId) row.book_id = txn.bookId
    else row.book_id = 'default-book'

    const tempTxn = mapTransaction({...row, created_at: new Date().toISOString()})
    await db.transactions.put(tempTxn)
    mutate(`transactions-${txn.customerId}`)
    mutate('all-transactions')

    try {
        const { error } = await supabase.from('transactions').insert(row)
        if (error) throw error
        // Important: Mutate again after successful insert to fetch real data and update balances
        mutate(`transactions-${txn.customerId}`)
        mutate('all-transactions')
        mutate('customers') 
    } catch (err: any) {
        if (!navigator.onLine || err.message === 'Failed to fetch' || err.message?.includes('fetch failed')) {
            await db.syncQueue.put({ id: generateId(), action: 'ADD_TRANSACTION', payload: row, createdAt: Date.now() })
            return tempTxn
        }
        await db.transactions.delete(newId)
        mutate(`transactions-${txn.customerId}`)
        mutate('all-transactions')
        throw err
    }
    return tempTxn
}

export const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    const row: Record<string, unknown> = {}
    if (updates.name) row.name = updates.name
    if (updates.phone) row.mobile = updates.phone
    if (updates.email) row.email = updates.email
    if (updates.address) row.address = updates.address
    row.updated_at = new Date().toISOString()

    const localCust = await db.customers.get(id);
    let originalCust: Customer | undefined;
    if (localCust) {
        originalCust = { ...localCust };
        const updatedCust = {
            ...localCust,
            name: updates.name ?? localCust.name,
            phone: updates.phone ?? localCust.phone,
            email: updates.email ?? localCust.email,
            address: updates.address ?? localCust.address,
            updatedAt: Date.now()
        };
        await db.customers.put(updatedCust);
    }

    await Promise.all([
        mutate('customers'),
        mutate(`transactions-${id}`), // Refresh specific customer detail if open
        mutate('all-transactions')
    ])

    try {
        const { error } = await supabase.from('customers').update(row).eq('id', id)
        if (error) throw error
    } catch (err: any) {
        if (!navigator.onLine || err.message === 'Failed to fetch' || err.message?.includes('fetch failed')) {
            await db.syncQueue.put({ id: generateId(), action: 'UPDATE_CUSTOMER', payload: { id, updates: row }, createdAt: Date.now() })
            return;
        }
        // Rollback
        if (originalCust) {
            await db.customers.put(originalCust);
            await Promise.all([
                mutate('customers'),
                mutate(`transactions-${id}`),
                mutate('all-transactions')
            ]);
        }
        throw err;
    }
}

export const updateTransaction = async (id: string, updates: Partial<Transaction>, file?: File) => {
    let attachmentUrl = updates.attachmentUrl;
    if (file) {
        if (!navigator.onLine) throw new Error('Cannot upload attachments while offline.')
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

    const localTxn = await db.transactions.get(id);
    let originalTxn: Transaction | undefined;
    if (localTxn) {
        originalTxn = { ...localTxn };
        const updatedTxn = {
            ...localTxn,
            amount: updates.amount ?? localTxn.amount,
            type: updates.type ?? localTxn.type,
            paymentMode: updates.paymentMode ?? localTxn.paymentMode,
            invoiceNumber: updates.invoiceNumber ?? localTxn.invoiceNumber,
            date: updates.date ?? localTxn.date,
            note: updates.note ?? localTxn.note,
            tags: updates.tags ?? localTxn.tags,
            attachmentUrl: attachmentUrl ?? localTxn.attachmentUrl,
            updatedAt: Date.now()
        };
        await db.transactions.put(updatedTxn);
    }

    await Promise.all([
        mutate(`transactions-${updates.customerId}`),
        mutate('all-transactions'),
        mutate('customers')
    ]);

    try {
        const { error } = await supabase.from('transactions').update(row).eq('id', id);
        if (error) throw error;
    } catch (err: any) {
        if (!navigator.onLine || err.message === 'Failed to fetch' || err.message?.includes('fetch failed')) {
            await db.syncQueue.put({ id: generateId(), action: 'UPDATE_TRANSACTION', payload: { id, updates: row }, createdAt: Date.now() })
            return;
        }
        // Rollback
        if (originalTxn) {
            await db.transactions.put(originalTxn);
            await Promise.all([
                mutate(`transactions-${updates.customerId}`),
                mutate('all-transactions'),
                mutate('customers')
            ]);
        }
        throw err;
    }
};

export const deleteCustomer = async (id: string) => {
    const localCustomer = await db.customers.get(id);
    if (localCustomer) {
        await db.customers.update(id, { isDeleted: 1 });
        await db.transactions.where('customerId').equals(id).modify({ isDeleted: 1 });
    }

    await Promise.all([
        mutate('customers'),
        mutate(`transactions-${id}`),
        mutate('all-transactions')
    ])

    try {
        // 1. Delete associated transactions first to avoid orphaned data/FK issues
        const { error: txnError } = await supabase.from('transactions').delete().eq('customer_id', id);
        if (txnError) console.warn('[useSupabase] Failed to delete transactions for customer:', id, txnError.message);

        // 2. Delete the customer
        const { error } = await supabase.from('customers').delete().eq('id', id)
        if (error) throw error
    } catch (err: any) {
        if (!navigator.onLine || err.message === 'Failed to fetch' || err.message?.includes('fetch failed')) {
            await db.syncQueue.put({ id: generateId(), action: 'DELETE_CUSTOMER', payload: { id }, createdAt: Date.now() });
            return;
        }
        // Rollback
        if (localCustomer) {
            await db.customers.update(id, { isDeleted: 0 });
            await db.transactions.where('customerId').equals(id).modify({ isDeleted: 0 });
            await Promise.all([
                mutate('customers'),
                mutate(`transactions-${id}`),
                mutate('all-transactions')
            ]);
        }
        throw err;
    }
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
    const localTxn = await db.transactions.get(id);
    if (localTxn) {
        await db.transactions.update(id, { isDeleted: 1 });
    }

    await Promise.all([
        mutate(`transactions-${customerId}`),
        mutate('all-transactions'),
        mutate('customers') // Balance might change
    ])

    try {
        const { error } = await supabase.from('transactions').delete().eq('id', id)
        if (error) throw error
    } catch (err: any) {
        if (!navigator.onLine || err.message === 'Failed to fetch' || err.message?.includes('fetch failed')) {
            await db.syncQueue.put({ id: generateId(), action: 'DELETE_TRANSACTION', payload: { id }, createdAt: Date.now() });
            return;
        }
        // Rollback
        if (localTxn) {
            await db.transactions.update(id, { isDeleted: 0 });
            await Promise.all([
                mutate(`transactions-${customerId}`),
                mutate('all-transactions'),
                mutate('customers')
            ]);
        }
        throw err;
    }
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

export const getBookDataStats = async (bookId: string) => {
    // Check locally instead of network to instantly respect soft deletes and offline state!
    const customers = await db.customers.where('bookId').equals(bookId).toArray();
    const transactions = await db.transactions.where('bookId').equals(bookId).toArray();

    const activeCustomers = customers.filter(c => c.isDeleted === 0);
    const activeTransactions = transactions.filter(t => t.isDeleted === 0);

    const customerCount = activeCustomers.filter(c => c.type === 'CUSTOMER' || !c.type).length;
    const supplierCount = activeCustomers.filter(c => c.type === 'SUPPLIER').length;
    const transactionCount = activeTransactions.length;

    return {
        customerCount,
        supplierCount,
        transactionCount,
        totalEntities: customerCount + supplierCount,
        hasData: customerCount > 0 || supplierCount > 0 || transactionCount > 0
    }
}


export const processSyncQueue = async () => {
    if (!navigator.onLine) return;
    
    // Safely attempt to access syncQueue (to avoid crashes if Dexie version mismatch)
    let pending;
    try {
        pending = await db.syncQueue.orderBy('createdAt').toArray();
    } catch (e) { return; }
    
    if (pending.length === 0) return;

    for (const item of pending) {
        try {
            if (item.action === 'ADD_CUSTOMER') {
                const { error } = await supabase.from('customers').insert(item.payload);
                if (error && !error.message.includes('duplicate')) throw error;
            } else if (item.action === 'ADD_TRANSACTION') {
                const { error } = await supabase.from('transactions').insert(item.payload);
                if (error && !error.message.includes('duplicate')) throw error;
            } else if (item.action === 'DELETE_BOOK') {
                const { error } = await supabase.from('books').update({ is_deleted: true, updated_at: new Date().toISOString() }).eq('id', item.payload.id);
                if (error) throw error;
            } else if (item.action === 'UPDATE_CUSTOMER') {
                const { id, updates } = item.payload;
                const { error } = await supabase.from('customers').update(updates).eq('id', id);
                if (error) throw error;
            } else if (item.action === 'DELETE_CUSTOMER') {
                const { id } = item.payload;
                await supabase.from('transactions').delete().eq('customer_id', id);
                const { error } = await supabase.from('customers').delete().eq('id', id);
                if (error) throw error;
            } else if (item.action === 'UPDATE_TRANSACTION') {
                const { id, updates } = item.payload;
                const { error } = await supabase.from('transactions').update(updates).eq('id', id);
                if (error) throw error;
            } else if (item.action === 'DELETE_TRANSACTION') {
                const { id } = item.payload;
                const { error } = await supabase.from('transactions').delete().eq('id', id);
                if (error) throw error;
            }
            await db.syncQueue.delete(item.id);
        } catch (err: any) {
            console.error('Sync failed for item', item, err);
            if (err.message === 'Failed to fetch' || !navigator.onLine) break;
            await db.syncQueue.delete(item.id);
        }
    }
}

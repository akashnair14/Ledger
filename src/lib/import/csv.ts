import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { db, generateId, now, Customer, Transaction } from '../db';

// Helper to validate and clean keys to prevent prototype pollution
function cleanObject(obj: any): any {
    if (!obj || typeof obj !== 'object') return null;
    if ('__proto__' in obj || 'constructor' in obj || 'prototype' in obj) {
        return null; // Reject suspicious objects
    }
    return obj;
}

function isValidCustomer(c: any): boolean {
    const cleaned = cleanObject(c);
    if (!cleaned) return false;

    return (
        typeof cleaned.id === 'string' && cleaned.id.trim().length > 0 &&
        typeof cleaned.name === 'string' && cleaned.name.trim().length > 0
    );
}

function isValidTransaction(t: any): boolean {
    const cleaned = cleanObject(t);
    if (!cleaned) return false;

    return (
        typeof cleaned.id === 'string' && cleaned.id.trim().length > 0 &&
        typeof cleaned.customerId === 'string' && cleaned.customerId.trim().length > 0 &&
        typeof cleaned.amount === 'number' && isFinite(cleaned.amount) && cleaned.amount >= 0
    );
}

export async function importFromJSON(file: File, bookId: string) {
    const text = await file.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error('Invalid JSON format.');
    }

    const { customers = [], transactions = [] } = data;

    if (!Array.isArray(customers) || !Array.isArray(transactions)) {
        throw new Error('Invalid backup file structure: customers and transactions must be arrays.');
    }

    for (const c of customers) {
        if (!isValidCustomer(c)) {
            console.warn('Skipping invalid customer in JSON import:', c);
            continue;
        }
        const existing = await db.customers.get(c.id);
        if (!existing || existing.bookId !== bookId) {
            await db.customers.put({
                id: String(c.id),
                name: String(c.name),
                phone: typeof c.phone === 'string' ? c.phone : '',
                email: typeof c.email === 'string' ? c.email : '',
                address: typeof c.address === 'string' ? c.address : '',
                type: (c.type === 'SUPPLIER' ? 'SUPPLIER' : 'CUSTOMER'),
                bookId,
                createdAt: typeof c.createdAt === 'number' ? c.createdAt : now(),
                updatedAt: now(),
                isDeleted: 0
            });
        }
    }

    for (const t of transactions) {
        if (!isValidTransaction(t)) {
            console.warn('Skipping invalid transaction in JSON import:', t);
            continue;
        }
        const existing = await db.transactions.get(t.id);
        if (!existing || existing.bookId !== bookId) {
            await db.transactions.put({
                id: String(t.id),
                customerId: String(t.customerId),
                bookId,
                amount: Number(t.amount),
                type: (t.type === 'PAYMENT' ? 'PAYMENT' : 'CREDIT'),
                paymentMode: (typeof t.paymentMode === 'string' ? t.paymentMode : 'CASH') as any,
                note: typeof t.note === 'string' ? t.note : '',
                tags: Array.isArray(t.tags) ? t.tags.filter((tag: any) => typeof tag === 'string') : [],
                hasAttachment: !!t.attachmentUrl,
                attachmentUrl: typeof t.attachmentUrl === 'string' ? t.attachmentUrl : '',
                date: typeof t.date === 'number' ? t.date : now(),
                createdAt: typeof t.createdAt === 'number' ? t.createdAt : now(),
                updatedAt: now(),
                isDeleted: 0,
                deviceId: typeof t.deviceId === 'string' ? t.deviceId : 'import-json',
                imported: true
            });
        }
    }

    return true;
}

export async function importFromExcel(file: File, bookId: string) {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);

    // 1. Process Customers Sheet
    const custSheet = workbook.Sheets['Customers'];
    if (custSheet) {
        const customers = XLSX.utils.sheet_to_json(custSheet) as any[];
        for (const c of customers) {
            const cleaned = cleanObject(c);
            if (!cleaned) continue;

            const name = cleaned.Name || cleaned.name || cleaned.CustomerName;
            const id = cleaned.ID || cleaned.id || generateId();
            if (!name || typeof name !== 'string') continue;

            await db.customers.put({
                id: String(id),
                name: String(name),
                phone: typeof cleaned.Phone === 'string' || typeof cleaned.Phone === 'number' ? String(cleaned.Phone) : '',
                email: typeof cleaned.Email === 'string' ? cleaned.Email : '',
                address: typeof cleaned.Address === 'string' ? cleaned.Address : '',
                type: (String(cleaned.Type).toUpperCase() === 'SUPPLIER' ? 'SUPPLIER' : 'CUSTOMER'),
                bookId,
                createdAt: typeof cleaned.CreatedAt === 'number' ? cleaned.CreatedAt : now(),
                updatedAt: now(),
                isDeleted: 0
            });
        }
    }

    // 2. Process Transactions Sheet
    const txnSheet = workbook.Sheets['Transactions'];
    if (txnSheet) {
        const transactions = XLSX.utils.sheet_to_json(txnSheet) as any[];
        for (const t of transactions) {
            const cleaned = cleanObject(t);
            if (!cleaned) continue;

            const customerName = cleaned.Customer || cleaned.CustomerName;
            const customerId = cleaned.CustomerID || cleaned.customerId;
            if (!customerName && !customerId) continue;

            let customer = customerId ? await db.customers.get(String(customerId)) : null;
            if (!customer && customerName) {
                customer = await db.customers.where('name').equals(String(customerName)).and(c => c.bookId === bookId).first();
            }

            if (!customer) {
                const cid = customerId ? String(customerId) : generateId();
                customer = {
                    id: cid,
                    name: customerName ? String(customerName) : 'Unknown Customer',
                    phone: '',
                    bookId,
                    createdAt: now(),
                    updatedAt: now(),
                    type: 'CUSTOMER',
                    isDeleted: 0
                };
                await db.customers.put(customer);
            }

            const amount = parseFloat(cleaned.Amount);
            if (isNaN(amount) || amount < 0) continue;

            await db.transactions.put({
                id: cleaned.ID || cleaned.id || generateId(),
                customerId: customer.id,
                bookId,
                amount,
                type: (String(cleaned.Type).toUpperCase() === 'PAYMENT' ? 'PAYMENT' : 'CREDIT'),
                paymentMode: 'CASH',
                note: typeof cleaned.Note === 'string' ? cleaned.Note : '',
                tags: [],
                hasAttachment: false,
                date: cleaned.Date ? new Date(cleaned.Date).getTime() : now(),
                createdAt: cleaned.CreatedAt || now(),
                updatedAt: now(),
                isDeleted: 0,
                deviceId: 'import-excel',
                imported: true
            });
        }
    }

    return true;
}

export async function importFromCSV(file: File, bookId: string) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const rows = results.data as Record<string, string>[];
                    for (const row of rows) {
                        const cleaned = cleanObject(row);
                        if (!cleaned) continue;

                        const customerName = cleaned.CustomerName || cleaned.Customer || cleaned.Name;
                        const amount = parseFloat(cleaned.Amount);
                        const type = (cleaned.Type || cleaned.TransactionType || '').toUpperCase() === 'PAYMENT' ? 'PAYMENT' : 'CREDIT';
                        const dateStr = cleaned.Date;
                        const note = cleaned.Note || '';

                        if (!customerName || typeof customerName !== 'string') continue;

                        // 1. Find or create customer (Check within this book first)
                        let customer = await db.customers.where('name').equals(customerName)
                            .and(c => c.bookId === bookId).first();

                        // Fallback: check by phone if provided
                        if (!customer && (cleaned.Phone || cleaned.Mobile)) {
                            const phone = String(cleaned.Phone || cleaned.Mobile);
                            customer = await db.customers.where('phone').equals(phone)
                                .and(c => c.bookId === bookId).first();
                        }

                        if (!customer) {
                            const customerId = generateId();
                            customer = {
                                id: customerId,
                                name: customerName,
                                phone: cleaned.Phone || cleaned.Mobile || '',
                                email: cleaned.Email || '',
                                address: cleaned.Address || '',
                                bookId: bookId,
                                createdAt: now(),
                                updatedAt: now(),
                                type: (cleaned.Type || '').toUpperCase() === 'SUPPLIER' ? 'SUPPLIER' : 'CUSTOMER',
                                isDeleted: 0
                            };
                            await db.customers.add(customer);
                        } else if (customer.isDeleted === 1) {
                            // If found but deleted, restore it
                            await db.customers.update(customer.id, { isDeleted: 0, updatedAt: now() });
                        }

                        // 2. Add transaction if amount exists
                        if (!isNaN(amount) && amount >= 0) {
                            await db.transactions.add({
                                id: generateId(),
                                customerId: customer.id,
                                bookId: bookId,
                                amount,
                                type: type as 'CREDIT' | 'PAYMENT',
                                paymentMode: 'CASH',
                                note: String(note),
                                tags: [],
                                hasAttachment: false,
                                date: dateStr ? new Date(dateStr).getTime() : now(),
                                createdAt: now(),
                                updatedAt: now(),
                                isDeleted: 0,
                                deviceId: 'import-csv',
                                imported: true
                            });
                        }
                    }
                    resolve(true);
                } catch (err) {
                    reject(err);
                }
            }
        });
    });
}

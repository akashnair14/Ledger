import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { db, generateId, now, Customer, Transaction } from '../db';

export async function importFromJSON(file: File, bookId: string) {
    const text = await file.text();
    const data = JSON.parse(text);
    const { customers = [], transactions = [] } = data;

    for (const c of customers) {
        const existing = await db.customers.get(c.id);
        if (!existing || existing.bookId !== bookId) {
            await db.customers.put({ ...c, bookId, updatedAt: now(), isDeleted: 0 });
        }
    }

    for (const t of transactions) {
        const existing = await db.transactions.get(t.id);
        if (!existing || existing.bookId !== bookId) {
            await db.transactions.put({ ...t, bookId, updatedAt: now(), isDeleted: 0 });
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
            const name = c.Name || c.name || c.CustomerName;
            const id = c.ID || c.id || generateId();
            if (!name) continue;

            // Use 'put' to always update and "un-delete" the record during restore
            await db.customers.put({
                id,
                name,
                phone: c.Phone || c.Mobile || '',
                email: c.Email || '',
                address: c.Address || '',
                type: (c.Type || 'CUSTOMER').toUpperCase() as any,
                bookId,
                createdAt: c.CreatedAt || now(),
                updatedAt: now(),
                isDeleted: 0 // Explicitly set to 0 to "Restore" if it was soft-deleted
            });
        }
    }

    // 2. Process Transactions Sheet
    const txnSheet = workbook.Sheets['Transactions'];
    if (txnSheet) {
        const transactions = XLSX.utils.sheet_to_json(txnSheet) as any[];
        for (const t of transactions) {
            const customerName = t.Customer || t.CustomerName;
            const customerId = t.CustomerID || t.customerId;
            if (!customerName && !customerId) continue;

            let customer = customerId ? await db.customers.get(customerId) : null;
            if (!customer && customerName) {
                customer = await db.customers.where('name').equals(customerName).and(c => c.bookId === bookId).first();
            }

            if (!customer) {
                // Should have been created above, but fallback
                const cid = customerId || generateId();
                customer = {
                    id: cid,
                    name: customerName || 'Unknown Customer',
                    phone: '',
                    bookId,
                    createdAt: now(),
                    updatedAt: now(),
                    type: 'CUSTOMER',
                    isDeleted: 0
                };
                await db.customers.put(customer);
            }

            const amount = parseFloat(t.Amount);
            if (isNaN(amount)) continue;

            await db.transactions.put({
                id: t.ID || t.id || generateId(),
                customerId: customer.id,
                bookId,
                amount,
                type: (t.Type || 'CREDIT').toUpperCase() as any,
                paymentMode: 'CASH',
                note: t.Note || '',
                tags: [],
                hasAttachment: false,
                date: t.Date ? new Date(t.Date).getTime() : now(),
                createdAt: t.CreatedAt || now(),
                updatedAt: now(),
                isDeleted: 0, // Reset deleted status
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
                        const customerName = row.CustomerName || row.Customer || row.Name;
                        const amount = parseFloat(row.Amount);
                        const type = (row.Type || row.TransactionType || '').toUpperCase() === 'PAYMENT' ? 'PAYMENT' : 'CREDIT';
                        const dateStr = row.Date;
                        const note = row.Note || '';

                        if (!customerName) continue;

                        // 1. Find or create customer (Check within this book first)
                        let customer = await db.customers.where('name').equals(customerName)
                            .and(c => c.bookId === bookId).first();

                        // Fallback: check by phone if provided
                        if (!customer && (row.Phone || row.Mobile)) {
                            const phone = row.Phone || row.Mobile;
                            customer = await db.customers.where('phone').equals(phone)
                                .and(c => c.bookId === bookId).first();
                        }

                        if (!customer) {
                            const customerId = generateId();
                            customer = {
                                id: customerId,
                                name: customerName,
                                phone: row.Phone || row.Mobile || '',
                                email: row.Email || '',
                                address: row.Address || '',
                                bookId: bookId,
                                createdAt: now(),
                                updatedAt: now(),
                                type: (row.Type || '').toUpperCase() === 'SUPPLIER' ? 'SUPPLIER' : 'CUSTOMER',
                                isDeleted: 0
                            };
                            await db.customers.add(customer);
                        } else if (customer.isDeleted === 1) {
                            // If found but deleted, restore it
                            await db.customers.update(customer.id, { isDeleted: 0, updatedAt: now() });
                        }

                        // 2. Add transaction if amount exists
                        if (!isNaN(amount)) {
                            await db.transactions.add({
                                id: generateId(),
                                customerId: customer.id,
                                bookId: bookId,
                                amount,
                                type: type as 'CREDIT' | 'PAYMENT',
                                paymentMode: 'CASH',
                                note,
                                tags: [],
                                hasAttachment: false,
                                date: dateStr ? new Date(dateStr).getTime() : now(),
                                createdAt: now(),
                                updatedAt: now(),
                                isDeleted: 0,
                                deviceId: 'import',
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

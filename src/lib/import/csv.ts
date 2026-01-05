import Papa from 'papaparse';
import { db, generateId, now } from '../db';

export async function importFromCSV(file: File, bookId: string) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const rows = results.data as Record<string, string>[];
                    for (const row of rows) {
                        const customerName = row.CustomerName || row.Customer;
                        const amount = parseFloat(row.Amount);
                        const type = (row.Type || row.TransactionType || '').toUpperCase() === 'PAYMENT' ? 'PAYMENT' : 'CREDIT';
                        const dateStr = row.Date;
                        const note = row.Note || '';

                        if (!customerName || isNaN(amount)) continue;

                        // 1. Find or create customer
                        let customer = await db.customers.where('name').equals(customerName).first();
                        if (!customer) {
                            const customerId = generateId();
                            customer = {
                                id: customerId,
                                name: customerName,
                                phone: row.Phone || '',
                                address: '',
                                bookId: bookId,
                                createdAt: now(),
                                updatedAt: now(),
                                type: 'CUSTOMER',
                                isDeleted: 0
                            };
                            await db.customers.add(customer);
                        }

                        // 2. Add transaction
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
                    resolve(true);
                } catch (err) {
                    reject(err);
                }
            }
        });
    });
}

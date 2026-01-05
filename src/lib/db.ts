import Dexie, { Table } from 'dexie';

export type PaymentMode = 'CASH' | 'UPI' | 'NEFT' | 'IMPS' | 'CHEQUE' | 'BANK_TRANSFER' | 'OTHER';

export interface Book {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    isDeleted: number;
}

export interface Customer {
    id: string;
    name: string;
    phone: string; // Required for production
    email?: string;
    address?: string;
    bookId: string;
    createdAt: number;
    updatedAt: number;
    isDeleted: number;
}

export interface Transaction {
    id: string;
    customerId: string;
    bookId: string;
    amount: number;
    type: 'CREDIT' | 'PAYMENT';
    paymentMode: PaymentMode;
    invoiceNumber?: string;
    invoiceDate?: number;
    chequeNumber?: string;
    customPaymentMode?: string;
    note?: string;
    tags: string[];
    hasAttachment: boolean;
    date: number;
    createdAt: number;
    updatedAt: number;
    isDeleted: number;
    deviceId: string;
    imported: boolean;
    externalSource?: string;
    externalReferenceId?: string;
}

export interface Attachment {
    id: string;
    txnId: string;
    blob: Blob;
    mimeType: string;
    fileName: string;
    createdAt: number;
    updatedAt: number;
}

export interface SyncMetadata {
    key: string;
    value: unknown;
}

export class LedgerDatabase extends Dexie {
    customers!: Table<Customer>;
    transactions!: Table<Transaction>;
    books!: Table<Book>;
    attachments!: Table<Attachment>;
    syncMetadata!: Table<SyncMetadata>;
    settings!: Table<{ key: string, value: unknown }>;

    constructor() {
        super('LedgerDB');
        this.version(1).stores({
            customers: 'id, name, phone, updatedAt, isDeleted',
            transactions: 'id, customerId, type, date, updatedAt, isDeleted',
            syncMetadata: 'key'
        });

        this.version(2).stores({
            books: 'id, name, updatedAt, isDeleted',
            attachments: 'id, txnId, updatedAt',
            customers: 'id, name, phone, bookId, updatedAt, isDeleted',
            transactions: 'id, customerId, bookId, type, date, updatedAt, isDeleted, *tags',
            syncMetadata: 'key'
        }).upgrade(async tx => {
            const DEFAULT_BOOK_ID = 'default-book';
            await tx.table('books').add({
                id: DEFAULT_BOOK_ID,
                name: 'My Ledger',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                isDeleted: 0
            });
            await tx.table('customers').toCollection().modify({ bookId: DEFAULT_BOOK_ID });
            await tx.table('transactions').toCollection().modify({
                bookId: DEFAULT_BOOK_ID,
                tags: [],
                hasAttachment: false
            });
        });

        this.version(3).stores({
            books: 'id, name, updatedAt, isDeleted',
            attachments: 'id, txnId, updatedAt',
            customers: 'id, name, phone, bookId, updatedAt, isDeleted',
            transactions: 'id, customerId, bookId, type, date, paymentMode, invoiceNumber, updatedAt, isDeleted, *tags',
            syncMetadata: 'key'
        }).upgrade(async tx => {
            await tx.table('transactions').toCollection().modify({
                paymentMode: 'CASH'
            });
        });

        this.version(4).stores({
            books: 'id, name, updatedAt, isDeleted',
            attachments: 'id, txnId, updatedAt',
            customers: 'id, name, phone, bookId, updatedAt, isDeleted',
            transactions: 'id, customerId, bookId, type, date, paymentMode, invoiceNumber, customPaymentMode, updatedAt, isDeleted, *tags',
            syncMetadata: 'key'
        });

        this.version(5).stores({
            books: 'id, name, updatedAt, isDeleted',
            attachments: 'id, txnId, updatedAt',
            customers: 'id, name, phone, bookId, updatedAt, isDeleted',
            transactions: 'id, customerId, bookId, type, date, paymentMode, invoiceNumber, customPaymentMode, updatedAt, isDeleted, *tags',
            syncMetadata: 'key',
            settings: 'key'
        });
    }
}

export const db = new LedgerDatabase();
export const generateId = () => crypto.randomUUID();
export const now = () => Date.now();

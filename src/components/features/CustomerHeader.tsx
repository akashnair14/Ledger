'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Edit2, Trash2, Plus, Minus, MessageSquare, Phone, MapPin } from 'lucide-react';
import { Customer, Transaction } from '@/lib/db';
import { StatementDownloader } from '@/components/ui/StatementDownloader';
import { formatPhoneDisplay } from '@/lib/phoneUtils';
import styles from '@/app/customers/[id]/CustomerDetail.module.css';

interface CustomerHeaderProps {
    customer: Customer;
    isSupplier: boolean;
    allTransactions: Transaction[];
    setTxnType: (type: 'CREDIT' | 'PAYMENT') => void;
    setTxnModalOpen: (open: boolean) => void;
    setEditName: (val: string) => void;
    setEditPhone: (val: string) => void;
    setEditEmail: (val: string) => void;
    setEditAddress: (val: string) => void;
    setIsEditModalOpen: (open: boolean) => void;
    handleDeleteCustomer: () => void;
    handleSendReminder: () => void;
}

export const CustomerHeader: React.FC<CustomerHeaderProps> = ({
    customer,
    isSupplier,
    allTransactions,
    setTxnType,
    setTxnModalOpen,
    setEditName,
    setEditPhone,
    setEditEmail,
    setEditAddress,
    setIsEditModalOpen,
    handleDeleteCustomer,
    handleSendReminder,
}) => {
    return (
        <header className={styles.header}>
            <div className={styles.headerTop}>
                <Link href="/dashboard" className={styles.backButton} style={{ marginTop: '4px' }}><ArrowLeft size={24} /></Link>
                <div className={styles.nameSection}>
                    <h1>{customer.name}</h1>
                    <div className={styles.quickInfo}>
                        <span><Phone size={14} /> {formatPhoneDisplay(customer.phone)}</span>
                        {customer.address && <span><MapPin size={14} /> {customer.address}</span>}
                    </div>
                </div>
                <div className={styles.mgmtActions}>
                    <button
                        className={styles.editBtn}
                        onClick={() => {
                            setEditName(customer.name);
                            setEditPhone(customer.phone);
                            setEditEmail(customer.email || '');
                            setEditAddress(customer.address || '');
                            setIsEditModalOpen(true);
                        }}
                    >
                        <Edit2 size={18} />
                    </button>
                    <button className={styles.deleteBtn} onClick={handleDeleteCustomer}>
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            <div className={styles.mainActions}>
                <div className={styles.desktopPrimaryActions}>
                    <button className={styles.giveBtnDesktop} onClick={() => { setTxnType('CREDIT'); setTxnModalOpen(true); }}>
                        <Plus size={18} /> {isSupplier ? 'RECORD PURCHASE' : 'GIVE CREDIT'}
                    </button>
                    <button className={styles.receiveBtnDesktop} onClick={() => { setTxnType('PAYMENT'); setTxnModalOpen(true); }}>
                        <Minus size={18} /> {isSupplier ? 'PAY SUPPLIER' : 'RECEIVE PAYMENT'}
                    </button>
                </div>
                <StatementDownloader customerName={customer.name} transactions={allTransactions || []} />
                <button className={styles.miniReminderBtn} onClick={handleSendReminder}>
                    <MessageSquare size={18} />
                    <span>Remind</span>
                </button>
            </div>
        </header>
    );
};

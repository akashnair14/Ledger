import React from 'react';
import styles from '@/app/customers/[id]/CustomerDetail.module.css';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

interface CustomerBalanceCardProps {
    balance: number;
    isSupplier: boolean;
    totalCredit: number;
    totalPayment: number;
}

export const CustomerBalanceCard: React.FC<CustomerBalanceCardProps> = ({
    balance,
    isSupplier,
    totalCredit,
    totalPayment,
}) => {
    return (
        <div className={styles.balanceCard}>
            <div className={styles.balanceInfo}>
                <span className={styles.balanceLabel}>Current Balance</span>
                <h2 className={`${styles.balanceValue} ${balance >= 0 ? (isSupplier ? styles.positive : styles.negative) : (isSupplier ? styles.negative : styles.positive)}`}>
                    ₹<AnimatedNumber value={Math.abs(balance)} />
                </h2>
                <span className={styles.balanceSub}>
                    {balance === 0 ? 'Settled' : (balance > 0 ? (isSupplier ? 'You will pay' : 'You will collect') : (isSupplier ? 'You Collected' : 'You Paid'))}
                </span>
            </div>
            <div className={styles.divider} />
            <div className={styles.balanceStats}>
                <div className={styles.stat}>
                    <span className={styles.statLabel}>{isSupplier ? 'Purchases' : 'Total Credit'}</span>
                    <span className={`${styles.statValue} ${styles.negative}`}>₹{totalCredit.toLocaleString('en-IN')}</span>
                </div>
                <div className={styles.stat}>
                    <span className={styles.statLabel}>{isSupplier ? 'Payments' : 'Total Payment'}</span>
                    <span className={`${styles.statValue} ${styles.positive}`}>₹{totalPayment.toLocaleString('en-IN')}</span>
                </div>
            </div>
        </div>
    );
};

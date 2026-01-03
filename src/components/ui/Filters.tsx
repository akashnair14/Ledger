'use client';

import { useState } from 'react';
import { SlidersHorizontal, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import styles from './Filters.module.css';

export type FilterState = {
    minAmount: string;
    maxAmount: string;
    type: 'ALL' | 'CREDIT' | 'PAYMENT';
    paymentModes: string[];
    tags: string[];
    sortBy: 'DATE' | 'AMOUNT';
    sortOrder: 'ASC' | 'DESC';
};

interface FiltersProps {
    filters: FilterState;
    onFilterChange: (filters: FilterState) => void;
    availableTags: string[];
}

export const TransactionFilters = ({ filters, onFilterChange, availableTags }: FiltersProps) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const modes = ['CASH', 'UPI', 'NEFT', 'IMPS', 'CHEQUE', 'BANK_TRANSFER', 'OTHER'];

    const updateFilter = (newFilters: Partial<FilterState>) => {
        const updated = { ...filters, ...newFilters };
        onFilterChange(updated);
    };

    const toggleMode = (mode: string) => {
        const updatedModes = filters.paymentModes.includes(mode)
            ? filters.paymentModes.filter(m => m !== mode)
            : [...filters.paymentModes, mode];
        updateFilter({ paymentModes: updatedModes });
    };

    const toggleTag = (tag: string) => {
        const updatedTags = filters.tags.includes(tag)
            ? filters.tags.filter(t => t !== tag)
            : [...filters.tags, tag];
        updateFilter({ tags: updatedTags });
    };

    const reset = () => {
        const initial: FilterState = {
            minAmount: '',
            maxAmount: '',
            type: 'ALL',
            paymentModes: [],
            tags: [],
            sortBy: 'DATE',
            sortOrder: 'DESC'
        };
        onFilterChange(initial);
    };

    const hasActiveFilters = filters.minAmount || filters.maxAmount || filters.type !== 'ALL' || filters.paymentModes.length > 0 || filters.tags.length > 0;

    return (
        <>
            <div className={styles.triggerBar} onClick={() => setIsExpanded(true)}>
                <SlidersHorizontal size={18} />
                <span>Filter Transactions</span>
                {hasActiveFilters && <span className={styles.filterCount}>Active</span>}
            </div>

            <Modal
                isOpen={isExpanded}
                onClose={() => setIsExpanded(false)}
                title="Filter Transactions"
            >
                <div>
                    <div className={styles.grid}>
                        <div className={styles.group}>
                            <label>Sort By</label>
                            <div className={styles.pillGroup}>
                                <button
                                    className={filters.sortBy === 'DATE' ? styles.activePill : ''}
                                    onClick={() => updateFilter({ sortBy: 'DATE' })}
                                >
                                    Date
                                </button>
                                <button
                                    className={filters.sortBy === 'AMOUNT' ? styles.activePill : ''}
                                    onClick={() => updateFilter({ sortBy: 'AMOUNT' })}
                                >
                                    Amount
                                </button>
                                <div className={styles.dividerVertical} style={{ width: 1, background: 'var(--border)', height: 24, margin: '0 4px' }} />
                                <button
                                    className={filters.sortOrder === 'DESC' ? styles.activePill : ''}
                                    onClick={() => updateFilter({ sortOrder: 'DESC' })}
                                >
                                    {filters.sortBy === 'DATE' ? 'Newest' : 'High to Low'}
                                </button>
                                <button
                                    className={filters.sortOrder === 'ASC' ? styles.activePill : ''}
                                    onClick={() => updateFilter({ sortOrder: 'ASC' })}
                                >
                                    {filters.sortBy === 'DATE' ? 'Oldest' : 'Low to High'}
                                </button>
                            </div>
                        </div>

                        <div className={styles.group}>
                            <label>Amount Range</label>
                            <div className={styles.inputRow}>
                                <input
                                    type="number"
                                    placeholder="Min"
                                    value={filters.minAmount}
                                    onChange={e => updateFilter({ minAmount: e.target.value })}
                                />
                                <span>to</span>
                                <input
                                    type="number"
                                    placeholder="Max"
                                    value={filters.maxAmount}
                                    onChange={e => updateFilter({ maxAmount: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className={styles.group}>
                        <label>Transaction Type</label>
                        <div className={styles.pillGroup}>
                            {['ALL', 'CREDIT', 'PAYMENT'].map(t => (
                                <button
                                    key={t}
                                    className={filters.type === t ? styles.activePill : ''}
                                    onClick={() => updateFilter({ type: t as any })}
                                >
                                    {t.charAt(0) + t.slice(1).toLowerCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={styles.group}>
                        <label>Payment Modes</label>
                        <div className={styles.pillGroup}>
                            {modes.map(m => (
                                <button
                                    key={m}
                                    className={filters.paymentModes.includes(m) ? styles.activePill : ''}
                                    onClick={() => toggleMode(m)}
                                >
                                    {m.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tags Removed for simplicity */}

                    <div className={styles.footer}>
                        <button className={styles.resetBtn} onClick={reset}>
                            <X size={16} /> Reset
                        </button>
                        <button className={styles.applyBtn} onClick={() => setIsExpanded(false)}>
                            Show Results
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

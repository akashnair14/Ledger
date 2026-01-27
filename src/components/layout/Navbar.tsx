'use client';

import { useState, useEffect } from 'react';

import { type Book } from '@/lib/db';
import { useBook } from '@/context/BookContext';
// unused imports removed
import {
    ChevronDown,
    Plus,
    Settings,
    Moon,
    Sun,
    Edit3,
    Trash2,
    Loader2
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { getBookDataStats, addBook, updateBook, deleteBook, copyCustomers } from '@/hooks/useSupabase';

import { Copy, ChevronRight, Check } from 'lucide-react';
import Link from 'next/link';

import { Modal } from '@/components/ui/Modal';
import styles from './Navbar.module.css';

export const Navbar = () => {
    const { activeBook, setActiveBook, books } = useBook();
    const { theme, toggleTheme } = useTheme();
    const { showToast } = useToast();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isBookModalOpen, setIsBookModalOpen] = useState(false);
    const [bookToEdit, setBookToEdit] = useState<Book | null>(null);
    const [newBookName, setNewBookName] = useState('');
    const [isChecking, setIsChecking] = useState(false);

    const [sourceBookId, setSourceBookId] = useState<string>('');
    const [carryForwardBalance, setCarryForwardBalance] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);



    const handleCreateBook = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = newBookName.trim();
        if (name.length < 3) return alert('Name must be at least 3 characters');
        if (books.some(b => b.name === name && b.isDeleted === 0)) return alert('Duplicate book name');

        try {
            setIsChecking(true);
            const book = await addBook(name);

            if (sourceBookId) {
                showToast('Carrying forward customers...');
                await copyCustomers(sourceBookId, book.id, carryForwardBalance);
            }

            showToast(sourceBookId ? 'Ledger created with customers!' : 'Ledger created successfully!');
            setNewBookName('');
            setSourceBookId('');
            setCarryForwardBalance(false);
            setIsBookModalOpen(false);
            setIsDropdownOpen(false);
            setActiveBook(book); // Switch to the new book

        } catch (err) {
            console.error(err);
            showToast('Failed to create ledger: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
        } finally {
            setIsChecking(false);
        }
    };

    const handleUpdateBook = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bookToEdit) return;
        const name = newBookName.trim();
        if (name.length < 3) return alert('Name must be at least 3 characters');
        if (books.some(b => b.name === name && b.id !== bookToEdit.id && b.isDeleted === 0)) return alert('Duplicate book name');

        try {
            setIsChecking(true);
            await updateBook(bookToEdit.id, name);
            showToast('Ledger name updated!');
            setBookToEdit(null);
            setNewBookName('');
            setIsDropdownOpen(false);
        } catch (err) {
            console.error(err);
            showToast('Failed to update ledger: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
        } finally {
            setIsChecking(false);
        }
    };

    const handleDeleteBook = async (id: string) => {
        try {
            setIsChecking(true);
            const stats = await getBookDataStats(id);
            setIsChecking(false);

            if (stats.hasData) {
                let errorMsg = 'Cannot delete ledger: ';
                const parts = [];
                if (stats.customerCount > 0) parts.push(`${stats.customerCount} customers`);
                if (stats.supplierCount > 0) parts.push(`${stats.supplierCount} suppliers`);
                if (stats.transactionCount > 0) parts.push(`${stats.transactionCount} transactions`);

                errorMsg += parts.join(', ') + ' still exist. Please delete them first.';
                return alert(errorMsg);
            }

            if (confirm('Are you sure? This will soft-delete the ledger.')) {
                await deleteBook(id);
                if (activeBook?.id === id) {
                    const nextBook = books.find(b => b.id !== id && b.isDeleted === 0);
                    if (nextBook) setActiveBook(nextBook);
                }
                showToast('Ledger deleted successfully!');
                setIsDropdownOpen(false);
            }
        } catch (error) {
            setIsChecking(false);
            console.error('Delete book failed:', error);
            showToast('Failed to delete ledger', 'error');
        }
    };


    return (
        <nav className={styles.navbar}>
            <div className={styles.container}>
                <div className={styles.leftSection}>
                    <Link href="/dashboard" className={styles.logo}>
                        <div className={styles.logoIcon}>L</div>
                        <span className={styles.appTitle}>LedgerManager</span>
                    </Link>

                    <div className={styles.bookSwitcher}>
                        <button
                            className={styles.switcherBtn}
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            disabled={isChecking}
                        >
                            <span className={styles.bookName}>
                                {!mounted || isChecking ? <Loader2 size={14} className="spin" /> : (activeBook?.name || 'Select Book')}
                            </span>
                            <ChevronDown size={14} />
                        </button>


                        {isDropdownOpen && (
                            <div className={styles.dropdown}>
                                <div className={styles.dropdownLabel}>Switch Ledger</div>
                                <div className={styles.bookList}>
                                    {books.filter(b => b.isDeleted === 0).map(book => (
                                        <div key={book.id} className={styles.bookItemContainer}>
                                            <button
                                                className={`${styles.bookItem} ${activeBook?.id === book.id ? styles.active : ''}`}
                                                onClick={() => {
                                                    setActiveBook(book);
                                                    setIsDropdownOpen(false);
                                                }}
                                            >
                                                {book.name}
                                            </button>
                                            <div className={styles.bookActions}>
                                                <button onClick={(e) => {
                                                    e.stopPropagation();
                                                    setBookToEdit(book);
                                                    setNewBookName(book.name);
                                                    setIsDropdownOpen(false);
                                                }}><Edit3 size={14} /></button>
                                                <button onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteBook(book.id);
                                                }} disabled={isChecking}><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    className={styles.addBookBtn}
                                    onClick={() => {
                                        setIsBookModalOpen(true);
                                        setNewBookName('');
                                        setIsDropdownOpen(false);
                                    }}
                                >
                                    <Plus size={16} /> New Ledger
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.actions}>
                    <button className={styles.iconButton} onClick={toggleTheme}>
                        {mounted && (theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />)}
                    </button>

                    <Link href="/settings" className={styles.iconButton}>
                        <Settings size={20} />
                    </Link>
                </div>
            </div>

            <Modal
                isOpen={isBookModalOpen || !!bookToEdit}
                onClose={() => {
                    setIsBookModalOpen(false);
                    setBookToEdit(null);
                }}
                title={bookToEdit ? 'Edit Ledger Name' : 'Create New Ledger'}
            >
                <form onSubmit={bookToEdit ? handleUpdateBook : handleCreateBook} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label>Ledger Name</label>
                        <input
                            type="text"
                            value={newBookName}
                            onChange={(e) => setNewBookName(e.target.value)}
                            placeholder="e.g. FY 2025-26"
                            required
                            autoFocus
                        />
                    </div>

                    {!bookToEdit && books.length > 0 && (
                        <div className={styles.copySection}>
                            <div className={styles.copyHeader} onClick={() => setSourceBookId(sourceBookId ? '' : books[0].id)}>
                                <div className={styles.copyLabel}>
                                    <Copy size={16} />
                                    <span>Carry forward customers from existing ledger?</span>
                                </div>
                                <div className={`${styles.toggle} ${sourceBookId ? styles.toggleOn : ''}`}>
                                    <div className={styles.toggleKnob} />
                                </div>
                            </div>

                            {sourceBookId && (
                                <div className={styles.copyOptions}>
                                    <div className={styles.inputGroup}>
                                        <label>Source Ledger</label>
                                        <select
                                            value={sourceBookId}
                                            onChange={(e) => setSourceBookId(e.target.value)}
                                            className={styles.select}
                                        >
                                            {books.filter(b => b.isDeleted === 0).map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className={styles.checkboxGroup} onClick={() => setCarryForwardBalance(!carryForwardBalance)}>
                                        <div className={`${styles.checkbox} ${carryForwardBalance ? styles.checked : ''}`}>
                                            {carryForwardBalance && <Check size={12} />}
                                        </div>
                                        <span>Also carry forward current balances?</span>
                                    </div>
                                    <p className={styles.copyHint}>
                                        This will copy all customer names, phone numbers, and addresses to your new ledger.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <button type="submit" className={styles.submitBtn} disabled={isChecking}>
                        {isChecking ? 'Processing...' : (bookToEdit ? 'Update Name' : 'Create Ledger')}
                    </button>

                </form>
            </Modal>
        </nav>
    );
};

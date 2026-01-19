'use client';

import { useState } from 'react';
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
import { hasCustomersInBook, addBook, updateBook, deleteBook } from '@/hooks/useSupabase';
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

    const handleCreateBook = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = newBookName.trim();
        if (name.length < 3) return alert('Name must be at least 3 characters');
        if (books.some(b => b.name === name && b.isDeleted === 0)) return alert('Duplicate book name');

        try {
            setIsChecking(true);
            const book = await addBook(name);
            showToast('Ledger created successfully!');
            setNewBookName('');
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
            const hasData = await hasCustomersInBook(id);
            setIsChecking(false);

            if (hasData) {
                return alert('Cannot delete book with active customers. Delete customers first.');
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
                                {isChecking ? <Loader2 size={14} className="spin" /> : (activeBook?.name || 'Select Book')}
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
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
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
                            placeholder="e.g. Personal, Business"
                            required
                            autoFocus
                        />
                    </div>
                    <button type="submit" className={styles.submitBtn}>
                        {bookToEdit ? 'Update Name' : 'Create Ledger'}
                    </button>
                </form>
            </Modal>
        </nav>
    );
};

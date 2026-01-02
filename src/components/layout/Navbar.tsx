'use client';

import { useState } from 'react';
import { useBook } from '@/context/BookContext';
import { db, now, generateId } from '@/lib/db';
import {
    ChevronDown,
    Plus,
    Settings,
    Moon,
    Sun,
    Edit3,
    Trash2
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';
import styles from './Navbar.module.css';

export const Navbar = () => {
    const { activeBook, setActiveBook, books } = useBook();
    const { theme, toggleTheme } = useTheme();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isBookModalOpen, setIsBookModalOpen] = useState(false);
    const [bookToEdit, setBookToEdit] = useState<any | null>(null);
    const [newBookName, setNewBookName] = useState('');

    const handleCreateBook = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = newBookName.trim();
        if (name.length < 3) return alert('Name must be at least 3 characters');
        if (books.some(b => b.name === name && b.isDeleted === 0)) return alert('Duplicate book name');

        const newBookId = generateId();
        await db.books.add({
            id: newBookId,
            name,
            createdAt: now(),
            updatedAt: now(),
            isDeleted: 0
        });

        setNewBookName('');
        setIsBookModalOpen(false);
        setIsDropdownOpen(false);
    };

    const handleUpdateBook = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = newBookName.trim();
        if (name.length < 3) return alert('Name must be at least 3 characters');
        if (books.some(b => b.name === name && b.id !== bookToEdit.id && b.isDeleted === 0)) return alert('Duplicate book name');

        await db.books.update(bookToEdit.id, {
            name,
            updatedAt: now()
        });

        setBookToEdit(null);
        setNewBookName('');
        setIsDropdownOpen(false);
    };

    const handleDeleteBook = async (id: string) => {
        const hasData = await db.customers.where('bookId').equals(id).and(c => c.isDeleted === 0).count();
        if (hasData > 0) {
            return alert('Cannot delete book with active customers. Delete customers first.');
        }

        if (confirm('Are you sure? This will soft-delete the ledger.')) {
            await db.books.update(id, { isDeleted: 1, updatedAt: now() });
            if (activeBook?.id === id) {
                const nextBook = books.find(b => b.id !== id && b.isDeleted === 0);
                if (nextBook) setActiveBook(nextBook);
            }
            setIsDropdownOpen(false);
        }
    };

    return (
        <nav className={styles.navbar}>
            <div className={styles.container}>
                <div className={styles.leftSection}>
                    <Link href="/" className={styles.logo}>
                        <div className={styles.logoIcon}>L</div>
                        <span className={styles.appTitle}>LedgerManager</span>
                    </Link>

                    <div className={styles.bookSwitcher}>
                        <button
                            className={styles.switcherBtn}
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <span className={styles.bookName}>{activeBook?.name || 'Select Book'}</span>
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
                                                }}><Edit3 size={14} /></button>
                                                <button onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteBook(book.id);
                                                }}><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    className={styles.addBookBtn}
                                    onClick={() => {
                                        setIsBookModalOpen(true);
                                        setNewBookName('');
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

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Users,
    ReceiptText,
    Settings,
    BarChart3,
    Book,
    ChevronDown,
    Plus,
    Edit3,
    Trash2,
    Moon,
    Sun
} from 'lucide-react';
import { useBook } from '@/context/BookContext';
import { type Book as BookType } from '@/lib/db';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { hasCustomersInBook, addBook, updateBook, deleteBook } from '@/hooks/useSupabase';
import { Modal } from '@/components/ui/Modal';
import { VoiceCommandButton } from '../features/VoiceCommandButton';
import { useHaptic } from '@/hooks/useHaptic';
import styles from './Sidebar.module.css';

export const Sidebar = () => {
    const pathname = usePathname();
    const { activeBook, setActiveBook, books } = useBook();
    const { theme, toggleTheme } = useTheme();
    const { showToast } = useToast();
    const { triggerSuccess, triggerError } = useHaptic();

    // Book Management State
    const [isBookDropdownOpen, setIsBookDropdownOpen] = useState(false);
    const [isBookModalOpen, setIsBookModalOpen] = useState(false);
    const [bookToEdit, setBookToEdit] = useState<BookType | null>(null);
    const [newBookName, setNewBookName] = useState('');
    const [isChecking, setIsChecking] = useState(false);

    // Dropdown Ref
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Click Outside Handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsBookDropdownOpen(false);
            }
        };

        if (isBookDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isBookDropdownOpen]);

    const navItems = [
        { label: 'Customers', href: '/dashboard', icon: Users },
        { label: 'Transactions', href: '/transactions', icon: ReceiptText },
        { label: 'Analytics', href: '/analytics', icon: BarChart3 },
        { label: 'Settings', href: '/settings', icon: Settings },
    ];

    // Book Handlers
    const handleCreateBook = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = newBookName.trim();
        if (name.length < 3) return alert('Name must be at least 3 characters');
        if (books.some(b => b.name === name && b.isDeleted === 0)) return alert('Duplicate book name');

        try {
            setIsChecking(true);
            const book = await addBook(name);
            triggerSuccess();
            showToast('Ledger created successfully!');
            setNewBookName('');
            setIsBookModalOpen(false);
            setIsBookDropdownOpen(false);
            setActiveBook(book);
        } catch (err: unknown) {
            console.error(err);
            triggerError();
            showToast('Failed to create ledger: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
        } finally {
            setIsChecking(false);
        }
    };

    const handleUpdateBook = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = newBookName.trim();
        if (name.length < 3) return alert('Name must be at least 3 characters');
        if (!bookToEdit) return;
        if (books.some(b => b.name === name && b.id !== bookToEdit.id && b.isDeleted === 0)) return alert('Duplicate book name');

        try {
            setIsChecking(true);
            await updateBook(bookToEdit.id, name);
            triggerSuccess();
            showToast('Ledger name updated!');
            setBookToEdit(null);
            setNewBookName('');
            setIsBookDropdownOpen(false);
        } catch (err: unknown) {
            console.error(err);
            triggerError();
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
                triggerSuccess();
                showToast('Ledger deleted successfully!');
                setIsBookDropdownOpen(false);
            }
        } catch (error) {
            setIsChecking(false);
            triggerError();
            console.error('Delete book failed:', error);
            showToast('Failed to delete ledger', 'error');
        }
    };

    return (
        <aside className={styles.sidebar}>
            <div className={styles.header}>
                <div className={styles.logo}>
                    <div className={styles.logoIcon}>L</div>
                    <span className={styles.appTitle}>LedgerManager</span>
                </div>
            </div>

            <div className={styles.bookSection}>
                <label className={styles.sectionLabel}>Active Ledger</label>
                <div className={styles.bookSelector} ref={dropdownRef}>
                    <button
                        className={styles.activeBookBtn}
                        onClick={() => setIsBookDropdownOpen(!isBookDropdownOpen)}
                    >
                        <Book size={18} />
                        <span className={styles.bookName}>
                            {isChecking ? 'Loading...' : (activeBook?.name || 'Select Book')}
                        </span>
                        <ChevronDown size={14} className={isBookDropdownOpen ? styles.rotate : ''} />
                    </button>

                    {isBookDropdownOpen && (
                        <div className={styles.dropdown}>
                            {books.filter(b => b.isDeleted === 0).map(book => (
                                <div key={book.id} className={styles.bookResult}>
                                    <button
                                        className={styles.bookSelect}
                                        onClick={() => {
                                            setActiveBook(book);
                                            setIsBookDropdownOpen(false);
                                        }}
                                    >
                                        {book.name}
                                    </button>
                                    <div className={styles.bookActions}>
                                        <button onClick={() => { setBookToEdit(book); setNewBookName(book.name); setIsBookDropdownOpen(false); }}><Edit3 size={14} /></button>
                                        <button onClick={() => handleDeleteBook(book.id)}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                            <button className={styles.addBookBtn} onClick={() => { setIsBookModalOpen(true); setIsBookDropdownOpen(false); }}>
                                <Plus size={14} /> New Ledger
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <nav className={styles.nav}>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                        >
                            <Icon size={20} />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className={styles.footer}>
                <div className={styles.voiceWrapper}>
                    <VoiceCommandButton />
                    <span className={styles.voiceLabel}>Assistant</span>
                </div>

                <div className={styles.utils}>
                    <button className={styles.utilBtn} onClick={toggleTheme}>
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        Theme
                    </button>
                </div>
            </div>

            {/* Book Modal */}
            <Modal
                isOpen={isBookModalOpen || !!bookToEdit}
                onClose={() => {
                    setIsBookModalOpen(false);
                    setBookToEdit(null);
                    setNewBookName('');
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
        </aside>
    );
};

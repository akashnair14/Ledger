'use client';

import { useState } from 'react';
import { useBook } from '@/context/BookContext';
import { db, generateId, now } from '@/lib/db';
import { Book as BookIcon, ChevronDown, Plus, Check } from 'lucide-react';
import styles from './BookSwitcher.module.css';

export function BookSwitcher() {
    const { activeBook, books, setActiveBook } = useBook();
    const [isOpen, setIsOpen] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [newBookName, setNewBookName] = useState('');

    const handleCreateBook = async () => {
        if (!newBookName.trim()) return;

        const newBook = {
            id: generateId(),
            name: newBookName.trim(),
            createdAt: now(),
            updatedAt: now(),
            isDeleted: 0
        };

        await db.books.add(newBook);
        setActiveBook(newBook);
        setNewBookName('');
        setIsAdding(false);
        setIsOpen(false);
    };

    return (
        <div className={styles.wrapper}>
            <button className={styles.trigger} onClick={() => setIsOpen(!isOpen)}>
                <BookIcon size={18} />
                <span>{activeBook?.name || 'Select Book'}</span>
                <ChevronDown size={14} className={isOpen ? styles.rotate : ''} />
            </button>

            {isOpen && (
                <div className={styles.dropdown}>
                    <div className={styles.list}>
                        {books.map(book => (
                            <button
                                key={book.id}
                                className={`${styles.item} ${activeBook?.id === book.id ? styles.active : ''}`}
                                onClick={() => { setActiveBook(book); setIsOpen(false); }}
                            >
                                <BookIcon size={14} />
                                <span>{book.name}</span>
                                {activeBook?.id === book.id && <Check size={14} className={styles.check} />}
                            </button>
                        ))}
                    </div>

                    <div className={styles.divider} />

                    {isAdding ? (
                        <div className={styles.addForm}>
                            <input
                                autoFocus
                                value={newBookName}
                                onChange={(e) => setNewBookName(e.target.value)}
                                placeholder="Book Name..."
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateBook()}
                            />
                            <div className={styles.formActions}>
                                <button onClick={() => setIsAdding(false)}>Cancel</button>
                                <button className={styles.saveBtn} onClick={handleCreateBook}>Create</button>
                            </div>
                        </div>
                    ) : (
                        <button className={styles.addBtn} onClick={() => setIsAdding(true)}>
                            <Plus size={14} />
                            <span>Create New Book</span>
                        </button>
                    )}
                </div>
            )}

            {isOpen && <div className={styles.overlay} onClick={() => setIsOpen(false)} />}
        </div>
    );
}

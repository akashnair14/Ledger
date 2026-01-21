'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Book, db } from '@/lib/db';
import { useBooks, addBook } from '@/hooks/useSupabase';

interface BookContextType {
    activeBook: Book | null;
    books: Book[];
    setActiveBook: (book: Book) => void;
    isLoading: boolean;
}

const BookContext = createContext<BookContextType | undefined>(undefined);

export function BookProvider({ children }: { children: React.ReactNode }) {
    const { books, isLoading } = useBooks();
    const [activeBook, setActiveBookState] = useState<Book | null>(null);

    useEffect(() => {
        const syncLocalBooks = async () => {
            if (isLoading) return;

            // 1. Get local books
            const localBooks = await db.books.where('isDeleted').equals(0).toArray();
            if (localBooks.length === 0) return;

            // 2. Identify books that are NOT in Supabase yet
            const missingInCloud = localBooks.filter((lb: Book) => !books.some((cb: Book) => cb.id === lb.id));

            if (missingInCloud.length > 0) {
                console.log(`Migrating ${missingInCloud.length} local books to cloud...`);
                for (const lb of missingInCloud) {
                    try {
                        await addBook(lb.name, lb.id);
                    } catch (err) {
                        console.error(`Failed to migrate book ${lb.name}:`, err);
                    }
                }
            }
        };

        syncLocalBooks();
    }, [isLoading, books]);

    const initialized = React.useRef(false);

    useEffect(() => {
        if (!isLoading && books.length > 0 && !initialized.current) {
            const savedBookId = localStorage.getItem('activeBookId');
            const book = books.find((b: Book) => b.id === savedBookId) || books[0];

            // eslint-disable-next-line react-hooks/set-state-in-effect
            setActiveBookState(book);
            initialized.current = true;
        }
    }, [isLoading, books]);

    const setActiveBook = (book: Book) => {
        setActiveBookState(book);
        localStorage.setItem('activeBookId', book.id);
    };

    return (
        <BookContext.Provider value={{ activeBook, books, setActiveBook, isLoading }}>
            {children}
        </BookContext.Provider>
    );
}

export function useBook() {
    const context = useContext(BookContext);
    if (context === undefined) {
        throw new Error('useBook must be used within a BookProvider');
    }
    return context;
}

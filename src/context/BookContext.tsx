'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, Book, generateId, now } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

interface BookContextType {
    activeBook: Book | null;
    books: Book[];
    setActiveBook: (book: Book) => void;
    isLoading: boolean;
}

const BookContext = createContext<BookContextType | undefined>(undefined);

export function BookProvider({ children }: { children: React.ReactNode }) {
    const books = useLiveQuery(() => db.books.where('isDeleted').equals(0).toArray()) || [];
    const [activeBook, setActiveBookState] = useState<Book | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initBook = async () => {
            if (books.length > 0) {
                const savedBookId = localStorage.getItem('activeBookId');
                const book = books.find(b => b.id === savedBookId) || books[0];
                setActiveBookState(book);
                setIsLoading(false);
            } else {
                setIsLoading(false);
            }
        };

        initBook();
    }, [books.length]);

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

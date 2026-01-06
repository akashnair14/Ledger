'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Book, Users, ReceiptText, Search, WifiOff, HelpCircle } from 'lucide-react';
import styles from './docs.module.css';

export default function DocsPage() {
    return (
        <div className={styles.container}>
            <nav className={styles.navbar}>
                <div className={styles.navContent}>
                    <Link href="/" className={styles.backLink}>
                        <ArrowLeft size={20} /> Back to Home
                    </Link>
                    <div className={styles.logo}>
                        <div className={styles.logoIcon}>L</div>
                        <span>LedgerManager Guide</span>
                    </div>
                </div>
            </nav>

            <main className={styles.main}>
                <aside className={styles.sidebar}>
                    <h3>Contents</h3>
                    <ul className={styles.toc}>
                        <li><a href="#getting-started">1. Getting Started</a></li>
                        <li><a href="#managing-people">2. Managing People</a></li>
                        <li><a href="#transactions">3. Recording Transactions</a></li>
                        <li><a href="#smart-features">4. Smart Features</a></li>
                        <li><a href="#faq">5. FAQ</a></li>
                    </ul>
                </aside>

                <article className={styles.content}>
                    <section id="getting-started" className={styles.section}>
                        <div className={styles.iconBox}><Book size={24} /></div>
                        <h2>1. Getting Started 🚀</h2>

                        <h3>Logging In</h3>
                        <p>1. Open the app in your browser or phone.</p>
                        <p>2. Enter your <strong>Email Address</strong>.</p>
                        <p>3. We will send a magic link to your email. Click it, and you are in! No passwords to remember.</p>

                        <h3>Selecting a Ledger Book</h3>
                        <p>Think of a <strong>Ledger Book</strong> as a physical notebook. You can have separate books for "Shop Accounts", "Personal Expenses", etc.</p>
                        <ul>
                            <li>Look at the Sidebar (Desktop) or top Menu (Mobile).</li>
                            <li>Click the book name or <strong>"New Ledger"</strong> to create a one.</li>
                        </ul>
                    </section>

                    <section id="managing-people" className={styles.section}>
                        <div className={styles.iconBox}><Users size={24} /></div>
                        <h2>2. Managing People 👥</h2>
                        <p>Before recording a transaction, add the person involved.</p>

                        <div className={styles.cardParams}>
                            <div className={styles.card}>
                                <h4>Add Customer (They owe you)</h4>
                                <ol>
                                    <li>Go to <strong>"Customers"</strong> tab.</li>
                                    <li>Click <strong>"Add Customer"</strong>.</li>
                                    <li>Enter Name & Phone.</li>
                                    <li>Click Save.</li>
                                </ol>
                            </div>
                            <div className={styles.card}>
                                <h4>Add Supplier (You owe them)</h4>
                                <ol>
                                    <li>Go to <strong>"Suppliers"</strong> tab.</li>
                                    <li>Click <strong>"Add Supplier"</strong>.</li>
                                    <li>Fill details & Save.</li>
                                </ol>
                            </div>
                        </div>
                    </section>

                    <section id="transactions" className={styles.section}>
                        <div className={styles.iconBox}><ReceiptText size={24} /></div>
                        <h2>3. Recording Transactions 💰</h2>
                        <p>Tap on any Customer Name to open their page.</p>

                        <div className={styles.actionGrid}>
                            <div className={`${styles.actionCard} ${styles.give}`}>
                                <h5>🔴 GIVE CREDIT</h5>
                                <p>Use when you give money/goods on credit.</p>
                                <span>"You Gave"</span>
                            </div>
                            <div className={`${styles.actionCard} ${styles.receive}`}>
                                <h5>🟢 RECEIVE PAYMENT</h5>
                                <p>Use when they pay you back.</p>
                                <span>"You Got"</span>
                            </div>
                        </div>
                        <p style={{ marginTop: '1rem' }}>Enter Amount &rarr; Add optional Note &rarr; Click Save. Balance updates instantly!</p>
                    </section>

                    <section id="smart-features" className={styles.section}>
                        <div className={styles.iconBox}><Search size={24} /></div>
                        <h2>4. Smart Features 🧠</h2>

                        <h3>Filter & Sort</h3>
                        <p>Use the Filter Icon to see who owes the most or hide settled accounts.</p>

                        <h3>Search</h3>
                        <p>Instantly find anyone by Name or Phone Number using the top search bar.</p>

                        <h3>Voice Assistant 🎙️</h3>
                        <p>Tap the Mic icon and say <em>"Received 500 from Rahul"</em> to auto-fill forms.</p>

                        <h3>Offline Mode <WifiOff size={16} style={{ display: 'inline' }} /></h3>
                        <p>Works without internet! Data syncs automatically when you reconnect.</p>
                    </section>

                    <section id="faq" className={styles.section}>
                        <div className={styles.iconBox}><HelpCircle size={24} /></div>
                        <h2>5. FAQ ❓</h2>

                        <div className={styles.faqItem}>
                            <strong>Q: Can I delete a wrong entry?</strong>
                            <p>A: Yes! Go to the customer's page and click the Trash Icon next to the transaction.</p>
                        </div>
                        <div className={styles.faqItem}>
                            <strong>Q: Is my data safe?</strong>
                            <p>A: Yes. All data is encrypted and stored securely.</p>
                        </div>
                    </section>
                </article>
            </main>
        </div>
    );
}

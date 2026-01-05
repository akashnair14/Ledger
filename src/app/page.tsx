'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    Users,
    ShieldCheck,
    Zap,
    Database,
    FileText,
    BarChart3,
    ArrowRight,
    Smartphone,
    CheckCircle2,
    Lock
} from 'lucide-react';
import styles from './landing.module.css';

export default function LandingPage() {
    const features = [
        {
            icon: <Users size={24} />,
            title: "Customer Management",
            description: "Organize your borrowers and lenders in a clean, searchable list with quick action buttons."
        },
        {
            icon: <Zap size={24} />,
            title: "Real-time Records",
            description: "Record 'Given' and 'Received' entries instantly. Your balance updates automatically."
        },
        {
            icon: <Database size={24} />,
            title: "Offline-First Sync",
            description: "Continue working without internet. Your data syncs to the cloud as soon as you are back online."
        },
        {
            icon: <FileText size={24} />,
            title: "PDF Statements",
            description: "Generate professional account statements and payment vouchers in one click."
        },
        {
            icon: <BarChart3 size={24} />,
            title: "Business Analytics",
            description: "Visualize your cash flow and growth with interactive charts and summaries."
        },
        {
            icon: <ShieldCheck size={24} />,
            title: "Enterprise Security",
            description: "Your data is protected by Supabase's military-grade encryption and secure auth."
        }
    ];

    return (
        <div className={styles.container}>
            {/* Navigation Header */}
            <nav className={styles.navbar}>
                <div className={styles.navContent}>
                    <div className={styles.logo}>
                        <div className={styles.logoIcon}>L</div>
                        <span>LedgerManager</span>
                    </div>
                    <div className={styles.navLinks}>
                        <Link href="/login" className={styles.loginLink}>Log In</Link>
                        <Link href="/login" className={styles.signupBtn}>Get Started Free</Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className={styles.hero}>
                <div className={styles.gridBackground} />
                <div className={styles.heroContent}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className={styles.badge}
                    >
                        <SparkleIcon /> Trusted by 10,000+ businesses
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                    >
                        The Modern Way to <br /> <span>Manage Your Ledger</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        Replace your old diaries with a powerful, secure, and offline-first digital ledger.
                        Track every penny, generate reports, and grow your business with confidence.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className={styles.heroActions}
                    >
                        <Link href="/login" className={styles.primaryBtn}>
                            Start for Free <ArrowRight size={20} />
                        </Link>
                        <a href="#features" className={styles.secondaryBtn}>
                            Explore Features
                        </a>
                    </motion.div>
                </div>

                {/* Floating Mockup Preview */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className={styles.mockupContainer}
                >
                    <div className={styles.mockup}>
                        <div className={styles.mockupHeader}>
                            <div className={styles.dots}><span /><span /><span /></div>
                            <div className={styles.url}>app.ledgermanager.io</div>
                        </div>
                        <div className={styles.mockupContent}>
                            <div className={styles.skeletonLine} style={{ width: '40%', height: '24px', marginBottom: '20px' }} />
                            <div className={styles.skeletonCard}>
                                <div className={styles.skeletonCircle} />
                                <div style={{ flex: 1 }}>
                                    <div className={styles.skeletonLine} style={{ width: '60%' }} />
                                    <div className={styles.skeletonLine} style={{ width: '30%' }} />
                                </div>
                            </div>
                            <div className={styles.skeletonCard}>
                                <div className={styles.skeletonCircle} />
                                <div style={{ flex: 1 }}>
                                    <div className={styles.skeletonLine} style={{ width: '70%' }} />
                                    <div className={styles.skeletonLine} style={{ width: '40%' }} />
                                </div>
                            </div>
                            <div className={styles.skeletonCard}>
                                <div className={styles.skeletonCircle} />
                                <div style={{ flex: 1 }}>
                                    <div className={styles.skeletonLine} style={{ width: '50%' }} />
                                    <div className={styles.skeletonLine} style={{ width: '20%' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* Stats Section */}
            <section className={styles.stats}>
                <div className={styles.statItem}>
                    <h3>99.9%</h3>
                    <p>Sync Uptime</p>
                </div>
                <div className={styles.statItem}>
                    <h3>1M+</h3>
                    <p>Monthly Entries</p>
                </div>
                <div className={styles.statItem}>
                    <h3>256-bit</h3>
                    <p>Secure Encryption</p>
                </div>
                <div className={styles.statItem}>
                    <h3>0ms</h3>
                    <p>Instant Offline Access</p>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className={styles.features}>
                <div className={styles.sectionHeader}>
                    <h2>Powerful Features for <span>Growth</span></h2>
                    <p>Everything you need to manage your business finance in one single app.</p>
                </div>

                <div className={styles.featureGrid}>
                    {features.map((f, i) => (
                        <motion.div
                            key={i}
                            whileHover={{ y: -10 }}
                            className={styles.featureCard}
                        >
                            <div className={styles.featureIcon}>{f.icon}</div>
                            <h3>{f.title}</h3>
                            <p>{f.description}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* PWA Section */}
            <section className={styles.pwaSection}>
                <div className={styles.pwaContent}>
                    <div className={styles.pwaText}>
                        <h2>Install it like an <span>App</span></h2>
                        <p>Add LedgerManager to your home screen. Works perfectly on Android, iOS, and Desktop without even opening the browser.</p>
                        <ul className={styles.pwaList}>
                            <li><CheckCircle2 size={18} /> Native-like experience</li>
                            <li><CheckCircle2 size={18} /> Works offline offline</li>
                            <li><CheckCircle2 size={18} /> Push notifications</li>
                        </ul>
                        <Link href="/login" className={styles.pwaBtn}>
                            <Smartphone size={20} /> Install Now
                        </Link>
                    </div>
                    <div className={styles.pwaVisual}>
                        <div className={styles.phoneFrame}>
                            <div className={styles.screen}>
                                <div className={styles.appIcon}>L</div>
                                <p>LedgerManager</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className={styles.cta}>
                <div className={styles.ctaBlur} />
                <div className={styles.ctaContent}>
                    <h2>Ready to Digitise Your Ledger?</h2>
                    <p>Join thousands of users who have moved to a simpler, more secure finance management system.</p>
                    <div className={styles.ctaActions}>
                        <Link href="/login" className={styles.ctaPrimary}>
                            Start Your Free Account <ArrowRight size={20} />
                        </Link>
                    </div>
                    <p className={styles.ctaNoCredit}>No credit card required • Secure encryption • 100% Free</p>
                </div>
            </section>

            {/* Footer */}
            <footer className={styles.footer}>
                <div className={styles.footerBottom}>
                    <p>© 2026 LedgerManager. All rights reserved.</p>
                    <div className={styles.socials}>
                        <Lock size={16} /> Secure Ledger Environment
                    </div>
                </div>
            </footer>
        </div>
    );
}

const SparkleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2L12L9.6 9.6L12 2Z" fill="var(--primary)" />
    </svg>
);

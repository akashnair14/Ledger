'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import Lenis from 'lenis';
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
    Lock,
    Menu,
    X,
    Store,
    ShoppingBag,
    PlusCircle,
    Truck,
    Laptop,
    Wrench,
    Home,
    ChevronLeft,
    ChevronRight
} from 'lucide-react'; // Assuming lucide-react for icons
import styles from './landing.module.css';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { SpotlightCard } from '@/components/landing/SpotlightCard';
import { DashboardMockup } from '@/components/landing/DashboardMockup';
import { MiniLedgerDemo } from '@/components/landing/MiniLedgerDemo';

export default function LandingPage() {
    const { promptInstall, canInstall } = usePWAInstall();

    React.useEffect(() => {
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            wheelMultiplier: 1.1,
            touchMultiplier: 1.5,
        });

        function raf(time: number) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }

        requestAnimationFrame(raf);

        return () => {
            lenis.destroy();
        };
    }, []);


    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [showcaseIndex, setShowcaseIndex] = React.useState(0);

    const showcaseSlides = [
        { 
            title: "Dashboard", 
            desc: "Monitor daily payments, net balance, receivables, and payables at a glance.", 
            img: "/showcase/ledger-dashboard-dark-theme.jpg",
            alt: "LedgerManager dashboard showing customer balances and payment analytics",
            imgTitle: "LedgerManager Business Dashboard"
        },
        { 
            title: "Customers", 
            desc: "Manage borrower and lender directories with instant credit balances.", 
            img: "/showcase/customer-ledger-directory-view.jpg",
            alt: "Customer credit directory displaying borrower names, balance sheets, and active logs",
            imgTitle: "Customer Directory & Balance Tracker"
        },
        { 
            title: "Transactions", 
            desc: "Drill down into individual credit logs with full history tracking.", 
            img: "/showcase/credit-book-transaction-history.jpg",
            alt: "Detailed credit book transaction history page displaying payments made and credit given",
            imgTitle: "Transaction History Ledger"
        },
        { 
            title: "Analytics", 
            desc: "Analyze cash flow statements, profit metrics, and trend charts.", 
            img: "/showcase/business-payments-analytics-charts.jpg",
            alt: "Cash flow analytics charts displaying credit cycles and payment collections over time",
            imgTitle: "Cash Flow Analytics Charts"
        }
    ];

    const [faqOpenIndex, setFaqOpenIndex] = React.useState<number | null>(null);

    const faqItems = [
        {
            q: "What is a digital ledger?",
            a: "A digital ledger is a software-based record-keeping system used to track financial transactions, credits, and debits. Unlike traditional paper-based account books, a digital ledger like LedgerManager automates balance calculations, reduces human mathematical errors, secures financial records with local encryption, and enables real-time backups and statement generation."
        },
        {
            q: "How does a khata book app work?",
            a: "A khata book app digitizes manual credit books (bahi khata). You add customer profiles (borrowers or lenders), log transactions under their names (credits given or payments received), and the app automatically computes net balances. LedgerManager works as an offline-first digital khata book, saving your ledger entries locally in the browser storage and backing them up to secure cloud servers when internet is active."
        },
        {
            q: "Is LedgerManager free?",
            a: "Yes, LedgerManager's core digital ledger features are completely free to use. You can manage unlimited customer directories, record daily business payments, use the customer credit manager offline, and export PDF account statements without any subscription fees or charges."
        },
        {
            q: "Can I use LedgerManager offline?",
            a: "Absolutely. LedgerManager is designed with an offline-first architecture. All account details, customer books, and transaction records are saved directly onto your device's local database. You can add, modify, or view credit logs completely offline, and they will automatically sync to the cloud when you connect to the internet."
        },
        {
            q: "Is my data secure?",
            a: "Security is our top priority. LedgerManager uses secure client-side storage sandboxing and biometric access locking (fingerprint or face ID) on supported devices. Cloud backups are transmitted using secure HTTPS tunnels with row-level security (RLS) policies, preventing unauthorized third parties from viewing your business accounts."
        },
        {
            q: "Can I export PDF statements?",
            a: "Yes, you can generate professional PDF statements for any customer credit profile or your entire business ledger in one click. These generated statements show a detailed transaction history with running balances and can be shared instantly via WhatsApp, email, or printed out."
        },
        {
            q: "Does LedgerManager work on Android?",
            a: "Yes, LedgerManager works seamlessly on all Android smartphones and tablets. It is optimized for mobile touch inputs, featuring rapid-entry screens and list filters designed for quick on-the-go billing log entries."
        },
        {
            q: "Can I install LedgerManager as an app?",
            a: "Yes! LedgerManager is built as a Progressive Web App (PWA). You can install it directly from your browser (Chrome, Safari, Edge) on your Android device, iPhone, iPad, or desktop computer. Once installed, it behaves like a native application with standalone layouts and offline startup support."
        }
    ];

    return (
        <div className={styles.container}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify([
                        {
                            "@context": "https://schema.org",
                            "@type": "SoftwareApplication",
                            "name": "LedgerManager",
                            "operatingSystem": "Windows, macOS, Linux, Android, iOS",
                            "applicationCategory": "BusinessApplication",
                            "offers": {
                                "@type": "Offer",
                                "price": "0",
                                "priceCurrency": "USD"
                            },
                            "url": "https://ledgermanager.vercel.app",
                            "screenshot": [
                                "https://ledgermanager.vercel.app/showcase/dashboard.jpg",
                                "https://ledgermanager.vercel.app/showcase/customers.jpg",
                                "https://ledgermanager.vercel.app/showcase/transactions.jpg",
                                "https://ledgermanager.vercel.app/showcase/analytics.jpg"
                            ],
                            "creator": {
                                "@type": "Organization",
                                "name": "LedgerManager",
                                "url": "https://ledgermanager.vercel.app"
                            }
                        },
                        {
                            "@context": "https://schema.org",
                            "@type": "Organization",
                            "name": "LedgerManager",
                            "url": "https://ledgermanager.vercel.app",
                            "logo": "https://ledgermanager.vercel.app/app_logo.jpeg",
                            "sameAs": [
                                "https://github.com/akashnair14/Ledger"
                            ]
                        },
                        {
                            "@context": "https://schema.org",
                            "@type": "WebSite",
                            "name": "LedgerManager",
                            "url": "https://ledgermanager.vercel.app",
                            "potentialAction": {
                                "@type": "SearchAction",
                                "target": "https://ledgermanager.vercel.app/docs?q={search_term_string}",
                                "query-input": "required name=search_term_string"
                            }
                        },
                        {
                            "@context": "https://schema.org",
                            "@type": "WebPage",
                            "@id": "https://ledgermanager.vercel.app/#webpage",
                            "url": "https://ledgermanager.vercel.app",
                            "name": "LedgerManager | Free Digital Ledger & Khata Book for Small Businesses",
                            "description": "Manage customers, payments, and business ledgers with LedgerManager. Offline-first digital khata book with cloud sync, PDF statements, analytics, and secure backups.",
                            "isPartOf": {
                                "@type": "WebSite",
                                "@id": "https://ledgermanager.vercel.app/#website"
                            },
                            "breadcrumb": {
                                "@id": "https://ledgermanager.vercel.app/#breadcrumb"
                            }
                        },
                        {
                            "@context": "https://schema.org",
                            "@type": "BreadcrumbList",
                            "@id": "https://ledgermanager.vercel.app/#breadcrumb",
                            "itemListElement": [
                                {
                                    "@type": "ListItem",
                                    "position": 1,
                                    "name": "Home",
                                    "item": "https://ledgermanager.vercel.app"
                                }
                            ]
                        },
                        {
                            "@context": "https://schema.org",
                            "@type": "FAQPage",
                            "mainEntity": [
                                {
                                    "@type": "Question",
                                    "name": "What is a digital ledger?",
                                    "acceptedAnswer": {
                                        "@type": "Answer",
                                        "text": "A digital ledger is a software-based record-keeping system used to track financial transactions, credits, and debits. Unlike traditional paper-based account books, a digital ledger like LedgerManager automates balance calculations, reduces human mathematical errors, secures financial records with local encryption, and enables real-time backups and statement generation."
                                    }
                                },
                                {
                                    "@type": "Question",
                                    "name": "How does a khata book app work?",
                                    "acceptedAnswer": {
                                        "@type": "Answer",
                                        "text": "A khata book app digitizes manual credit books (bahi khata). You add customer profiles (borrowers or lenders), log transactions under their names (credits given or payments received), and the app automatically computes net balances. LedgerManager works as an offline-first digital khata book, saving your ledger entries locally in the browser storage and backing them up to secure cloud servers when internet is active."
                                    }
                                },
                                {
                                    "@type": "Question",
                                    "name": "Is LedgerManager free?",
                                    "acceptedAnswer": {
                                        "@type": "Answer",
                                        "text": "Yes, LedgerManager's core digital ledger features are completely free to use. You can manage unlimited customer directories, record daily business payments, use the customer credit manager offline, and export PDF account statements without any subscription fees or charges."
                                    }
                                },
                                {
                                    "@type": "Question",
                                    "name": "Can I use LedgerManager offline?",
                                    "acceptedAnswer": {
                                        "@type": "Answer",
                                        "text": "Absolutely. LedgerManager is designed with an offline-first architecture. All account details, customer books, and transaction records are saved directly onto your device's local database. You can add, modify, or view credit logs completely offline, and they will automatically sync to the cloud when you connect to the internet."
                                    }
                                },
                                {
                                    "@type": "Question",
                                    "name": "Is my data secure?",
                                    "acceptedAnswer": {
                                        "@type": "Answer",
                                        "text": "Security is our top priority. LedgerManager uses secure client-side storage sandboxing and biometric access locking (fingerprint or face ID) on supported devices. Cloud backups are transmitted using secure HTTPS tunnels with row-level security (RLS) policies, preventing unauthorized third parties from viewing your business accounts."
                                    }
                                },
                                {
                                    "@type": "Question",
                                    "name": "Can I export PDF statements?",
                                    "acceptedAnswer": {
                                        "@type": "Answer",
                                        "text": "Yes, you can generate professional PDF statements for any customer credit profile or your entire business ledger in one click. These generated statements show a detailed transaction history with running balances and can be shared instantly via WhatsApp, email, or printed out."
                                    }
                                },
                                {
                                    "@type": "Question",
                                    "name": "Does LedgerManager work on Android?",
                                    "acceptedAnswer": {
                                        "@type": "Answer",
                                        "text": "Yes, LedgerManager works seamlessly on all Android smartphones and tablets. It is optimized for mobile touch inputs, featuring rapid-entry screens and list filters designed for quick on-the-go billing log entries."
                                    }
                                },
                                {
                                    "@type": "Question",
                                    "name": "Can I install LedgerManager as an app?",
                                    "acceptedAnswer": {
                                        "@type": "Answer",
                                        "text": "Yes! LedgerManager is built as a Progressive Web App (PWA). You can install it directly from your browser (Chrome, Safari, Edge) on your Android device, iPhone, iPad, or desktop computer. Once installed, it behaves like a native application with standalone layouts and offline startup support."
                                    }
                                }
                            ]
                        }
                    ])
                }}
            />
            {/* Navigation Header */}
            <nav className={styles.navbar}>
                <div className={styles.navContent}>
                    <div className={styles.logo}>
                        <div className={styles.logoIcon}>L</div>
                        <span>LedgerManager</span>
                    </div>

                    {/* Desktop Links */}
                    <div className={styles.navLinks}>
                        <Link href="/user-guide" className={styles.loginLink} title="Explore the LedgerManager User Guide">User Guide</Link>
                        <Link href="/login" className={styles.loginLink} title="Sign in to your secure Ledger Dashboard">Log In</Link>
                        <Link href="/login" className={styles.signupBtn} title="Register a free Digital Ledger account">Get Started Now</Link>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        className={styles.mobileMenuBtn}
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label="Toggle menu"
                    >
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                {/* Mobile Menu Dropdown */}
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={styles.mobileMenu}
                    >
                        <Link href="/user-guide" className={styles.mobileLink} title="Explore the LedgerManager User Guide">User Guide</Link>
                        <Link href="/login" className={styles.mobileLink} title="Sign in to your secure Ledger Dashboard">Log In</Link>
                        <Link href="/login" className={styles.mobileSignupBtn} title="Register a free Digital Ledger account">Get Started Now</Link>
                    </motion.div>
                )}
            </nav>

            {/* Hero Section */}
            <section className={styles.hero}>
                <div className={styles.gridBackground} />
                <div className={styles.auroraBackground} />
                <div className={styles.heroContent}>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className={styles.badge}
                    >
                        <Lock size={14} style={{ marginRight: '6px' }} /> Offline Ledger App & Digital Khata Book
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                    >
                        Never Lose Track of <br /> <span>Business Payments & Customer Credits Again</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        LedgerManager is a secure, offline-first Digital Ledger App and modern Khata Book built specifically for small businesses, shop owners, retail stores, and freelancers. It solves the pain of manual calculations, lost paper registers, and delayed credit collections. Track customer credits, record business payments, and generate PDF statements instantly on your local device—with or without internet.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className={styles.heroActions}
                    >
                        <Link href="/login" className={styles.primaryBtn}>
                            Start Using Now <ArrowRight size={18} />
                        </Link>
                        <Link href="#demo" className={styles.secondaryBtn}>
                            See How It Works
                        </Link>
                    </motion.div>

                    {/* Trust Indicators */}
                    <div className={styles.trustBadges}>
                        <div className={styles.badgeItem}>
                            <Smartphone size={16} />
                            <span>Offline First</span>
                        </div>
                        <span className={styles.badgeSeparator}>•</span>
                        <div className={styles.badgeItem}>
                            <Zap size={16} />
                            <span>Install PWA</span>
                        </div>
                        <span className={styles.badgeSeparator}>•</span>
                        <div className={styles.badgeItem}>
                            <Database size={16} />
                            <span>Cloud Backup</span>
                        </div>
                        <span className={styles.badgeSeparator}>•</span>
                        <div className={styles.badgeItem}>
                            <FileText size={16} />
                            <span>PDF Exports</span>
                        </div>
                    </div>
                </div>

                {/* Dashboard Mockup */}
                <div className={styles.mockupContainer}>
                    <DashboardMockup />
                </div>
            </section>

            {/* Quick Stats Section */}
            <section className={styles.stats}>
                <div className={styles.statItem}>
                    <div className={styles.statNumber}>Offline</div>
                    <p>Complete Offline Ledger App</p>
                </div>
                <div className={styles.statItem}>
                    <div className={styles.statNumber}>Automatic</div>
                    <p>Customer Credit Manager</p>
                </div>
                <div className={styles.statItem}>
                    <div className={styles.statNumber}>Encrypted</div>
                    <p>Secure Payment Tracker & Sync</p>
                </div>
                <div className={styles.statItem}>
                    <div className={styles.statNumber}>No Cost</div>
                    <p>Free Online Ledger & Khata Book</p>
                </div>
            </section>

            {/* Features Showcase */}
            <section id="features" className={styles.featuresSection}>
                <div className={styles.sectionHeader}>
                    <h2>Complete Business <span>Ledger Functions</span></h2>
                    <p>Everything you need for Small Business Accounting. Track customer credit profiles, business payments, and daily cash transactions without paper notebooks.</p>
                </div>

                <div className={styles.featuresList}>
                    {/* Feature 1: Customer Management */}
                    <div className={styles.featureShowcase}>
                        <div className={styles.featureVisual}>
                            <div className={styles.miniMockupCard}>
                                <div className={styles.mockupSearch}>
                                    <span className={styles.searchIcon}>🔍</span>
                                    <div className={styles.fakeSearchInput}>Search borrowers...</div>
                                </div>
                                <div className={styles.fakeUserRow}>
                                    <div className={styles.fakeAvatar}>AS</div>
                                    <div className={styles.fakeUserInfo}>
                                        <p className={styles.fakeName}>Arjun Sharma</p>
                                        <span>Last entry: 2 mins ago</span>
                                    </div>
                                    <span className={styles.fakeAmtPositive}>₹8,500</span>
                                </div>
                                <div className={styles.fakeUserRow}>
                                    <div className={styles.fakeAvatar}>PP</div>
                                    <div className={styles.fakeUserInfo}>
                                        <p className={styles.fakeName}>Priya Patel</p>
                                        <span>Last entry: 1 day ago</span>
                                    </div>
                                    <span className={styles.fakeAmtPositive}>₹12,200</span>
                                </div>
                                <div className={styles.fakeUserRow}>
                                    <div className={styles.fakeAvatar}>RM</div>
                                    <div className={styles.fakeUserInfo}>
                                        <p className={styles.fakeName}>Rajesh Mehta</p>
                                        <span>Last entry: 3 days ago</span>
                                    </div>
                                    <span className={styles.fakeAmtNegative}>₹4,500</span>
                                </div>
                            </div>
                        </div>
                        <div className={styles.featureText}>
                            <div className={styles.featureHeaderInline}>
                                <div className={styles.inlineIconWrapper}><Users size={20} /></div>
                                <h3>Customer Credit Manager</h3>
                            </div>
                            <p className={styles.featureDesc}>
                                Keep customer credit records in a searchable Customer Ledger. Tap actions to update credit book balances instantly without manual sorting.
                            </p>
                            <ul className={styles.featureBullets}>
                                <li><CheckCircle2 size={16} /> Search and filter customer listings</li>
                                <li><CheckCircle2 size={16} /> Track transaction histories per profile</li>
                                <li><CheckCircle2 size={16} /> Calculate net outstanding balances automatically</li>
                            </ul>
                        </div>
                    </div>

                    {/* Feature 2: Real-time Records & Offline Sync */}
                    <div className={`${styles.featureShowcase} ${styles.reverse}`}>
                        <div className={styles.featureVisual}>
                            <div className={styles.miniMockupCard}>
                                <div className={styles.syncContainer}>
                                    <div className={styles.syncDevice}>
                                        <Smartphone size={32} />
                                        <span>Offline Cache</span>
                                    </div>
                                    <div className={styles.syncLines}>
                                        <span className={styles.syncDotAnim} />
                                    </div>
                                    <div className={styles.syncCloud}>
                                        <Database size={32} />
                                        <span>Cloud Backup</span>
                                    </div>
                                </div>
                                <div className={styles.syncStatusText}>
                                    <p>All data synchronized successfully</p>
                                </div>
                            </div>
                        </div>
                        <div className={styles.featureText}>
                            <div className={styles.featureHeaderInline}>
                                <div className={styles.inlineIconWrapper}><Zap size={20} /></div>
                                <h3>Offline Ledger App & Cloud Sync</h3>
                            </div>
                            <p className={styles.featureDesc}>
                                Record entries using our Offline Ledger App. Balances save to local device files and sync with our secure Online Ledger database once you are connected.
                            </p>
                            <ul className={styles.featureBullets}>
                                <li><CheckCircle2 size={16} /> Log entries without a network connection</li>
                                <li><CheckCircle2 size={16} /> Store data cache in local device files</li>
                                <li><CheckCircle2 size={16} /> Automatic background cloud sync when online</li>
                            </ul>
                        </div>
                    </div>

                    {/* Feature 3: Business Analytics & PDF Reports */}
                    <div className={styles.featureShowcase}>
                        <div className={styles.featureVisual}>
                            <div className={styles.miniMockupCard}>
                                <div className={styles.chartMockupHeader}>
                                    <p>Cash Flow Report</p>
                                    <div className={styles.pdfBadge}>PDF Export Ready</div>
                                </div>
                                <svg className={styles.miniChartSvg} viewBox="0 0 300 80">
                                    <path d="M 0 60 Q 40 20 80 40 T 160 10 T 240 30 T 300 5 L 300 80 L 0 80 Z" fill="rgba(240, 92, 56, 0.15)" />
                                    <path d="M 0 60 Q 40 20 80 40 T 160 10 T 240 30 T 300 5" fill="none" stroke="var(--primary)" strokeWidth="2.5" />
                                </svg>
                                <div className={styles.mockupReportGrid}>
                                    <div>
                                        <span>Growth</span>
                                        <p className={styles.textGreen}>+24%</p>
                                    </div>
                                    <div>
                                        <span>Receivables</span>
                                        <p>₹20,700</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className={styles.featureText}>
                            <div className={styles.featureHeaderInline}>
                                <div className={styles.inlineIconWrapper}><BarChart3 size={20} /></div>
                                <h3>Payment Tracker & Statement Exports</h3>
                            </div>
                            <p className={styles.featureDesc}>
                                View monthly cash collections and balance trends. Export PDF customer ledger statements and track overall business payments in one view.
                            </p>
                            <ul className={styles.featureBullets}>
                                <li><CheckCircle2 size={16} /> Generate PDF statements instantly</li>
                                <li><CheckCircle2 size={16} /> Monitor monthly collections and trend lines</li>
                                <li><CheckCircle2 size={16} /> Track payables and receivables in one view</li>
                            </ul>
                        </div>
                    </div>

                    {/* Feature 4: Enterprise Security */}
                    <div className={`${styles.featureShowcase} ${styles.reverse}`}>
                        <div className={styles.featureVisual}>
                            <div className={styles.miniMockupCard}>
                                <div className={styles.securityWrapper}>
                                    <div className={styles.securityIcon}>🔒</div>
                                    <h4>Access Protection</h4>
                                    <p>AES-256 Local Encryption</p>
                                    <div className={styles.securityShieldRow}>
                                        <span>● Verified Secure</span>
                                        <span>● Automatic Locking</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className={styles.featureText}>
                            <div className={styles.featureHeaderInline}>
                                <div className={styles.inlineIconWrapper}><ShieldCheck size={20} /></div>
                                <h3>Biometric Locking & Digital Khata Security</h3>
                            </div>
                            <p className={styles.featureDesc}>
                                Protect your digital khata ledger from unauthorized device access. Lock application access on your device using fingerprint or face ID keys.
                            </p>
                            <ul className={styles.featureBullets}>
                                <li><CheckCircle2 size={16} /> Encrypt local storage databases</li>
                                <li><CheckCircle2 size={16} /> Sync transactions over secure cloud backends</li>
                                <li><CheckCircle2 size={16} /> Activate fingerprint or face ID app locks</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Interactive Demo Section */}
            <section id="demo" className={styles.playgroundSection}>
                <div className={styles.sectionHeader}>
                    <h2>Test the <span>Ledger Interface</span></h2>
                    <p>Simulate ledger transactions. Select an amount and test the action buttons to see how the balance updates.</p>
                </div>
                <div className={styles.playgroundContainer}>
                    <MiniLedgerDemo />
                </div>
            </section>

            {/* Product Showcase Section */}
            <section className={styles.showcaseSection}>
                <div className={styles.sectionHeader}>
                    <h2>Interface <span>Tour</span></h2>
                    <p>Take a closer look at the actual interface designed for rapid daily operations.</p>
                </div>

                {/* Desktop Grid Layout (2x2) */}
                <div className={styles.showcaseGrid}>
                    {showcaseSlides.map((slide, idx) => (
                        <div key={idx} className={styles.showcaseCard}>
                            <div className={styles.showcaseImgWrapper}>
                                <Image 
                                    src={slide.img} 
                                    alt={slide.alt} 
                                    title={slide.imgTitle} 
                                    width={500} 
                                    height={320} 
                                    className={styles.showcaseImg} 
                                    loading="lazy" 
                                />
                            </div>
                            <div className={styles.showcaseInfo}>
                                <h3>{slide.title}</h3>
                                <p>{slide.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Mobile Carousel Layout */}
                <div className={styles.showcaseCarousel}>
                    <div className={styles.carouselActiveCard}>
                        <div className={styles.showcaseImgWrapper}>
                            <Image 
                                src={showcaseSlides[showcaseIndex].img} 
                                alt={showcaseSlides[showcaseIndex].alt} 
                                title={showcaseSlides[showcaseIndex].imgTitle} 
                                width={500} 
                                height={320} 
                                className={styles.showcaseImg} 
                                loading="lazy" 
                            />
                        </div>
                        <div className={styles.showcaseInfo}>
                            <h3>{showcaseSlides[showcaseIndex].title}</h3>
                            <p>{showcaseSlides[showcaseIndex].desc}</p>
                        </div>
                    </div>
                    <div className={styles.carouselControls}>
                        <button 
                            className={styles.carouselArrow}
                            onClick={() => setShowcaseIndex((prev) => (prev === 0 ? showcaseSlides.length - 1 : prev - 1))}
                            aria-label="Previous slide"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className={styles.carouselDots}>
                            {showcaseSlides.map((_, idx) => (
                                <button 
                                    key={idx}
                                    className={`${styles.carouselDot} ${showcaseIndex === idx ? styles.activeDot : ''}`}
                                    onClick={() => setShowcaseIndex(idx)}
                                    aria-label={`Go to slide ${idx + 1}`}
                                />
                            ))}
                        </div>
                        <button 
                            className={styles.carouselArrow}
                            onClick={() => setShowcaseIndex((prev) => (prev === showcaseSlides.length - 1 ? 0 : prev + 1))}
                            aria-label="Next slide"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </section>

            {/* Analytics Preview Section */}
            <section className={styles.analyticsPreviewSection}>
                <div className={styles.sectionHeader}>
                    <h2>Business <span>Performance Metrics</span></h2>
                    <p>Track cash flow trends and credit collection cycles. Monitor collections and outstanding balances with clear metrics.</p>
                </div>
                <div className={styles.analyticsPreviewContainer}>
                    <div className={styles.analyticsMainCard}>
                        {/* Upper Stats Row */}
                        <div className={styles.analyticsStatsRow}>
                            <div className={styles.analyticStat}>
                                <span className={styles.analyticLabel}>Monthly Collections</span>
                                <div className={`${styles.statValue} ${styles.textGreen}`}>₹1,45,200</div>
                                <span className={styles.analyticSub}>+18.2% vs last month</span>
                            </div>
                            <div className={styles.analyticStat}>
                                <span className={styles.analyticLabel}>Outstanding Balance</span>
                                <div className={styles.statValue}>₹24,800</div>
                                <span className={styles.analyticSub}>Active Credit Ledger</span>
                            </div>
                            <div className={styles.analyticStat}>
                                <span className={styles.analyticLabel}>Customer Growth</span>
                                <div className={`${styles.statValue} ${styles.textPrimary}`}>+14 New</div>
                                <span className={styles.analyticSub}>This Billing Cycle</span>
                            </div>
                        </div>

                        {/* Chart Area */}
                        <div className={styles.analyticsChartArea}>
                            <div className={styles.chartHeader}>
                                <h3>Inbound Cash Flow (Got vs Gave)</h3>
                                <div className={styles.chartLegend}>
                                    <span className={styles.legendGot}><span /> Got</span>
                                    <span className={styles.legendGave}><span /> Gave</span>
                                </div>
                            </div>
                            <div className={styles.chartSvgWrapper}>
                                <svg className={styles.previewChartSvg} viewBox="0 0 500 150">
                                    <defs>
                                        <linearGradient id="chartGotGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="var(--success)" stopOpacity="0.2" />
                                            <stop offset="100%" stopColor="var(--success)" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                    {/* Grid Lines */}
                                    <line x1="0" y1="37" x2="500" y2="37" stroke="var(--border)" strokeOpacity="0.3" strokeDasharray="3 3" />
                                    <line x1="0" y1="75" x2="500" y2="75" stroke="var(--border)" strokeOpacity="0.3" strokeDasharray="3 3" />
                                    <line x1="0" y1="112" x2="500" y2="112" stroke="var(--border)" strokeOpacity="0.3" strokeDasharray="3 3" />
                                    
                                    {/* Got Curve */}
                                    <path d="M 0 120 Q 75 50 150 70 T 300 30 T 450 40 T 500 20 L 500 150 L 0 150 Z" fill="url(#chartGotGrad)" />
                                    <path d="M 0 120 Q 75 50 150 70 T 300 30 T 450 40 T 500 20" fill="none" stroke="var(--success)" strokeWidth="3" />
                                    
                                    {/* Gave Curve */}
                                    <path d="M 0 140 Q 75 100 150 120 T 300 90 T 450 110 T 500 95" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="5 5" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Use Cases Section */}
            <section className={styles.useCasesSection}>
                <div className={styles.sectionHeader}>
                    <h2>Designed <span>For</span></h2>
                    <p>Designed to fit a wide range of business models, services, and self-employed creators.</p>
                </div>
                <div className={styles.useCasesGrid}>
                    <div className={styles.useCaseCard}>
                        <ShoppingBag size={24} className={styles.useCaseIcon} />
                        <h3>Grocery Stores</h3>
                        <p>Track daily provisions and tab balances.</p>
                    </div>
                    <div className={styles.useCaseCard}>
                        <Store size={24} className={styles.useCaseIcon} />
                        <h3>Retail Shops</h3>
                        <p>Simplify customer billing accounts and supplier payables.</p>
                    </div>
                    <div className={styles.useCaseCard}>
                        <PlusCircle size={24} className={styles.useCaseIcon} />
                        <h3>Medical Stores</h3>
                        <p>Log medical inventory credits and invoices secure offline.</p>
                    </div>
                    <div className={styles.useCaseCard}>
                        <Truck size={24} className={styles.useCaseIcon} />
                        <h3>Wholesalers</h3>
                        <p>Manage large bulk orders, deposits, and accounts easily.</p>
                    </div>
                    <div className={styles.useCaseCard}>
                        <Laptop size={24} className={styles.useCaseIcon} />
                        <h3>Freelancers</h3>
                        <p>Track project retainers and pending client payments.</p>
                    </div>
                    <div className={styles.useCaseCard}>
                        <Wrench size={24} className={styles.useCaseIcon} />
                        <h3>Service Businesses</h3>
                        <p>Track service logs, mechanics, and maintenance dues.</p>
                    </div>
                    <div className={styles.useCaseCard}>
                        <Home size={24} className={styles.useCaseIcon} />
                        <h3>Home Businesses</h3>
                        <p>Organize boutique sales, baking pre-orders, and cash credits.</p>
                    </div>
                </div>
            </section>

            {/* Dedicated Landing Sections (SEO Deep-Dive) */}
            <section className={styles.useCasesSection} id="seo-deepdive">
                <div className={styles.sectionHeader}>
                    <h2>Comprehensive <span>Ledger Capabilities</span></h2>
                    <p>Learn how our digital tools solve accounting errors, simplify invoicing, and secure your credit registers.</p>
                </div>
                <div className={styles.useCasesGrid}>
                    <div className={styles.useCaseCard}>
                        <h3>Digital Khata Book</h3>
                        <p>Digitize your traditional paper-based bahi khata notebooks. A modern digital khata book guarantees error-free outstanding calculations, eliminates lost records, and speeds up credit recovery with ready-to-share PDF statements.</p>
                    </div>
                    <div className={styles.useCaseCard}>
                        <h3>Offline Ledger App</h3>
                        <p>Our secure offline ledger app runs a sandboxed local SQL database inside your web browser. You can record transactions, search customer listings, and edit books without an internet connection. Changes sync to cloud backups when you reconnect.</p>
                    </div>
                    <div className={styles.useCaseCard}>
                        <h3>Customer Payment Tracker</h3>
                        <p>Track cash entries, calculate net receivables vs payables, and check customer balance sheets instantly. With auto-calculated interest-free credit and debit logs, managing customer profiles takes seconds.</p>
                    </div>
                    <div className={styles.useCaseCard}>
                        <h3>Small Business Accounting</h3>
                        <p>Designed specifically for self-employed creators, shopkeepers, wholesalers, and retail merchants. LedgerManager offers a free, high-performance ledger environment that simplifies tax preparation, audits, and daily cash flow management.</p>
                    </div>
                </div>
            </section>

            {/* PWA Section */}
            <section className={styles.pwaSection}>
                <div className={styles.pwaContent}>
                    <div className={styles.pwaText}>
                        <h2>Install Standalone <span>Application</span></h2>
                        <p>Add LedgerManager to your home screen to launch it like a desktop or mobile application. Access your financial records directly from your home screen.</p>
                        
                        {/* Illustrated Feature Cards */}
                        <div className={styles.pwaCardsGrid}>
                            <div className={styles.pwaFeatureCard}>
                                <div className={styles.pwaFeatureHeader}>
                                    <Zap size={18} className={styles.textPrimary} />
                                    <h3>Native Performance</h3>
                                </div>
                                <p>Launches in a standalone interface directly from your device home screen.</p>
                            </div>
                            <div className={styles.pwaFeatureCard}>
                                <div className={styles.pwaFeatureHeader}>
                                    <Database size={18} className={styles.textPrimary} />
                                    <h3>Complete Offline Mode</h3>
                                </div>
                                <p>Access cash logs and customer profiles without a network connection.</p>
                            </div>
                            <div className={styles.pwaFeatureCard}>
                                <div className={styles.pwaFeatureHeader}>
                                    <CheckCircle2 size={18} className={styles.textPrimary} />
                                    <h3>Push Notifications</h3>
                                </div>
                                <p>Receive reminders for outstanding credit collection schedules.</p>
                            </div>
                        </div>

                        {canInstall ? (
                            <button className={styles.pwaBtn} onClick={promptInstall}>
                                <Smartphone size={20} /> Install App
                            </button>
                        ) : (
                            <Link href="/login" className={styles.pwaBtn}>
                                <Smartphone size={20} /> Open App
                            </Link>
                        )}
                    </div>
                    
                    {/* Multi-Device Illustration */}
                    <div className={styles.pwaVisualMulti}>
                        <div className={styles.desktopFrameMock}>
                            <div className={styles.desktopTopBar}><span /><span /><span /></div>
                            <div className={styles.desktopMockContent}>
                                <span className={styles.desktopInnerAppIcon}>L</span>
                                <p>LedgerManager Desktop</p>
                            </div>
                        </div>
                        <div className={styles.tabletFrameMock}>
                            <div className={styles.tabletMockContent}>
                                <p>Tablet View</p>
                            </div>
                        </div>
                        <div className={styles.phoneFrameMock}>
                            <div className={styles.phoneMockContent}>
                                <p>Mobile App</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Security & Trust Section */}
            <section className={styles.securitySection}>
                <div className={styles.sectionHeader}>
                    <h2>Data Privacy & <span>Integrity</span></h2>
                    <p>Your financial logs are secured with local encryption. Access is restricted using secure credentials and biometric device locks.</p>
                </div>
                <div className={styles.securityGrid}>
                    <div className={styles.securityCard}>
                        <div className={styles.securityCardHeader}>
                            <div className={styles.securityIconSmall}>💾</div>
                            <h3>Offline-First Storage</h3>
                        </div>
                        <p>All books are stored locally inside your device's secure sandboxed database. You retain 100% data ownership even without internet connectivity.</p>
                    </div>
                    <div className={styles.securityCard}>
                        <div className={styles.securityCardHeader}>
                            <div className={styles.securityIconSmall}>🔗</div>
                            <h3>Encrypted Cloud Sync</h3>
                        </div>
                        <p>When online, data transmits through row-level encrypted channels. All transactions are securely synchronized with redundant cloud vaults.</p>
                    </div>
                    <div className={styles.securityCard}>
                        <div className={styles.securityCardHeader}>
                            <div className={styles.securityIconSmall}>🔐</div>
                            <h3>Data Encryption</h3>
                        </div>
                        <p>Local data cache and session values are protected with client-side hashing, shielding sensitive credit profiles from local extraction.</p>
                    </div>
                    <div className={styles.securityCard}>
                        <div className={styles.securityCardHeader}>
                            <div className={styles.securityIconSmall}>🛡️</div>
                            <h3>Device Level Access</h3>
                        </div>
                        <p>Activate biometric locking (fingerprint or face unlock) to prevent local device access to your business accounts and customer details.</p>
                    </div>
                    <div className={styles.securityCard}>
                        <div className={styles.securityCardHeader}>
                            <div className={styles.securityIconSmall}>☁️</div>
                            <h3>Automated Backups</h3>
                        </div>
                        <p>Continuous cloud journaling ensures your ledger is fully backed up. Reconnect online, and your ledger syncs back seamlessly in seconds.</p>
                    </div>
                </div>
            </section>

            {/* Rich Content SEO Section (Common Search Intents) */}
            <section className={styles.useCasesSection} id="rich-content-seo">
                <div className={styles.sectionHeader}>
                    <h2>Why Switch to a <span>Digital Ledger App?</span></h2>
                    <p>Factual comparisons on manual paper registers versus automated offline-first accounting software solutions.</p>
                </div>
                <div className={styles.useCasesGrid}>
                    <div className={styles.useCaseCard}>
                        <h3>Why Switch From a Paper Ledger?</h3>
                        <p>Traditional paper notebooks are vulnerable to physical damage, theft, and loss. Additionally, manually calculating outstanding balances, supplier credits, and debit limits is time-consuming and prone to human errors. Switching to a digital ledger automates your bookkeeping, ensuring your financial logs are perfectly accurate, searchable, and instantly back-up protected.</p>
                    </div>
                    <div className={styles.useCaseCard}>
                        <h3>Benefits of Digital Khata Books</h3>
                        <p>Digital khata book apps provide automated calculations, professional PDF report generation, and systematic customer summaries. By utilizing a digital bahi khata, shop owners and retail merchants can retrieve billing history in seconds and recover outstanding credits faster using digital payment shares.</p>
                    </div>
                    <div className={styles.useCaseCard}>
                        <h3>Offline vs Cloud Ledger Apps</h3>
                        <p>While cloud-only accounting platforms fail during network outages, and traditional local software lacks automatic backups, LedgerManager provides the best of both. Our offline-first ledger architecture stores your transaction records locally on your device, while syncing safely to secure cloud vaults in the background whenever internet is available.</p>
                    </div>
                    <div className={styles.useCaseCard}>
                        <h3>How LedgerManager Protects Your Data</h3>
                        <p>Your privacy is guaranteed. All customer profiles, payment transaction logs, and business ledgers are protected using client-side encryption. We restrict local device access through biometric locking (fingerprint or face recognition unlock), and transmit cloud backups over encrypted row-level security (RLS) tunnels.</p>
                    </div>
                </div>
            </section>

            {/* FAQ Accordion Section */}
            <section id="faq" className={styles.faqSection}>
                <div className={styles.sectionHeader}>
                    <h2>Frequently Asked <span>Questions</span></h2>
                    <p>Find detailed explanations on how LedgerManager tracks transactions, secures files, and syncs data.</p>
                </div>
                <div className={styles.faqAccordionContainer}>
                    {faqItems.map((item, idx) => {
                        const isOpen = faqOpenIndex === idx;
                        return (
                            <div 
                                key={idx} 
                                className={`${styles.faqAccordionItem} ${isOpen ? styles.faqOpen : ''}`}
                            >
                                <button 
                                    className={styles.faqHeader}
                                    onClick={() => setFaqOpenIndex(isOpen ? null : idx)}
                                >
                                    <span>{item.q}</span>
                                    <span className={styles.faqArrow}>{isOpen ? '−' : '+'}</span>
                                </button>
                                {isOpen && (
                                    <div className={styles.faqBody}>
                                        <p>{item.a}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* CTA Section */}
            <section className={styles.cta}>
                <div className={styles.ctaBlur} />
                <div className={styles.ctaContent}>
                    <h2>Set Up Your Digital Ledger</h2>
                    <p>Track credit balances, back up transactions, and export statements offline or online.</p>
                    
                    {/* Dashboard wireframe illustration peek */}
                    <div className={styles.ctaDashboardPeek}>
                        <div className={styles.ctaPeekHeader}><span /><span /><span /></div>
                        <div className={styles.ctaPeekBody}>
                            <div className={styles.ctaPeekLine} />
                            <div className={styles.ctaPeekLine} />
                        </div>
                    </div>

                    <div className={styles.ctaActions}>
                        <Link href="/login" className={styles.ctaPrimary}>
                            Start Your Account <ArrowRight size={20} />
                        </Link>
                        <Link href="/docs" className={styles.ctaSecondary}>
                            Explore Guides
                        </Link>
                    </div>
                    <p className={styles.ctaNoCredit}>No credit card required • Secure encryption • Premium Design</p>
                </div>
            </section>

            {/* Footer */}
            <footer className={styles.footer}>
                <div className={styles.footerGrid}>
                    <div className={styles.footerColumn}>
                        <h3>Product</h3>
                        <Link href="/features" title="View Business Ledger Features">Features</Link>
                        <Link href="/user-guide" title="Read the Customer Credit Manager User Guide">User Guide</Link>
                    </div>
                    <div className={styles.footerColumn}>
                        <h3>Company</h3>
                        <Link href="/pricing" title="Free Online Ledger Pricing Details">Pricing</Link>
                        <Link href="/contact" title="Get in touch for Small Business Accounting support">Contact</Link>
                    </div>
                    <div className={styles.footerColumn}>
                        <h3>Legal</h3>
                        <Link href="/docs" title="Read our privacy protection guidelines">Privacy Policy</Link>
                        <Link href="/docs" title="Read our terms of service">Terms</Link>
                    </div>
                    <div className={styles.footerColumn}>
                        <h3>Resources</h3>
                        <Link href="/faq" title="Frequently Asked Questions about our Khata Book App">FAQ</Link>
                    </div>
                </div>
                <div className={styles.footerBottom}>
                    <p>© 2026 LedgerManager. All rights reserved.</p>
                    <div className={styles.socials}>
                        <Lock size={16} /> Secure Ledger Environment
                    </div>
                </div>
            </footer>

            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'WebApplication',
                        'name': 'LedgerManager',
                        'url': 'https://ledgermanager.vercel.app',
                        'description': 'Secure, offline-first personal ledger management. Track customer credit balances, payments, and business accounts.',
                        'applicationCategory': 'BusinessApplication',
                        'operatingSystem': 'All',
                        'features': 'Offline mode, Supabase cloud sync, mobile search integration, PDF ledger exports, biometric app lock security'
                    })
                }}
            />
        </div>
    );
}

const SparkleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2L12L9.6 9.6L12 2Z" fill="var(--primary)" />
    </svg>
);

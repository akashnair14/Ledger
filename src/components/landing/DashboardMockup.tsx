'use client';

import React from 'react';
import { 
    TrendingUp, 
    ArrowUpRight, 
    ArrowDownRight, 
    Users, 
    Activity,
    CheckCircle2
} from 'lucide-react';
import styles from './DashboardMockup.module.css';

export const DashboardMockup = () => {
    return (
        <div className={styles.dashboardContainer}>
            {/* Top Header Row of Mockup */}
            <div className={styles.header}>
                <div className={styles.headerTitle}>
                    <h3>Overview</h3>
                    <span className={styles.liveSyncBadge}>
                        <span className={styles.pulseDot} /> Real-time Sync
                    </span>
                </div>
                <div className={styles.headerMeta}>
                    <span className={styles.dateText}>Today, July 25</span>
                </div>
            </div>

            {/* Main Grid */}
            <div className={styles.grid}>
                {/* Left Side: Summary Cards & Chart */}
                <div className={styles.leftCol}>
                    {/* Summary Cards */}
                    <div className={styles.summaryCards}>
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <span className={styles.cardLabel}>Net Balance</span>
                                <Activity size={16} className={styles.iconNeutral} />
                            </div>
                            <h4 className={styles.netBalance}>₹24,800</h4>
                            <span className={styles.trendUp}>
                                <TrendingUp size={12} /> +12.4% this week
                            </span>
                        </div>
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <span className={styles.cardLabel}>You Will Get</span>
                                <ArrowUpRight size={16} className={styles.iconGreen} />
                            </div>
                            <h4 className={styles.positiveBalance}>₹38,200</h4>
                            <span className={styles.cardSubtext}>From 8 customers</span>
                        </div>
                        <div className={styles.card}>
                            <div className={styles.cardHeader}>
                                <span className={styles.cardLabel}>You Will Give</span>
                                <ArrowDownRight size={16} className={styles.iconRed} />
                            </div>
                            <h4 className={styles.negativeBalance}>₹13,400</h4>
                            <span className={styles.cardSubtext}>To 3 suppliers</span>
                        </div>
                    </div>

                    {/* SVG Analytics Chart */}
                    <div className={styles.chartCard}>
                        <div className={styles.chartHeader}>
                            <div>
                                <span className={styles.cardLabel}>Cash Flow Trends</span>
                                <h5 className={styles.chartTitle}>Daily Transactions</h5>
                            </div>
                            <div className={styles.legend}>
                                <span className={styles.legendReceived}><span /> Got</span>
                                <span className={styles.legendGiven}><span /> Gave</span>
                            </div>
                        </div>
                        <div className={styles.chartContainer}>
                            <svg className={styles.svgChart} viewBox="0 0 400 120">
                                <defs>
                                    <linearGradient id="gradientGreen" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--success)" stopOpacity="0.25" />
                                        <stop offset="100%" stopColor="var(--success)" stopOpacity="0" />
                                    </linearGradient>
                                    <linearGradient id="gradientRed" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
                                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                {/* Got (Received) Area and Line */}
                                <path 
                                    d="M 0 90 Q 50 40 100 50 T 200 20 T 300 30 T 400 10 L 400 120 L 0 120 Z" 
                                    fill="url(#gradientGreen)" 
                                />
                                <path 
                                    d="M 0 90 Q 50 40 100 50 T 200 20 T 300 30 T 400 10" 
                                    fill="none" 
                                    stroke="var(--success)" 
                                    strokeWidth="2.5" 
                                />

                                {/* Gave (Given) Area and Line */}
                                <path 
                                    d="M 0 110 Q 50 80 100 95 T 200 60 T 300 85 T 400 70 L 400 120 L 0 120 Z" 
                                    fill="url(#gradientRed)" 
                                />
                                <path 
                                    d="M 0 110 Q 50 80 100 95 T 200 60 T 300 85 T 400 70" 
                                    fill="none" 
                                    stroke="#ef4444" 
                                    strokeWidth="2" 
                                    strokeDasharray="4 4"
                                />

                                {/* Grid Helper Lines */}
                                <line x1="0" y1="30" x2="400" y2="30" stroke="var(--border)" strokeOpacity="0.3" strokeDasharray="2 2" />
                                <line x1="0" y1="70" x2="400" y2="70" stroke="var(--border)" strokeOpacity="0.3" strokeDasharray="2 2" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Right Side: Customers & Recent Transactions */}
                <div className={styles.rightCol}>
                    {/* Active Customers */}
                    <div className={styles.customersSection}>
                        <div className={styles.sectionTitle}>
                            <Users size={14} />
                            <span>Top Book Entries</span>
                        </div>
                        <div className={styles.list}>
                            <div className={styles.listItem}>
                                <div className={styles.customerAvatar}>AS</div>
                                <div className={styles.itemInfo}>
                                    <p className={styles.itemName}>Arjun Sharma</p>
                                    <span className={styles.itemMeta}>Updated 2h ago</span>
                                </div>
                                <span className={styles.amountGet}>₹8,500 <span className={styles.tagGet}>Get</span></span>
                            </div>
                            <div className={styles.listItem}>
                                <div className={styles.customerAvatar}>PP</div>
                                <div className={styles.itemInfo}>
                                    <p className={styles.itemName}>Priya Patel</p>
                                    <span className={styles.itemMeta}>Updated 1d ago</span>
                                </div>
                                <span className={styles.amountGet}>₹12,200 <span className={styles.tagGet}>Get</span></span>
                            </div>
                            <div className={styles.listItem}>
                                <div className={styles.customerAvatar}>RM</div>
                                <div className={styles.itemInfo}>
                                    <p className={styles.itemName}>Rajesh Mehta</p>
                                    <span className={styles.itemMeta}>Updated 3d ago</span>
                                </div>
                                <span className={styles.amountGive}>₹4,500 <span className={styles.tagGive}>Give</span></span>
                            </div>
                        </div>
                    </div>

                    {/* Recent Transactions list */}
                    <div className={styles.txSection}>
                        <div className={styles.sectionTitle}>
                            <CheckCircle2 size={14} />
                            <span>Recent Activity</span>
                        </div>
                        <div className={styles.list}>
                            <div className={styles.listItem}>
                                <div className={styles.txStatusDotGreen} />
                                <div className={styles.itemInfo}>
                                    <p className={styles.itemName}>Payment Received</p>
                                    <span className={styles.itemMeta}>From Arjun Sharma</span>
                                </div>
                                <span className={styles.amountGetText}>+ ₹3,000</span>
                            </div>
                            <div className={styles.listItem}>
                                <div className={styles.txStatusDotRed} />
                                <div className={styles.itemInfo}>
                                    <p className={styles.itemName}>Paid Supplier</p>
                                    <span className={styles.itemMeta}>To Rajesh Mehta</span>
                                </div>
                                <span className={styles.amountGiveText}>- ₹1,500</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

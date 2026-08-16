'use client';

import React from 'react';
import { Skeleton } from './Skeleton';
import dashboardStyles from '@/app/dashboard/page.module.css';
import detailStyles from '@/app/customers/[id]/CustomerDetail.module.css';
import insightsStyles from '@/components/dashboard/InsightsView.module.css';

export const DashboardSkeleton = () => {
    return (
        <div className={dashboardStyles.container}>
            {/* Header Skeleton */}
            <header className={dashboardStyles.header}>
                <div className={dashboardStyles.topBar}>
                    <div className={dashboardStyles.titleArea}>
                        <Skeleton width="180px" height="32px" style={{ marginBottom: '6px' }} />
                        <Skeleton width="280px" height="14px" />
                    </div>
                    <div className={dashboardStyles.headerActions}>
                        <Skeleton width="36px" height="36px" type="rect" style={{ borderRadius: 'var(--radius-sm)' }} />
                        <Skeleton width="36px" height="36px" type="rect" style={{ borderRadius: 'var(--radius-sm)' }} />
                        <Skeleton width="130px" height="36px" type="rect" style={{ borderRadius: 'var(--radius-sm)' }} />
                    </div>
                </div>
                <div className={dashboardStyles.tabs} style={{ display: 'flex', gap: '8px' }}>
                    <Skeleton width="120px" height="36px" type="rect" style={{ borderRadius: '20px' }} />
                    <Skeleton width="120px" height="36px" type="rect" style={{ borderRadius: '20px' }} />
                    <Skeleton width="90px" height="36px" type="rect" style={{ borderRadius: '20px' }} />
                </div>
            </header>

            {/* 6 KPI Cards Grid Skeleton */}
            <section className={dashboardStyles.statsGrid}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className={dashboardStyles.statCard}>
                        <div className={dashboardStyles.cardHeader}>
                            <Skeleton width="90px" height="12px" />
                            <Skeleton width="28px" height="28px" type="rect" style={{ borderRadius: '6px' }} />
                        </div>
                        <Skeleton width="110px" height="28px" style={{ margin: '4px 0' }} />
                        <Skeleton width="80px" height="10px" />
                    </div>
                ))}
            </section>

            {/* Toolbar Skeleton */}
            <section className={dashboardStyles.toolbar} style={{ display: 'flex', gap: '12px' }}>
                <Skeleton width="100%" height="42px" type="rect" style={{ borderRadius: 'var(--radius-sm)', flex: 1 }} />
                <Skeleton width="140px" height="42px" type="rect" style={{ borderRadius: 'var(--radius-sm)' }} />
                <Skeleton width="90px" height="42px" type="rect" style={{ borderRadius: 'var(--radius-sm)' }} />
            </section>

            {/* Quick Chips Skeleton */}
            <section className={dashboardStyles.chipsContainer} style={{ display: 'flex', gap: '8px' }}>
                {[60, 70, 50, 75, 110].map((w, i) => (
                    <Skeleton key={i} width={`${w}px`} height="28px" type="rect" style={{ borderRadius: '20px' }} />
                ))}
            </section>

            {/* Customer List Cards Skeleton */}
            <div className={dashboardStyles.list}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className={dashboardStyles.cardContainer}>
                        <div className={dashboardStyles.customerCard} style={{ pointerEvents: 'none' }}>
                            <div className={dashboardStyles.cardTop} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Skeleton width="40px" height="40px" type="circle" />
                                <div style={{ flex: 1 }}>
                                    <Skeleton width="140px" height="16px" style={{ marginBottom: '6px' }} />
                                    <Skeleton width="100px" height="12px" />
                                </div>
                            </div>
                            <div className={dashboardStyles.cardMid} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                                <Skeleton width="100px" height="22px" />
                                <Skeleton width="60px" height="20px" type="rect" style={{ borderRadius: '12px' }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const CustomerDetailSkeleton = () => {
    return (
        <div className={detailStyles.container}>
            <header className={detailStyles.header}>
                <div className={detailStyles.headerTop}>
                    <Skeleton width="32px" height="32px" type="circle" />
                    <div className={detailStyles.nameSection} style={{ flex: 1, marginLeft: '12px' }}>
                        <Skeleton width="60%" height="24px" style={{ marginBottom: '4px' }} />
                        <Skeleton width="40%" height="14px" />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Skeleton width="32px" height="32px" type="rect" />
                        <Skeleton width="32px" height="32px" type="rect" />
                    </div>
                </div>
                <div className={detailStyles.mainActions} style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <Skeleton width="130px" height="38px" type="rect" style={{ borderRadius: 'var(--radius-md)' }} />
                    <Skeleton width="130px" height="38px" type="rect" style={{ borderRadius: 'var(--radius-md)' }} />
                    <Skeleton width="90px" height="38px" type="rect" style={{ borderRadius: 'var(--radius-md)' }} />
                </div>
            </header>

            <div className={detailStyles.balanceCard}>
                <div className={detailStyles.balanceMain}>
                    <Skeleton width="100px" height="14px" style={{ marginBottom: '8px' }} />
                    <Skeleton width="180px" height="40px" />
                </div>
                <div className={detailStyles.balanceStats}>
                    <div className={detailStyles.statItem}>
                        <Skeleton width="60px" height="12px" style={{ marginBottom: '4px' }} />
                        <Skeleton width="80px" height="18px" />
                    </div>
                    <div className={detailStyles.statItem}>
                        <Skeleton width="60px" height="12px" style={{ marginBottom: '4px' }} />
                        <Skeleton width="80px" height="18px" />
                    </div>
                </div>
            </div>

            <div className={detailStyles.transactionsList}>
                <Skeleton width="120px" height="20px" style={{ marginBottom: '16px', marginLeft: '1rem' }} />
                {[1, 2, 3].map((i) => (
                    <div key={i} className={detailStyles.txnCard} style={{ margin: '0 1rem 0.8rem', pointerEvents: 'none' }}>
                        <div className={detailStyles.txnInfo}>
                            <Skeleton width="150px" height="16px" style={{ marginBottom: '8px' }} />
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <Skeleton width="60px" height="14px" type="rect" />
                                <Skeleton width="80px" height="14px" type="rect" />
                            </div>
                        </div>
                        <Skeleton width="90px" height="20px" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export const InsightsSkeleton = () => {
    return (
        <div className={insightsStyles.container}>
            <div className={insightsStyles.overviewCard}>
                <Skeleton width="120px" height="16px" style={{ margin: '0 auto 12px' }} />
                <Skeleton width="200px" height="48px" style={{ margin: '0 auto 8px' }} />
                <Skeleton width="150px" height="14px" style={{ margin: '0 auto' }} />
            </div>

            <div className={insightsStyles.grid}>
                {[1, 2].map((i) => (
                    <div key={i} className={insightsStyles.card}>
                        <div className={insightsStyles.cardHeader} style={{ marginBottom: '12px' }}>
                            <Skeleton width="24px" height="24px" type="circle" />
                            <Skeleton width="120px" height="18px" style={{ marginLeft: '8px' }} />
                        </div>
                        <Skeleton width="150px" height="32px" style={{ marginBottom: '16px' }} />
                        <div className={insightsStyles.list}>
                            {[1, 2, 3].map((j) => (
                                <div key={j} className={insightsStyles.listItem}>
                                    <Skeleton width="100px" height="14px" />
                                    <Skeleton width="80px" height="14px" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

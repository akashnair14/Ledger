'use client';

import React from 'react';
import { Skeleton } from './Skeleton';
import dashboardStyles from '@/app/dashboard/page.module.css';
import detailStyles from '@/app/customers/[id]/CustomerDetail.module.css';
import insightsStyles from '@/components/dashboard/InsightsView.module.css';

export const DashboardSkeleton = () => {
    return (
        <>
            <div className={dashboardStyles.totalSummary}>
                <div className={dashboardStyles.summaryInfo}>
                    <Skeleton width="100px" height="14px" style={{ marginBottom: '8px' }} />
                    <Skeleton width="150px" height="32px" />
                </div>
            </div>
            <div className={dashboardStyles.searchBar}>
                <Skeleton width="100%" height="48px" type="rect" />
            </div>
            <div className={dashboardStyles.list}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className={dashboardStyles.cardContainer} style={{ padding: '4px 0' }}>
                        <div className={dashboardStyles.customerCard} style={{ pointerEvents: 'none' }}>
                            <div className={dashboardStyles.info}>
                                <Skeleton width="140px" height="18px" style={{ marginBottom: '8px' }} />
                                <Skeleton width="100px" height="14px" />
                            </div>
                            <div className={dashboardStyles.balanceContainer}>
                                <Skeleton width="80px" height="24px" type="rect" />
                                <Skeleton width="18px" height="18px" type="circle" style={{ marginLeft: '8px' }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </>
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

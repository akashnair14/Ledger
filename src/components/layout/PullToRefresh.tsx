'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PullToRefreshProps {
    children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ children }) => {
    const router = useRouter();
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const touchStateRef = useRef({ startY: 0, distance: 0, refreshing: false });
    const threshold = 80; // px to pull to trigger refresh

    const handleRefresh = useCallback(async () => {
        // Haptic feedback
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(20);
        }

        // Refresh data
        router.refresh();

        // Wait a bit to show the animation
        setTimeout(() => {
            setIsRefreshing(false);
            setPullDistance(0);
            touchStateRef.current.distance = 0;
            touchStateRef.current.refreshing = false;
        }, 1000);
    }, [router]);

    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            if (window.scrollY <= 0 && !touchStateRef.current.refreshing) {
                touchStateRef.current.startY = e.touches[0].clientY;
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            const { startY, refreshing } = touchStateRef.current;
            if (startY === 0 || window.scrollY > 0 || refreshing) return;

            const currentY = e.touches[0].clientY;
            const diff = currentY - startY;

            if (diff > 0) {
                const distance = Math.min(diff * 0.5, 120);
                touchStateRef.current.distance = distance;
                setPullDistance(distance);
            }
        };

        const handleTouchEnd = () => {
            const { distance, refreshing } = touchStateRef.current;
            if (!refreshing) {
                if (distance > threshold) {
                    touchStateRef.current.refreshing = true;
                    setIsRefreshing(true);
                    handleRefresh();
                } else {
                    setPullDistance(0);
                    touchStateRef.current.distance = 0;
                }
            }
            touchStateRef.current.startY = 0;
        };

        const wrapper = wrapperRef.current;
        if (wrapper) {
            wrapper.addEventListener('touchstart', handleTouchStart, { passive: true });
            wrapper.addEventListener('touchmove', handleTouchMove, { passive: true });
            wrapper.addEventListener('touchend', handleTouchEnd, { passive: true });
        }

        return () => {
            if (wrapper) {
                wrapper.removeEventListener('touchstart', handleTouchStart);
                wrapper.removeEventListener('touchmove', handleTouchMove);
                wrapper.removeEventListener('touchend', handleTouchEnd);
            }
        };
    }, [handleRefresh]);

    return (
        <div ref={wrapperRef} style={{ minHeight: '100%' }}>
            {/* Refresh Indicator */}
            <div
                style={{
                    height: pullDistance > 0 || isRefreshing ? 60 : 0,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: isRefreshing ? 'height 0.2s' : 'none',
                    opacity: Math.min(pullDistance / threshold, 1)
                }}
            >
                <div style={{
                    transform: `rotate(${pullDistance * 2}deg)`,
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <RefreshCw size={24} className={isRefreshing ? 'spin' : ''} />
                </div>
            </div>

            {/* Content */}
            <div style={{
                transform: (isRefreshing || pullDistance > 0) ? `translateY(${isRefreshing ? 60 : pullDistance}px)` : 'none',
                transition: isRefreshing ? 'transform 0.2s' : 'none'
            }}>
                {children}
            </div>

            <style jsx global>{`
                .spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

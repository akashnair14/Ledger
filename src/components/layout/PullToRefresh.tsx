'use client';

import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PullToRefreshProps {
    children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ children }) => {
    const router = useRouter();
    const [startY, setStartY] = useState(0);
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const threshold = 80; // px to pull to trigger refresh

    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            // Only enable pull if at the top of the page
            if (window.scrollY === 0) {
                setStartY(e.touches[0].clientY);
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (startY === 0 || window.scrollY > 0) return;

            const currentY = e.touches[0].clientY;
            const diff = currentY - startY;

            if (diff > 0) {
                // Resistance effect
                setPullDistance(Math.min(diff * 0.5, 120));
                // Prevent default scrolling if pulling down at top
                if (e.cancelable && diff < 200) {
                    // Be careful with preventDefault, it blocks scrolling completely sometimes
                    // We only want to block if we are definitely pulling to refresh
                }
            }
        };

        const handleTouchEnd = () => {
            if (pullDistance > threshold) {
                setIsRefreshing(true);
                handleRefresh();
            } else {
                setPullDistance(0);
            }
            setStartY(0);
        };

        const wrapper = wrapperRef.current;
        if (wrapper) {
            wrapper.addEventListener('touchstart', handleTouchStart);
            wrapper.addEventListener('touchmove', handleTouchMove);
            wrapper.addEventListener('touchend', handleTouchEnd);
        }

        return () => {
            if (wrapper) {
                wrapper.removeEventListener('touchstart', handleTouchStart);
                wrapper.removeEventListener('touchmove', handleTouchMove);
                wrapper.removeEventListener('touchend', handleTouchEnd);
            }
        };
    }, [startY, pullDistance]);

    const handleRefresh = async () => {
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
        }, 1000);
    };

    return (
        <div ref={wrapperRef} style={{ minHeight: '100vh' }}>
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

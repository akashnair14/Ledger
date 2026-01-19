'use client';

import { useCallback } from 'react';

export const useHaptic = () => {
    const vibrate = useCallback((pattern: number | number[] = 10) => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
                navigator.vibrate(pattern);
            } catch (e) {
                // Ignore errors on non-supported devices
            }
        }
    }, []);

    const triggerSuccess = useCallback(() => {
        vibrate([10, 30, 10]);
    }, [vibrate]);

    const triggerError = useCallback(() => {
        vibrate([50, 30, 50, 30, 50]);
    }, [vibrate]);

    return { vibrate, triggerSuccess, triggerError };
};

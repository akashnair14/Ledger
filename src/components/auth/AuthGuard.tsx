'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const isPublic = pathname === '/' || pathname === '/login' || pathname === '/forgot-password' || pathname === '/reset-password' || pathname?.startsWith('/auth') || pathname?.startsWith('/docs');

    useEffect(() => {
        let mounted = true;

        const checkAuth = async () => {
            if (isPublic) {
                if (mounted) {
                    setIsLoading(false);
                }
                return;
            }

            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                if (mounted) {
                    setIsAuthenticated(true);
                    setIsLoading(false);
                }
            } else {
                if (mounted) {
                    setIsAuthenticated(false);
                    setIsLoading(false);
                    // Use replace to avoid filling history with protected routes
                    router.replace('/login');
                }
            }
        };

        // Reset state on path change if it's protected
        if (!isPublic) {
            setIsLoading(true);
        }

        checkAuth();

        return () => {
            mounted = false;
        };
    }, [pathname, isPublic, router]);

    if (isPublic) {
        return <>{children}</>;
    }

    if (isLoading) {
        return (
            <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)' }}>
                <Loader2 className="spin" size={32} color="var(--primary)" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return <>{children}</>;
}

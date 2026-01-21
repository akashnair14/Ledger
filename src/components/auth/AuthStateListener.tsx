'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AuthChangeEvent, Session } from '@supabase/supabase-js'

export function AuthStateListener() {
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
            if (event === 'SIGNED_IN') {
                router.refresh()
            } else if (event === 'SIGNED_OUT') {
                // Exhaustive cleanup on detection of signout
                localStorage.clear();
                sessionStorage.clear();

                // Use window.location for a hard reset to clear all in-memory state
                window.location.href = '/login';
            }
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [router, supabase])

    return null
}

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function AuthStateListener() {
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                router.refresh()
            } else if (event === 'SIGNED_OUT') {
                router.refresh()
                router.replace('/login')
            }
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [router, supabase])

    return null
}

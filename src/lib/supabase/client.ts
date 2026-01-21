
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                persistSession: true, // Backup: Save to LocalStorage (PWA friendly)
                autoRefreshToken: true,
                detectSessionInUrl: true,
                storageKey: 'sb-auth-token', // Explicit key for LocalStorage
            },
            // Primary: Save to Cookies (Middleware friendly)
            cookieOptions: {
                path: '/',
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
            }
        }
    )
}

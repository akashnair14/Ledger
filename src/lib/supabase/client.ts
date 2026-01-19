
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                persistSession: true, // Stores session in localStorage
                autoRefreshToken: true, // Automatically refreshes the token
                detectSessionInUrl: true, // Detects session for OAuth/Magic Link
            }
        }
    )
}

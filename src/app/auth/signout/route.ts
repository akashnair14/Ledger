
import { createClient } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url)
    const supabase = await createClient()

    // Sign out on the server (clears cookies)
    await supabase.auth.signOut()

    // Redirect to login
    return NextResponse.redirect(`${requestUrl.origin}/login`)
}

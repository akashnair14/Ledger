
import { createClient } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url)
    const supabase = await createClient()

    // Sign out on the server (clears cookies via library)
    await supabase.auth.signOut()

    const response = NextResponse.redirect(`${requestUrl.origin}/login`)

    // MANUALLY CLEAR ALL KNOWN AUTH COOKIES for maximum reliability
    // Supabase usually uses sb-access-token, sb-refresh-token, or sb-[project-id]-auth-token
    const cookieNames = request.cookies.getAll().map(c => c.name)
    const authCookies = cookieNames.filter(name =>
        name.includes('auth-token') ||
        name.includes('access-token') ||
        name.includes('refresh-token') ||
        name.startsWith('sb-')
    )

    authCookies.forEach(name => {
        response.cookies.set(name, '', {
            path: '/',
            maxAge: 0,
            expires: new Date(0),
        })
    })

    return response
}

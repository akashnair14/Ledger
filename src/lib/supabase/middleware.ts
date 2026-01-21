
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateSession(request: NextRequest, _options?: any) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // 1. Create client
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value)
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, options)
                    })
                },
            },
        }
    )

    // 2. Pre-check for cookies to avoid hanging getUser calls if no session exists
    const hasAuthCookies = request.cookies.getAll().some(c => c.name.includes('auth-token') || c.name.startsWith('sb-'));

    // 3. Get User (only if cookies are present)
    let user = null;
    if (hasAuthCookies) {
        try {
            const { data: { user: foundUser }, error } = await supabase.auth.getUser()
            if (error) {
                console.error('[Middleware] getUser error:', error.message)
            }
            user = foundUser;
        } catch (err) {
            console.error('[Middleware] Critical auth failure:', err)
        }
    }

    // 4. Protected Routes Logic
    const protectedRoutes = ['/dashboard', '/analytics', '/transactions', '/settings', '/customers'];
    const isProtectedRoute = protectedRoutes.some(path => request.nextUrl.pathname.startsWith(path));

    if (!user && isProtectedRoute) {
        console.log('[Middleware] Unauthorized access to:', request.nextUrl.pathname, '- Redirecting to /login')
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        const redirectResponse = NextResponse.redirect(url)
        // Copy cookies from the primary response (which contains signOut/refresh deletions) to the redirect
        response.cookies.getAll().forEach(cookie => {
            const { name, value, ...options } = cookie
            redirectResponse.cookies.set(name, value, options)
        })
        return redirectResponse
    }

    // 5. Auth Route Logic
    if (user && (request.nextUrl.pathname === '/' || request.nextUrl.pathname.startsWith('/login'))) {
        console.log('[Middleware] Authenticated user on auth page - Redirecting to /dashboard')
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        const redirectResponse = NextResponse.redirect(url)
        // Copy cookies
        response.cookies.getAll().forEach(cookie => {
            const { name, value, ...options } = cookie
            redirectResponse.cookies.set(name, value, options)
        })
        return redirectResponse
    }

    return response
}

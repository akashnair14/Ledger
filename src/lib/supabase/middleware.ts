
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
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

                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // 2. Get User
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // 3. Protected Routes Logic
    // Routes that require authentication
    const protectedRoutes = ['/dashboard', '/analytics', '/transactions', '/settings', '/customers'];
    const isProtectedRoute = protectedRoutes.some(path => request.nextUrl.pathname.startsWith(path));

    if (!user && isProtectedRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // 4. Auth Route Logic
    // If user IS signed in and attempts to go to /login OR / (landing page), redirect to /dashboard
    if (user && (request.nextUrl.pathname === '/' || request.nextUrl.pathname.startsWith('/login'))) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    return response
}
